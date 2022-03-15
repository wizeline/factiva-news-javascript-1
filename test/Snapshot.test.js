/* eslint-disable no-undef */
const chai = require('chai');

const { expect } = chai;

// eslint-disable-next-line
const { helper, core } = require('@factiva/core');
const { Snapshot, SnapshotQuery } = require('../lib/factiva/news/snapshot');

const { UserKey } = core;

const VALID_USER_KEY = helper.loadEnvVariable('userKey');
const VALID_SNAPSHOT_ID = helper.loadEnvVariable('SnapshotId');
const DUMMY_KEY = 'abcd1234abcd1234abcd1234abcd1234';
const VALID_WHERE_STATEMENT = "publication_datetime >= '2021-01-01'";

describe('Factiva News - ', () => {
  describe('Snapshots Module - ', () => {
    it('should create snapshot instance using environment credentials', async () => {
      const s = await Snapshot.create(null, false, {
        query: VALID_WHERE_STATEMENT,
      });
      expect(s.userKey.key).to.equal(VALID_USER_KEY);
      expect(s.query.getBaseQuery()).to.deep.equal({
        query: { where: VALID_WHERE_STATEMENT },
      });
    });

    it('should create a snapshot instance using key as parameter', async () => {
      const s = await Snapshot.create(DUMMY_KEY, false, {
        query: "publication_datetime >= '2021-01-01'",
      });
      expect(s.userKey.key).to.equal(DUMMY_KEY);
      expect(s.query.getBaseQuery()).to.deep.equal({
        query: { where: VALID_WHERE_STATEMENT },
      });
    });

    it('should create snapshot instance using environment credentials and requesting info', async () => {
      const s = await Snapshot.create(null, true, {
        query: "publication_datetime >= '2021-01-01'",
      });
      expect(s.query.getBaseQuery()).to.deep.equal({
        query: { where: VALID_WHERE_STATEMENT },
      });
      expect(s.userKey.accountName.length).to.be.greaterThan(0);
      expect(s.userKey.maxAllowedExtractions).to.be.greaterThan(0);
    });

    it('should create snapshot instance using key parameter and requesting info', async () => {
      const s = await Snapshot.create(VALID_USER_KEY, true, {
        query: "publication_datetime >= '2021-01-01'",
      });
      expect(s.query.getBaseQuery()).to.deep.equal({
        query: { where: VALID_WHERE_STATEMENT },
      });
      expect(s.userKey.accountName.length).to.be.greaterThan(0);
      expect(s.userKey.maxAllowedExtractions).to.be.greaterThan(0);
    });

    it('should create snapshot instance with an existing User Key instance', async () => {
      const uk = await UserKey.create(DUMMY_KEY, false);
      const s = await Snapshot.create(uk, false, {
        query: VALID_WHERE_STATEMENT,
      });
      expect(s.userKey.key).to.equal(DUMMY_KEY);
    });

    it('should create snapshot instance using existing query instance', async () => {
      const query = new SnapshotQuery(VALID_WHERE_STATEMENT);
      const s = await Snapshot.create(DUMMY_KEY, false, { query });
      expect(s.query.getBaseQuery()).to.deep.equal({
        query: { where: VALID_WHERE_STATEMENT },
      });
    });

    it('should raise an error when both query and snapshotId are passed as parameters', () => {
      const query = VALID_WHERE_STATEMENT;
      const snapshotId = VALID_SNAPSHOT_ID;

      const invalidSnapshotCreate = () => {
        // eslint-disable-next-line
        new Snapshot(DUMMY_KEY, { query, snapshotId });
      };

      expect(invalidSnapshotCreate).to.throw(Error);
    });

    it('should raise an error when a non valid query is passed as parameter', () => {
      const query = [VALID_WHERE_STATEMENT];
      const invalidQueryCreate = () => {
        // eslint-disable-next-line
        new Snapshot(DUMMY_KEY, { query });
      };

      expect(invalidQueryCreate).to.throw(TypeError);
    });
  });
});
