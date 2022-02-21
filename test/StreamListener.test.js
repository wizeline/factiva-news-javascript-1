const chai = require('chai');
const { expect } = chai;
const { Stream } = require('../lib/factiva/news/stream');
const { helper } = require('@factiva/core');

const VALID_STREAM_ID = helper.loadEnvVariable('StreamId');
const VALID_SUBSCRIPTION_ID = helper.loadEnvVariable('SubscriptionId');
const VALID_WHERE_STATEMENT =
  "publication_datetime >= '2022-01-01 00:00:00' AND LOWER(language_code)='en' AND UPPER(source_code) = 'DJDN'";

const handleMessage = (message, id) => {
  console.log(`${id}--> ${message}`);
};

const sleep = async (time) =>
  await new Promise((resolve) => setTimeout(resolve, time));

describe('Factiva News - ', () => {
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
      const stream = new Stream({ query: VALID_WHERE_STATEMENT });
      const streamResponse = await stream.create();
      expect(streamResponse.id.length).to.be.greaterThan(0);

      const subscription = stream.getSubscriptionByIndex(0);
      await subscription.listener.listen(handleMessage, 10);

      await sleep(600000);
      const deleteSubscription = stream.deleteSubscription(subscription);
      expect(deleteSubscription).to.be.true;

      await sleep(15000);
      const deleteStream = stream.delete();
      expect(deleteStream).to.be.a('object');
    });
  });
});
