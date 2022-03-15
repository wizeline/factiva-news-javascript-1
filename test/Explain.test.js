/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

const { expect } = chai;

// eslint-disable-next-line import/no-extraneous-dependencies,import/no-unresolved
const { core } = require('@factiva/core');
const { Snapshot } = require('../lib/factiva/news/snapshot');

const { constants } = core;

// eslint-disable-next-line operator-linebreak
const VALID_WHERE_STATEMENT =
  "publication_datetime >= '2018-01-01 00:00:00' AND publication_datetime <= '2018-01-03 00:00:00' AND LOWER(language_code) = 'en'";

const INVALID_WHERE_STATEMENT = "publicaton_datetime >= '2018-01-01 00:00:00'";

describe('Factiva News - ', () => {
  describe('Explain Snapshots - ', () => {
    it('request an explain from a query', async () => {
      const s = await Snapshot.create(null, false, {
        query: VALID_WHERE_STATEMENT,
      });
      await s.processExplain();
      expect(s.lastExplainJob.jobState).to.equal(constants.API_JOB_DONE_STATE);
      expect(s.lastExplainJob.documentVolume).to.be.greaterThan(0);
    });

    it('request an explain job sample from a query', async () => {
      const s = await Snapshot.create(null, false, {
        query: VALID_WHERE_STATEMENT,
      });
      await s.processExplain();
      const jobSamples = await s.getExplainJobSamples(10);
      expect(jobSamples.length).to.be.greaterThan(0);
    });

    it('should throw an errow when an invalid query is provided', async () => {
      const s = await Snapshot.create(null, false, {
        query: INVALID_WHERE_STATEMENT,
      });

      expect(s.processExplain()).to.eventually.be.rejectedWith(
        'Unexpected API Error',
      );
    });
  });
});
