/* eslint-disable no-undef */
const chai = require('chai');

const { expect } = chai;
// eslint-disable-next-line import/no-extraneous-dependencies, import/no-unresolved
const { helper } = require('@factiva/core');

const Taxonomy = require('../lib/factiva/news/taxonomy');

const VALID_USER_KEY = helper.loadEnvVariable('UserKey');

describe('Factiva News - ', () => {
  describe('Taxonomy module', () => {
    it('create a taxonomy instance', async () => {
      const taxonomy = await Taxonomy.create(VALID_USER_KEY, false);
      expect(taxonomy.categories).to.be.an('array').that.includes('industries');
    });

    it('should request identifiers for the industries taxonomy', async () => {
      const taxonomy = await Taxonomy.create(VALID_USER_KEY, false);
      const industryCodes = await taxonomy.getCategoryCodes('industries');
      expect(industryCodes).to.include({
        i257: 'Pharmaceuticals',
        iphrws: 'Pharmaceuticals Wholesale',
        i643: 'Pharmacies/Drug Stores',
      });
    });

    it('should request data for a company', async () => {
      const taxonomy = await Taxonomy.create(VALID_USER_KEY);
      const companyData = await taxonomy.getCompany('isin', {
        companyCode: 'PLUNMST00014',
      });
      expect(companyData).to.deep.equal({
        id: 'PLUNMST00014',
        fcode: 'UNSYT',
        commonName: 'Unima 2000 Systemy Teleinformatyczne S.A.',
      });
    });

    it('should request data about multiple companies', async () => {
      const taxonomy = await Taxonomy.create(VALID_USER_KEY, false);
      const companiesData = await taxonomy.getCompany('isin', {
        companiesCodes: [
          'US0378331005',
          'US0231351067',
          'US5949181045',
          'US4523531083',
        ],
      });
      expect(companiesData).to.deep.include(
        { id: 'US0378331005', fcode: 'APPLC', commonName: 'Apple Inc.' },
        { id: 'US5949181045', fcode: 'MCROST', commonName: 'Microsoft Corp.' },
        { id: 'US0231351067', fcode: 'AMZCOM', commonName: 'Amazon.com Inc.' },
      );
    });
  });
});
