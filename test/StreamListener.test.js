const chai = require('chai');
const { expect } = chai;
const { Stream } = require('../lib/factiva/news/stream');
const { helper, core } = require('@factiva/core');
const { ListenerTools } = require('../lib/factiva/news/tools');
const fs = require('fs');
const { constants } = core;

const VALID_STREAM_ID = helper.loadEnvVariable('StreamId');
const VALID_SUBSCRIPTION_ID = helper.loadEnvVariable('SubscriptionId');
const VALID_WHERE_STATEMENT =
  "publication_datetime >= '2022-01-01 00:00:00' AND LOWER(language_code)='en' AND UPPER(source_code) = 'DJDN'";

describe('Factiva News - ', () => {
  before(() => {
    helper.createPathIfNotExist(constants.FILES_DEFAULT_FOLDER);
  });

  after(() => {
    fs.rmdirSync(constants.FILES_DEFAULT_FOLDER, { recursive: true });
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

    it('should listen a subscription', async () => {
      const stream = new Stream({ streamId: VALID_STREAM_ID });
      await stream.setAllSubscriptions();

      const subscription = stream.getSubscriptionByIndex(0);
      await subscription.listener.listen({
        callback: ListenerTools.saveJsonlFile,
        maximumMessages: 20,
      });
      expect(fs.existsSync(constants.FILES_DEFAULT_FOLDER)).to.be.true;
    }).timeout(0);
  });
});
