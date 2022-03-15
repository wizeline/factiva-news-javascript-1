/* eslint-disable no-undef */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

const { expect } = chai;

// eslint-disable-next-line
const { helper, core } = require('@factiva/core');
const { Stream } = require('../lib/factiva/news/stream');

const { StreamUser, StreamResponse } = core;

const VALID_USER_KEY = helper.loadEnvVariable('userKey');
const VALID_STREAM_ID = helper.loadEnvVariable('StreamId');
const VALID_SNAPSHOT_ID = helper.loadEnvVariable('SnapshotId');

// eslint-disable-next-line
const VALID_QUERY_STATEMENT =
  "publication_datetime >= '2021-04-01 00:00:00' AND LOWER(language_code)='en' AND UPPER(source_code) = 'DJDN'";

describe('Factiva News - ', () => {
  describe('Stream Module - ', () => {
    it('should create stream instance using environment credentials', () => {
      const stream = new Stream({ query: VALID_QUERY_STATEMENT });
      expect(stream.streamUser.key).to.equal(VALID_USER_KEY);
      expect(stream.query.getBaseQuery()).to.deep.equal({
        query: { where: VALID_QUERY_STATEMENT },
      });
    });

    it('should create stream instance using a StreamUser with env credentials', () => {
      const streamUser = new StreamUser();
      const stream = new Stream({ streamUser, query: VALID_QUERY_STATEMENT });
      expect(stream.streamUser.key).to.equal(VALID_USER_KEY);
      expect(stream.query.getBaseQuery()).to.deep.equal({
        query: { where: VALID_QUERY_STATEMENT },
      });
    });

    it('should create stream instance using a StreamUser', () => {
      const streamUser = new StreamUser(VALID_USER_KEY);
      const stream = new Stream({ streamUser, query: VALID_QUERY_STATEMENT });
      expect(stream.streamUser.key).to.equal(VALID_USER_KEY);
      expect(stream.query.getBaseQuery()).to.deep.equal({
        query: { where: VALID_QUERY_STATEMENT },
      });
    });

    it('should create stream instance using an api key', () => {
      const stream = new Stream({
        key: VALID_USER_KEY,
        query: VALID_QUERY_STATEMENT,
      });
      expect(stream.streamUser.key).to.equal(VALID_USER_KEY);
      expect(stream.query.getBaseQuery()).to.deep.equal({
        query: { where: VALID_QUERY_STATEMENT },
      });
    });

    it('should create a stream instance using a query', async () => {
      const stream = new Stream({
        query: VALID_QUERY_STATEMENT,
        key: VALID_USER_KEY,
      });

      expect(stream.create()).to.eventually.be.instanceOf(StreamResponse);
    });

    it('should create a stream instance using a snapshot id', async () => {
      const stream = new Stream({
        snapshotId: VALID_SNAPSHOT_ID,
        key: VALID_USER_KEY,
      });

      expect(stream.create()).to.eventually.be.instanceOf(StreamResponse);
    });

    it('should get info about query by its', async () => {
      const stream = new Stream({
        streamId: VALID_STREAM_ID,
        key: VALID_USER_KEY,
      });

      expect(stream.getInfo()).to.eventually.be.instanceOf(StreamResponse);
    });

    it('should get info about all streams', async () => {
      const stream = new Stream({
        streamId: VALID_STREAM_ID,
        key: VALID_USER_KEY,
      });

      const streams = await stream.getAllStreams();
      expect(Array.isArray(streams)).to.be.true;
    });

    it('should create and destroy subscription', async () => {
      const stream = new Stream({
        streamId: VALID_STREAM_ID,
        key: VALID_USER_KEY,
      });

      const subscriptionId = await stream.createSubscription();
      expect(subscriptionId).to.be.a('string');

      const deleteProcess = await stream.deleteSubscription(subscriptionId);
      expect(deleteProcess).to.be.true;
    });
  });
});
