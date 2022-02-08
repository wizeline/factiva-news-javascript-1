const chai = require('chai');
const { SnapshotQuery } = require('../lib/factiva/news/snapshot');
const { expect } = chai;
const VALID_WHERE_STATEMENT = "publication_datetime >= '2021-01-01'";

describe('Factiva News - ', () => {
  describe('Snapshots Query Module - ', () => {
    it('should create a query V1', () => {
      const snapShotQuery = new SnapshotQuery(VALID_WHERE_STATEMENT);
      snapShotQuery.groupBySourceCode = false;
      const analyticsQuery = snapShotQuery.getAnalyticsQuery();
      expect(analyticsQuery).to.deep.equal({
        query: {
          where: VALID_WHERE_STATEMENT,
          frequency: 'MONTH',
          date_field: 'publication_datetime',
          group_by_source_code: false,
          top: 10,
        },
      });
      expect(analyticsQuery).to.not.include({
        query: { group_dimensions: [] },
      });
    });

    it('should create a default snapshot query', () => {
      const snapShotQuery = new SnapshotQuery(VALID_WHERE_STATEMENT);
      const analyticsQuery = snapShotQuery.getAnalyticsQuery();
      expect(analyticsQuery).to.deep.equal({
        query: {
          where: VALID_WHERE_STATEMENT,
          frequency: 'MONTH',
          date_field: 'publication_datetime',
          where: VALID_WHERE_STATEMENT,
          group_dimensions: [],
          top: 10,
        },
      });
      expect(analyticsQuery).to.not.include({
        query: { group_by_source_code: false },
      });
    });

    it('should create a snapshot query', () => {
      const snapShotQuery = new SnapshotQuery(VALID_WHERE_STATEMENT);
      snapShotQuery.groupByDimensions = [
        'source_code',
        'subject_codes',
        'industry_codes',
        'company_codes',
      ];

      const analyticsQuery = snapShotQuery.getAnalyticsQuery();
      expect(analyticsQuery).to.deep.equal({
        query: {
          where: VALID_WHERE_STATEMENT,
          frequency: 'MONTH',
          date_field: 'publication_datetime',
          where: VALID_WHERE_STATEMENT,
          group_dimensions: [
            'source_code',
            'subject_codes',
            'industry_codes',
            'company_codes',
          ],
          top: 10,
        },
      });
    });
  });
});
