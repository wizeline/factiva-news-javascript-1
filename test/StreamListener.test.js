const chai = require('chai');
const { expect } = chai;
const { Stream } = require('../lib/factiva/news/stream');
const { helper, core } = require('@factiva/core');
const {
  MongoDBHandler,
  JSONLFileHandler,
  BigQueryHandler,
} = require('../lib/factiva/news/tools');
const fs = require('fs');
const { constants } = core;

const VALID_STREAM_ID = helper.loadEnvVariable('StreamId');
const VALID_SUBSCRIPTION_ID = helper.loadEnvVariable('SubscriptionId');

describe('Factiva News - ', () => {
  before(() => {
    helper.createPathIfNotExist(constants.LISTENER_FILES_DEFAULT_FOLDER);
  });

  after(() => {
    fs.rmdirSync(constants.LISTENER_FILES_DEFAULT_FOLDER, { recursive: true });
  });

  describe('Stream Listener Module - ', () => {
    it('should get stream listener by index', async () => {
      const stream = new Stream({ streamId: VALID_STREAM_ID });
      await stream.setAllSubscriptions();
      const subscription = stream.getSubscriptionByIndex(0);
      expect(subscription).to.be.a('object');
    });

    it('should fail at get stream listener by index', async () => {
      const stream = new Stream({ streamId: VALID_STREAM_ID });
      await stream.setAllSubscriptions();
      try {
        stream.getSubscriptionByIndex(10);
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should get stream listener by id', async () => {
      const stream = new Stream({ streamId: VALID_STREAM_ID });
      await stream.setAllSubscriptions();
      const subscription = stream.getSubscriptionById(VALID_SUBSCRIPTION_ID);
      expect(subscription).to.be.a('object');
    });

    it('should fail get stream listener by id', async () => {
      const stream = new Stream({ streamId: VALID_STREAM_ID });
      await stream.setAllSubscriptions();
      try {
        stream.getSubscriptionById('DUMMY_ID');
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

/*     it('should listen a subscription- jsonl file', async () => {
      const stream = new Stream({ streamId: VALID_STREAM_ID });
      const jsonlHandler = new JSONLFileHandler();
      await stream.setAllSubscriptions();

      const subscription = stream.getSubscriptionByIndex(0);
      await subscription.listener.listen({
        callback: jsonlHandler.save.bind(jsonlHandler),
        maximumMessages: 10,
      });
      expect(fs.existsSync(constants.LISTENER_FILES_DEFAULT_FOLDER)).to.be.true;
    }).timeout(0);

    it('should listen a subscription- bigquery', async () => {
      const stream = new Stream({ streamId: VALID_STREAM_ID });
      const bigQueryHandler = new BigQueryHandler();
      await stream.setAllSubscriptions();

      const subscription = stream.getSubscriptionByIndex(0);
      await subscription.listener.listen({
        callback: bigQueryHandler.save.bind(bigQueryHandler),
        maximumMessages: 10,
      });
      expect(fs.existsSync(constants.LISTENER_FILES_DEFAULT_FOLDER)).to.be.true;
    }).timeout(0);

    it('should listen a subscription- mongodb', async () => {
      const stream = new Stream({ streamId: VALID_STREAM_ID });
      const mongoDBHandler = new MongoDBHandler();
      await stream.setAllSubscriptions();

      const subscription = stream.getSubscriptionByIndex(0);
      await subscription.listener.listen({
        callback: mongoDBHandler.save.bind(mongoDBHandler),
        maximumMessages: 10,
      });
      expect(fs.existsSync(constants.LISTENER_FILES_DEFAULT_FOLDER)).to.be.true;
    }).timeout(0); */
  });
});
