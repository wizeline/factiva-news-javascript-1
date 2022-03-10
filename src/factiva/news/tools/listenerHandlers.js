import { join } from 'path';
import { core, helper } from '@factiva/core';
import { writeFile } from 'fs';
import { BigQuery } from '@google-cloud/bigquery';
import { formatMessageToResponseSchema } from './bq_schemas';
import { MongoClient } from 'mongodb';
const { constants, FactivaLogger } = core;
const {
  LOGGER_LEVELS: { INFO, ERROR, WARN },
} = constants;

const writeDefaultFile = async (outFilepath, newLine) => {
  await writeFile(outFilepath, newLine, { flag: 'a+' }, (err) => {
    if (err) {
      throw err;
    }
  });
};

/**
 * Listener Handler to save stream messages into a jsonl file.
 */
class JSONLFileHandler {
  constructor() {
    this.counter = 0;
    this.logger = new FactivaLogger('/listenerHandlers.js');
  }

  /**
   * Write a new Jsonl line
   * @param {string} filePrefix - File prefix
   * @param {string} action - Action from the stream response
   * @param {string} fileSuffix - File suffix
   * @param {string} message - Message to be write on the file
   */
  async writeJsonlLine(filePrefix, action, fileSuffix, message) {
    const outFilename = `${filePrefix}_${action}_${fileSuffix}.jsonl`;
    const outFilepath = join(
      constants.LISTENER_FILES_DEFAULT_FOLDER,
      outFilename,
    );
    const newLine = `${JSON.stringify(message)}\n`;
    await writeDefaultFile(outFilepath, newLine);
  }

  /**
   * Listener to save response into a jsonl
   * @param {string} message - Message to be stored
   * @param {string} subscriptionId - Suscription id from response
   * @returns {boolean} Status from the process
   */
  async save(message, subscriptionId) {
    const errorFile = join(
      constants.LISTENER_FILES_DEFAULT_FOLDER,
      'errors.log',
    );
    let errorMessage = '';
    const subscriptionIdParsed = subscriptionId.split('-');
    const streamShortId = subscriptionIdParsed[subscriptionIdParsed.length - 3];
    const currentHour = helper.getCurrentDate();

    this.logger.log(INFO, 'Saving into JSONL file');
    helper.createPathIfNotExist(constants.LISTENER_FILES_DEFAULT_FOLDER);

    if (Object.keys(message).includes('action')) {
      let formatMessage = helper.formatTimestamps(message);
      formatMessage = helper.formatMultivalues(formatMessage);
      const currentAction = formatMessage['action'];

      if (constants.ALLOWED_ACTIONS.includes(currentAction)) {
        this.logLine += constants.ACTION_CONSOLE_INDICATOR[currentAction];
        await this.writeJsonlLine(
          streamShortId,
          currentAction,
          currentHour,
          formatMessage,
        );
      } else {
        this.logLine +=
          constants.ACTION_CONSOLE_INDICATOR[constants.ERR_ACTION];
        errorMessage = `${Date.now()}\tERR\tInvalidAction\t${JSON.stringify(
          formatMessage,
        )}\n`;
        await writeDefaultFile(errorFile, errorMessage);
      }
      this.counter += 1;
      if (this.counter % 100 == 0) {
        console.log(`[${this.counter}]`);
      }
    } else {
      this.logLine += constants.ACTION_CONSOLE_INDICATOR[constants.ERR_ACTION];
      errorMessage = `${Date.now()}\tERR\tInvalidMessage\t${JSON.stringify(
        message,
      )}\n`;
      await writeDefaultFile(errorFile, errorMessage);
      return false;
    }
    console.log(this.logLine);
    return true;
  }
}

/**
 * Listener Handler to save stream messages into a bigquery
 */
class BigQueryHandler {
  constructor() {
    this.logger = new FactivaLogger('/listenerHandlers.js');
    this.logLine = '';
    this.counter = 0;
    this.tableId = helper.loadEnvVariable('BqTable');
    this.dataSet = helper.loadEnvVariable('BqDataset');
    if (!this.tableId) {
      this.logger(ERROR, 'Env variable BqTable not set');
      throw ReferenceError('Env variable BqTable not set');
    }
    this.client = new BigQuery();
  }
  /**
   * Listener to save response into a Big query table
   * @param {string} message - Message to be stored
   * @param {string} subscriptionId - Suscription id from response
   * @returns {boolean} Status from the process
   */
  async save(message, subscriptionId) {
    let retVal = false;
    let msgAn = '';
    this.logger.log(INFO, 'Saving into BigQuery table');
    helper.createPathIfNotExist(constants.LISTENER_FILES_DEFAULT_FOLDER);
    try {
      if (Object.keys(message).includes('action')) {
        msgAn = message['an'];
        let formatMessage = helper.formatTimestamps(message);
        const currentAction = message['action'];
        if (constants.ALLOWED_ACTIONS.includes(currentAction)) {
          formatMessage = helper.formatMultivalues(formatMessage);
          formatMessage = formatMessageToResponseSchema(formatMessage);
          await this.client
            .dataset(this.dataSet)
            .table(this.tableId)
            .insert([formatMessage]);
          retVal = true;
          this.logLine += constants.ACTION_CONSOLE_INDICATOR[currentAction];
        } else {
          this.logLine +=
            constants.ACTION_CONSOLE_INDICATOR[constants.ERR_ACTION];
        }
        this.counter += 1;
        if (this.counter % 100 == 0) {
          this.logLine = '';
        }
      } else {
        this.logger.log(
          ERROR,
          constants.ACTION_CONSOLE_INDICATOR[constants.ERR_ACTION],
        );
      }
    } catch (e) {
      this.logger.log('ERROR', e);
      this.counter += 1;
      this.logLine = '#';
      const logPath = constants.LISTENER_FILES_DEFAULT_FOLDER;
      const fileName =
        msgAn !== ''
          ? join(logPath, `${msgAn}.json`)
          : join(logPath, `${Date.now() / 1000}.json`);
      await writeDefaultFile(fileName, JSON.stringify(message));
    }
    console.log(this.logLine);
    return retVal;
  }
}

/**
 * Listener Handler to save stream messages into a mongodb
 */
class MongoDBHandler {
  constructor() {
    this.tableId = null;
    this.dataSet = null;
    this.counter = 0;
    this.bqClient = null;
    this.logLine = '';
    this.logger = new FactivaLogger('/listenerHandlers.js');

    const uri = helper.loadEnvVariable('mongodbURI');
    this.databaseName = helper.loadEnvVariable('mongodbDatabaseName');
    this.collectionName = helper.loadEnvVariable('mongodbCollectionName');
    this.client = new MongoClient(uri);
  }

  /**
   * Listener to save response into mongoDB
   * @param {string} message - Message to be stored
   * @param {string} subscriptionId - Suscription id from response
   * @returns {boolean} Status from the process
   */
  async save(message, subscriptionId) {
    let retVal = false;
    this.logger.log(INFO, 'Saving into MongoDB');
    helper.createPathIfNotExist(constants.LISTENER_FILES_DEFAULT_FOLDER);
    const errorFile = join(
      constants.LISTENER_FILES_DEFAULT_FOLDER,
      'errors.log',
    );
    try {
      await this.client.connect();
      const database = this.client.db(this.databaseName);
      const collection = database.collection(this.collectionName);

      helper.createPathIfNotExist(constants.LISTENER_FILES_DEFAULT_FOLDER);

      if (Object.keys(message).includes('action')) {
        let formatMessage = helper.formatTimestampsMongoDB(message);
        formatMessage = helper.formatMultivalues(formatMessage);
        const currentAction = formatMessage['action'];

        if (constants.ALLOWED_ACTIONS.includes(currentAction)) {
          this.logLine += constants.ACTION_CONSOLE_INDICATOR[currentAction];
          await collection.insertOne(formatMessage);
          retVal = true;
        } else {
          this.logLine +=
            constants.ACTION_CONSOLE_INDICATOR[constants.ERR_ACTION];
          errorMessage = `${Date.now()}\tERR\tInvalidAction\t${JSON.stringify(
            formatMessage,
          )}\n`;
          await writeDefaultFile(errorFile, errorMessage);
        }
        this.counter += 1;
        if (this.counter % 100 == 0) {
          this.logger.log(INFO, `[${this.counter}]`);
        }
      } else {
        this.logLine +=
          constants.ACTION_CONSOLE_INDICATOR[constants.ERR_ACTION];
        errorMessage = `${Date.now()}\tERROR\tInvalidMessage\t${JSON.stringify(
          message,
        )}\n`;
        await writeDefaultFile(errorFile, errorMessage);
        return retVal;
      }
    } catch (err) {
      await writeDefaultFile(errorFile, `${Date.now()}\tERROR\t${err}\n`);
    }
    console.log(this.logLine);
    return retVal;
  }

  async closeConnection() {
    await this.client.close();
  }
}

module.exports = { MongoDBHandler, JSONLFileHandler, BigQueryHandler };
