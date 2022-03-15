/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const chai = require('chai');

const { expect } = chai;
// eslint-disable-next-line import/no-extraneous-dependencies,import/no-unresolved
const { core, helper } = require('@factiva/core');
const { Snapshot } = require('../lib/factiva/news/snapshot');

const { constants } = core;

// eslint-disable-next-line operator-linebreak
const VALID_WHERE_STATEMENT = // eslint-disable-next-line no-unused-vars
  "publication_datetime >= '2018-01-01 00:00:00' AND publication_datetime <= '2018-01-03 00:00:00' AND LOWER(language_code) = 'en'";

const VALID_USER_KEY = helper.loadEnvVariable('userKey');
const VALID_SNAPSHOT_ID = helper.loadEnvVariable('SnapshotId');

describe('Factiva News - ', () => {
  describe('Snapshot Extraction - ', () => {
    // Uncomment to test, could take some time.
    // it('process an extraction given query', async () => {
    //   this.timeout(100000);
    //   s = await Snapshot.create(null, false, { query: VALID_WHERE_STATEMENT });
    //   await s.processExtraction();
    //   expect(s.lastExtractionJob.jobState).to.equal(
    //     constants.API_JOB_DONE_STATE,
    //   );
    //   expect(s.lastExtractionJob.files.length).to.be.greaterThan(0);
    // });

    it('should download files from existing snapshot', async () => {
      const s = await Snapshot.create(VALID_USER_KEY, false, {
        snapshotId: VALID_SNAPSHOT_ID,
      });
      await s.downloadExtractionFiles();
      expect(s.lastExtractionJob.files.length).to.be.greaterThan(0);
    });
  });
});
