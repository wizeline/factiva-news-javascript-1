/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const chai = require('chai');

const { expect } = chai;

// eslint-disable-next-line
const { helper, core } = require('@factiva/core');
const { Snapshot } = require('../lib/factiva/news/snapshot');
const { UpdateJob } = require('../lib/factiva/news/snapshot');

const { constants } = core;
//const VALID_SNAPSHOT_ID = helper.loadEnvVariable('SnapshotId');
//const VALID_UPDATE_ID = helper.loadEnvVariable('UpdateId');

describe('Factiva News - ', () => {
  describe('Update Snapshots - ', () => {
    // Uncomment to test. Can take some time and also updates can only be processed once
    // every 24 hours
    // it('should create an update job from an exising snapshot', async () => {
    //  this.timeout(100000);
    //   s = await Snapshot.create(null, false, { snapshotId: VALID_SNAPSHOT_ID });
    //   await s.processUpdate('additions');
    //   expect(s.lastUpdateJob.jobState).to.equal(constants.API_JOB_STATE_DONE);
    //   expect(s.lastUpdateJob.files.length).to.be.greaterThan(0);
    // });

/*     it('should dowload the files from a previous update', async () => {
      const uj = new UpdateJob(null, { updateId: VALID_UPDATE_ID });
      await uj.getJobResults();
      await uj.downloadJobFiles();
      expect(uj.files.length).to.be.greaterThan(0);
    }); */
  });
});
