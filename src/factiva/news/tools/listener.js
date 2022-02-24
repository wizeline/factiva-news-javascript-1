import { join } from 'path';
import { core, helper } from '@factiva/core';
import { writeFile, existsSync, readFile } from 'fs';
const { constants } = core;

class ListenerTools {
  static async writeJsonlLine(filePrefix, action, fileSuffix, message) {
    const outFilename = `${filePrefix}_${action}_${fileSuffix}.jsonl`;
    const outFilepath = join(constants.FILES_DEFAULT_FOLDER, outFilename);
    const newLine = `${JSON.stringify(message)}\n`;
    await writeFile(outFilepath, newLine, { flag: 'a+' }, (err) => {
      if (err) {
        throw err;
      }
    });
  }

  static async saveJsonlFile(message, subscriptionId) {
    const errorFile = join(constants.FILES_DEFAULT_FOLDER, 'errors.log');
    let errorMessage = '';
    let counter = 0;
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
        process.stdout.write(
          `${constants.ACTION_CONSOLE_INDICATOR[currentAction]}`,
        );
        await ListenerTools.writeJsonlLine(
          streamShortId,
          currentAction,
          currentHour,
          formatMessage,
        );
      } else {
        process.stdout.write(
          `${constants.ACTION_CONSOLE_INDICATOR[constants.ERR_ACTION]}`,
        );
        errorMessage = `${Date.now()}\tERR\tInvalidAction\t${JSON.stringify(
          formatMessage,
        )}\n`;
        await writeFile(errorFile, errorMessage, { flag: 'a+' }, (err) => {
          if (err) {
            throw err;
          }
        });
      }
      counter += 1;
      if (counter % 100 == 0) {
        process.stdout.write(`\n[${counter}]`);
      }
    } else {
      process.stdout.write(
        `${constants.ACTION_CONSOLE_INDICATOR[constants.ERR_ACTION]}`,
      );
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
    return true;
  }
}

module.exports = ListenerTools;
