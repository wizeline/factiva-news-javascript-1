/* eslint-disable no-undef */
const chai = require('chai');

const { expect } = chai;

// eslint-disable-next-line import/no-extraneous-dependencies,import/no-unresolved
const { core } = require('@factiva/core');
const { Snapshot } = require('../lib/factiva/news/snapshot');

const { constants } = core;
// eslint-disable-next-line operator-linebreak
const VALID_WHERE_STATEMENT =
  "publication_datetime >= '2018-01-01 00:00:00' AND publication_datetime <= '2018-03-01 00:00:00' AND LOWER(language_code) = 'en'";

describe('Factiva News - ', () => {
  describe('Snapshots Analytics - ', () => {
    it('request an analytics V1 given a query', async () => {
      const s = await Snapshot.create(null, false, {
        query: VALID_WHERE_STATEMENT,
      });
      s.query.groupBySourceCode = false;
      await s.processAnalytics();
      expect(s.lastAnalyticsJob.jobState).to.equal(
        constants.API_JOB_DONE_STATE,
      );
      expect(s.lastAnalyticsJob.data.length).to.be.equal(3);
      expect(s.lastAnalyticsJob.data[0]).to.include({
        publication_datetime: '2018-01',
      });
      expect(s.lastAnalyticsJob.data[0]).to.not.have.all.keys('region_codes');
    });

    it('request an analytics given a query', async () => {
      const s = await Snapshot.create(null, false, {
        query: VALID_WHERE_STATEMENT,
      });
      s.query.groupByDimensions = ['region_codes', 'industry_codes'];
      await s.processAnalytics();
      s.lastAnalyticsJob.data.forEach((data) => {
        expect(data).to.have.a.property('region_codes');
        expect(data).to.have.a.property('industry_codes');
      });
    });

    it('request an analytics given a query without groupByDimensions', async () => {
      const s = await Snapshot.create(null, false, {
        query: VALID_WHERE_STATEMENT,
      });
      await s.processAnalytics();
      s.lastAnalyticsJob.data.forEach((data) => {
        expect(data).to.not.have.a.property('region_codes');
      });
    });
  });
});
