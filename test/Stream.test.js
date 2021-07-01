/* eslint-disable no-undef */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

const { expect } = chai;

// eslint-disable-next-line
const { helper, core } = require('@factiva/core');
const { Stream } = require('../lib/factiva/news/stream');

const { StreamUser, StreamResponse } = core;

const VALID_USER_KEY = helper.loadEnvVariable('UserKey');
const VALID_STREAM_ID = helper.loadEnvVariable('StreamId');
const VALID_SNAPSHOT_ID = helper.loadEnvVariable('SnapshotId');

// eslint-disable-next-line
const VALID_QUERY_STATEMENT =
  "publication_datetime >= '2021-04-01 00:00:00' AND LOWER(language_code)='en' AND UPPER(source_code) = 'DJDN'";

describe('Factiva News - ', () => {
  describe('Stream Module - ', () => {
    it('should create stream instance using environment credentials', () => {
      const stream = new Stream({ query: VALID_QUERY_STATEMENT });
      expect(stream.streamUser.apiKey).to.equal(VALID_USER_KEY);
      expect(stream.query.getBaseQuery()).to.deep.equal({
        query: { where: VALID_QUERY_STATEMENT },
      });
    });

    it('should create stream instance using a StreamUser with env credentials', () => {
      const streamUser = new StreamUser();
      const stream = new Stream({ streamUser, query: VALID_QUERY_STATEMENT });
      expect(stream.streamUser.apiKey).to.equal(VALID_USER_KEY);
      expect(stream.query.getBaseQuery()).to.deep.equal({
        query: { where: VALID_QUERY_STATEMENT },
      });
    });

    it('should create stream instance using a StreamUser', () => {
      const streamUser = new StreamUser(VALID_USER_KEY);
      const stream = new Stream({ streamUser, query: VALID_QUERY_STATEMENT });
      expect(stream.streamUser.apiKey).to.equal(VALID_USER_KEY);
      expect(stream.query.getBaseQuery()).to.deep.equal({
        query: { where: VALID_QUERY_STATEMENT },
      });
    });

    it('should create stream instance using an api key', () => {
      const stream = new Stream({
        apiKey: VALID_USER_KEY,
        query: VALID_QUERY_STATEMENT,
      });
      expect(stream.streamUser.apiKey).to.equal(VALID_USER_KEY);
      expect(stream.query.getBaseQuery()).to.deep.equal({
        query: { where: VALID_QUERY_STATEMENT },
      });
    });

    it('should create a stream instance using a query', async () => {
      const stream = new Stream({
        query: VALID_QUERY_STATEMENT,
        apiKey: VALID_USER_KEY,
      });

      expect(stream.create()).to.eventually.be.instanceOf(StreamResponse);
    });

    it('should create a stream instance using a snapshot id', async () => {
      const stream = new Stream({
        snapshotId: VALID_SNAPSHOT_ID,
        apiKey: VALID_USER_KEY,
      });

      expect(stream.create()).to.eventually.be.instanceOf(StreamResponse);
    });

    // it('should create and delete a stream instance using a query', async () => {
    //   const stream = new Stream({
    //     streamId:
    //       'replace-for-id',
    //     apiKey: VALID_USER_KEY,
    //   });

    //   expect(stream.delete()).to.eventually.be.instanceOf(StreamResponse);
    // });

    it('should get info about query by its', async () => {
      const stream = new Stream({
        streamId: VALID_STREAM_ID,
        apiKey: VALID_USER_KEY,
      });

      expect(stream.getInfo()).to.eventually.be.instanceOf(StreamResponse);
    });
  });
});
