const chai = require('chai');
const { expect } = chai;
const fs = require('fs');
const path = require('path');
const { ListenerTools } = require('../lib/factiva/news/tools');
const { helper, core } = require('@factiva/core');
const { constants } = core;

const BASIC_ADD_MESSAGE = {
  an: 'DJDN000020220222ei2m003yf',
  action: 'add',
  source_code: 'DJDN',
  source_name: 'Dow Jones Institutional News',
};

BASIC_ERROR_MESSAGE = {
  an: 'DJDN000020220222ei2m003yf',
  action: 'dummy_action',
  source_code: 'loremIpsum',
  source_name: 'loremIpsum',
};

const BASIC_SUBSCRIPTION_ID = 'aaaa-bbbb-cccc-dddd-eeeee';

describe('Factiva News - ', () => {
  before(() => {
    helper.createPathIfNotExist(constants.LISTENER_FILES_DEFAULT_FOLDER);
  });

  after(() => {
    fs.rmdirSync(constants.LISTENER_FILES_DEFAULT_FOLDER, { recursive: true });
  });

  describe('Listener Tools module', () => {
    it('should write a line in a Jsonl file', async () => {
      const listenerTools = new ListenerTools();
      for (let i = 0; i < 5; i++) {
        await listenerTools.writeJsonlLine('demo', 'default', 'loremIpsum', {
          title: `Demo message ${i}`,
          author: 'factiva news',
          date: new Date(),
        });
        await helper.sleep(500);
      }
      expect(true).to.be.true;
    });
    it('should create and add new line into a Jsonl file', async () => {
      const listenerTools = new ListenerTools();
      const result = await listenerTools.saveJsonlFile(
        BASIC_ADD_MESSAGE,
        BASIC_SUBSCRIPTION_ID,
      );
      const split = BASIC_SUBSCRIPTION_ID.split('-');
      const streamShortId = split[split.length - 3];
      const fileResult = `${streamShortId}_add_${helper.getCurrentDate()}.jsonl`;
      const filePath = path.join(constants.LISTENER_FILES_DEFAULT_FOLDER, fileResult);
      expect(result).to.be.true;
      expect(fs.existsSync(filePath)).to.be.true;
    });

    it('should create a log file on error', async () => {
      const listenerTools = new ListenerTools();
      const result = await listenerTools.saveJsonlFile(
        BASIC_ERROR_MESSAGE,
        BASIC_SUBSCRIPTION_ID,
      );
      const filePath = path.join(constants.LISTENER_FILES_DEFAULT_FOLDER, 'errors.log');
      expect(result).to.be.true;
      expect(fs.existsSync(filePath)).to.be.true;
    });
  });
});
