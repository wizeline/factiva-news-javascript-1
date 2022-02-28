import { join } from 'path';
import { core, helper } from '@factiva/core';
import { writeFile } from 'fs';
import { BigQuery } from '@google-cloud/bigquery';
import { formatMessageToResponseSchema } from './bq_schemas';
import { MongoClient } from 'mongodb';

const { constants } = core;
class ListenerTools {
  constructor() {
    this.tableId = null;
    this.dataSet = null;
    this.counter = 0;
    this.bqClient = null;
    this.logLine = '';
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
    const outFilepath = join(constants.FILES_DEFAULT_FOLDER, outFilename);
    const newLine = `${JSON.stringify(message)}\n`;
    await writeFile(outFilepath, newLine, { flag: 'a+' }, (err) => {
      if (err) {
        throw err;
      }
    });
  }

  /**
   * Listener to save response into a jsonl
   * @param {string} message - Message to be stored
   * @param {string} subscriptionId - Suscription id from response
   * @returns {boolean} Status from the process
   */
  async saveJsonlFile(message, subscriptionId) {
    const errorFile = join(constants.FILES_DEFAULT_FOLDER, 'errors.log');
    let errorMessage = '';
    const subscriptionIdParsed = subscriptionId.split('-');
    const streamShortId = subscriptionIdParsed[subscriptionIdParsed.length - 3];
    const currentHour = helper.getCurrentDate();

    process.stdout.write('\n[ACTIVITY] Receiving messages (SYNC)...\n[0]');
    helper.createPathIfNotExist(constants.FILES_DEFAULT_FOLDER);

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
        await writeFile(errorFile, errorMessage, { flag: 'a+' }, (err) => {
          if (err) {
            throw err;
          }
        });
      }
      this.counter += 1;
      if (this.counter % 100 == 0) {
        process.stdout.write(`\n[${this.counter}]`);
      }
    } else {
      this.logLine += constants.ACTION_CONSOLE_INDICATOR[constants.ERR_ACTION];
      errorMessage = `${Date.now()}\tERR\tInvalidMessage\t${JSON.stringify(
        message,
      )}\n`;
      await writeFile(errorFile, errorMessage, { flag: 'a+' }, (err) => {
        if (err) {
          throw err;
        }
      });
      return false;
    }
    console.log(this.logLine);
    return true;
  }

  /**
   * Check big query table vars
   */
  verifyBigQueryTable() {
    this.tableId = helper.loadEnvVariable('BqTable');
    this.dataSet = helper.loadEnvVariable('BqDataset');
    if (!this.tableId) {
      throw ReferenceError('Env variable StreamLogBQ not set');
    }
  }

  /**
   * Listener to save response into a Big query table
   * @param {string} message - Message to be stored
   * @param {string} subscriptionId - Suscription id from response
   * @returns {boolean} Status from the process
   */
  async saveOnBigQueryTable(message, subscriptionId) {
    let retVal = false;
    let msgAn = '';
    this.verifyBigQueryTable();
    this.bqClient = new BigQuery();
    process.stdout.write('\n[DB] Receiving messages (SYNC)...\n[0]');
    helper.createPathIfNotExist(constants.FILES_DEFAULT_FOLDER);

    try {
      if (Object.keys(message).includes('action')) {
        msgAn = message['an'];
        let formatMessage = helper.formatTimestamps(message);
        formatMessage = helper.formatMultivalues(formatMessage);
        formatMessage = formatMessageToResponseSchema(formatMessage);
        await this.bqClient
          .dataset(this.dataSet)
          .table(this.tableId)
          .insert([formatMessage]);
        retVal = true;
        const currentAction = message['action'];
        if (constants.ALLOWED_ACTIONS.includes(currentAction)) {
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
        process.stdout.write(
          constants.ACTION_CONSOLE_INDICATOR[constants.ERR_ACTION],
        );
      }
    } catch (e) {
      this.counter += 1;
      this.logLine = '#';
      const logPath = constants.FILES_DEFAULT_FOLDER;
      const fileName =
        msgAn !== ''
          ? join(logPath, `${msgAn}.json`)
          : join(logPath, `${Date.now() / 1000}.json`);
      await writeFile(
        fileName,
        JSON.stringify(message),
        { flag: 'a+' },
        (err) => {
          if (err) {
            throw err;
          }
        },
      );
    }
    console.log(this.logLine);
    return retVal;
  }

  /**
   * Listener to save response into mongoDB
   * @param {string} message - Message to be stored
   * @param {string} subscriptionId - Suscription id from response
   * @returns {boolean} Status from the process
   */
  async saveOnMongoDB(message, subscriptionId) {
    process.stdout.write('\n[ACTIVITY] Receiving messages (SYNC)...\n[0]');
    helper.createPathIfNotExist(constants.FILES_DEFAULT_FOLDER);
    const uri = helper.loadEnvVariable('mongodbURI');
    const databaseName = helper.loadEnvVariable('mongodbDatabaseName');
    const collectionName = helper.loadEnvVariable('mongodbCollectionName');

    const client = new MongoClient(uri);
    try {
      await client.connect();
      const database = client.db(databaseName);
      const collection = database.collection(collectionName);

      process.stdout.write('\n[ACTIVITY] Receiving messages (SYNC)...\n[0]');
      helper.createPathIfNotExist(constants.FILES_DEFAULT_FOLDER);

      if (Object.keys(message).includes('action')) {
        let formatMessage = helper.formatTimestamps(message);
        formatMessage = helper.formatMultivalues(formatMessage);
        const currentAction = formatMessage['action'];

        if (constants.ALLOWED_ACTIONS.includes(currentAction)) {
          this.logLine += constants.ACTION_CONSOLE_INDICATOR[currentAction];
          await collection.insertOne(formatMessage);
        } else {
          this.logLine +=
            constants.ACTION_CONSOLE_INDICATOR[constants.ERR_ACTION];
          errorMessage = `${Date.now()}\tERR\tInvalidAction\t${JSON.stringify(
            formatMessage,
          )}\n`;
          await writeFile(errorFile, errorMessage, { flag: 'a+' }, (err) => {
            if (err) {
              throw err;
            }
          });
        }
        this.counter += 1;
        if (this.counter % 100 == 0) {
          process.stdout.write(`\n[${this.counter}]`);
        }
      } else {
        this.logLine +=
          constants.ACTION_CONSOLE_INDICATOR[constants.ERR_ACTION];
        errorMessage = `${Date.now()}\tERR\tInvalidMessage\t${JSON.stringify(
          message,
        )}\n`;
        await writeFile(errorFile, errorMessage, { flag: 'a+' }, (err) => {
          if (err) {
            throw err;
          }
        });
        return false;
      }
    } catch (err) {
      await writeFile(errorFile, err, { flag: 'a+' }, (err) => {
        if (err) {
          throw err;
        }
      });
    } finally {
      await client.close();
      console.log(this.logLine);
    }
    return true;
  }
}

module.exports = ListenerTools;
