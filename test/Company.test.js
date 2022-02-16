/* eslint-disable no-undef */
const chai = require('chai');
const { expect } = chai;
const { helper, core } = require('@factiva/core');
const { Company } = require('../lib/factiva/news/taxonomy');
const fs = require('fs');

const {
  constants: {
    DOWNLOAD_DEFAULT_FOLDER,
    ISIN_COMPANY_IDENTIFIER,
    TICKER_COMPANY_IDENTIFIER,
  },
} = core;
const VALID_USER_KEY = helper.loadEnvVariable('userKey');

describe('Factiva News - ', () => {
  after(() => {
    fs.rmdirSync(DOWNLOAD_DEFAULT_FOLDER, { recursive: true });
  });

  describe('Company module', () => {
    it('should create a company instance', async () => {
      const company = await Company.create(VALID_USER_KEY);
      expect(company.userKey.key).to.be.a('string');
      expect(company.userKey.enabledCompanyIdentifiers).to.be.an('array');
    });

    it('should validate point in time request as valid', async () => {
      const company = await Company.create(VALID_USER_KEY);
      company.validatePointInTimeRequest(TICKER_COMPANY_IDENTIFIER);
      expect(true).to.be.true;
    });

    it('should validate point in time request as not allowed', async () => {
      const company = await Company.create(VALID_USER_KEY);
      try {
        company.validatePointInTimeRequest(ISIN_COMPANY_IDENTIFIER);
        expect(true).to.be.true;
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should download companies identifiers', async () => {
      const company = await Company.create(VALID_USER_KEY);
      const localFileName = await company.pointInTimeDownloadAll(
        TICKER_COMPANY_IDENTIFIER,
        'local_test',
        'csv',
        null,
        true,
      );
      expect(localFileName).to.be.a('string');
    }).timeout(0);

    it('should fails at request to download an invalid file type', async () => {
      const company = await Company.create(VALID_USER_KEY);
      try {
        await company.pointInTimeDownloadAll(
          TICKER_COMPANY_IDENTIFIER,
          'local_test',
          'jpg',
          null,
          true,
        );
        expect(true).to.be.true;
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should fails at request to download an invalid identifier', async () => {
      const company = await Company.create(VALID_USER_KEY);
      try {
        await company.pointInTimeDownloadAll(
          'dump_identifier',
          'local_test',
          'json',
          null,
          true,
        );
        expect(true).to.be.true;
      } catch (err) {
        expect(err).to.be.instanceOf(RangeError);
      }
    });

    it('should get company identifiers with a query', async () => {
      const company = await Company.create(VALID_USER_KEY);
      const identifiersResponse = await company.pointInTimeQuery(
        TICKER_COMPANY_IDENTIFIER,
        'BC1P',
      );
      expect(identifiersResponse.data.id).to.be.a('string');
      expect(identifiersResponse.data.attributes).to.be.a('object');
      expect(identifiersResponse.data.attributes.fcodes_dates).to.be.an(
        'array',
      );
    }).timeout(0);
  });
});
