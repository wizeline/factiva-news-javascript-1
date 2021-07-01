// eslint-disable-next-line import/no-extraneous-dependencies, import/no-unresolved
import { core, helper } from '@factiva/core';
import parser from 'papaparse';

const { constants } = core;
const { UserKey } = core;

/** Class representing the taxonomy available within the Snapshots API */
class Taxonomy {
  /**
   * Creates a taxonomy instance while loading data from the API. If
   * requestInfo is set, then it also loads the user data.
   * @param {string|UserKey} [userKey] - String
   * containing the 32-character long Api Key or a UserKey instance.
   * If not provided, the constructor will try to obtain its value
   * from the FACTIVA_APIKEY environment variable.
   * @param {boolean} [requestInfo=false] - Indicates if user data has
   * to be pulled from the server. This operation fills account detail
   * properties along with maximum, used and remaining values.
   * It may take several seconds to complete.
   * @example
   * // Creating a taxonomy instance providing an user key
   * myTaxonomy = await Taxonomy.create('abcd1234abcd1234abcd1234abcd1234')
   * @example
   * // Creating a taxonomy instance with an existing UserKey instance
   * myUser = UserKey('abcd1234abcd1234abcd1234abcd1234')
   * myTaxonomy = await Taxonomy.creat(userKey = myUser)
   */
  static async create(userKey, requestInfo) {
    const taxonomy = new Taxonomy(userKey, requestInfo);
    await taxonomy.setInfo(userKey, requestInfo);
    return taxonomy;
  }

  /**
   * This constructor will not pull data from
   * @param {string|UserKey} [userKey] - String
   * containing the 32-character long Api Key or a UserKey instance.
   * If not provided, the constructor will try to obtain its value
   * from the FACTIVA_APIKEY environment variable.
   * @example
   * // Creating a taxonomy instance providing an user key
   * myTaxonomy = Taxonomy('abcd1234abcd1234abcd1234abcd1234')
   * @example
   * // Creating a taxonomy instance with an existing UserKey instance
   * myUser = UserKey('abcd1234abcd1234abcd1234abcd1234')
   * myTaxonomy = Taxonomy(userKey = myUser)
   */
  constructor(userKey) {
    this.categories = [];
    this.userKey = new UserKey(userKey);
  }

  /**
   * Sets async data for the instance. Uses API calls to set data about the
   * user and categories. Uses the same params as create.
   */
  async setInfo(userKey, requestInfo) {
    this.userKey = await UserKey.create(userKey, requestInfo);
    this.categories = await this.getCategories();
  }

  /**
   * Requests a list of available taxonomy categories
   * @returns {string[]} - the available taxonomy categories
   * @throws {Error} - When API request returns unexpected error
   * @example
   * // This method is called in the create method, so the categories can
   * // be accessed as is.
   */
  async getCategories() {
    const headers = { 'user-key': this.userKey.apiKey };
    const endpointUrl = `${constants.API_HOST}${constants.API_SNAPSHOTS_TAXONOMY_BASEPATH}`;

    const response = await helper.apiSendRequest({
      method: 'GET',
      endpointUrl,
      headers,
    });

    return response.data.data.map((category) => category.attributes.name);
  }

  /**
   * Requests the codes available in the taxonomy for the specified category
   * @param {string} category - Name of the taxonomy category to request the codes from
   * @returns {pending} - Codes for the specified category
   * @throws {TypeError} - When category is not of a valid type
   * @throws {Error} - When API request returns unexpected error
   * @example
   * // Getting the codes for the 'industries' category
   * // { code: description }
   * taxonomy = Taxonomy()
   * industryCodes = taxonomy.getCategoryCodes('industries')
   */
  async getCategoryCodes(category) {
    helper.validateType(category, 'string');

    const responseFormat = 'csv';
    const headers = { 'user-key': this.userKey.apiKey, responseType: 'stream' };
    const endpointUrl = `${constants.API_HOST}${constants.API_SNAPSHOTS_TAXONOMY_BASEPATH}/${category}/${responseFormat}`;

    const response = await helper.apiSendRequest({
      method: 'GET',
      endpointUrl,
      headers,
    });

    const parsedData = parser.parse(response.data, {
      header: true,
      transformHeader: (header) => header.trim(),
    });
    const formattedData = {};

    parsedData.data.forEach((entry) => {
      formattedData[entry.code] = entry.description;
    });

    return formattedData;
  }

  /**
   * Requests information about a single company
   * @param {string} codeType - Code type used to request the information
   * about the company. E.g. isin, ticker.
   * @param {string} companyCode - Company code to request data about
   * @returns {Object} - Object containing the company data
   * @throws {TypeError} - When a parameter is not of a valid type
   * @throws {Error} - When API request returns unexpected error
   * @example
   * // { id: '', fcode: '', commonName: '' }
   * taxonomy = Taxonomy()
   * company_data = taxonomy.get_single_company('isin', 'ABCNMST00394')
   */
  async getSingleCompany(codeType, companyCode) {
    helper.validateType(codeType, 'string');
    helper.validateType(companyCode, 'string');

    const headers = { 'user-key': this.userKey.apiKey };
    const endpointUrl = `${constants.API_HOST}${constants.API_SNAPSHOTS_COMPANIES_BASEPATH}/${codeType}/${companyCode}`;

    const response = await helper.apiSendRequest({
      method: 'GET',
      endpointUrl,
      headers,
    });

    return {
      id: response.data.data.attributes.id,
      fcode: response.data.data.attributes.fcode,
      commonName: response.data.data.attributes.common_name,
    };
  }

  /**
   * Requests information about a list of companies
   * @param {string} codeType - Code type used to request the information
   * about the company. E.g. isin, ticker.
   * @param {string[]} companiesCodes - Company codes to request information about
   * @returns {Object[]} - Objects containing the requested company information
   * @throws {TypeError} - When a parameter is not of a valid type
   * @throws {Error} - When API request returns unexpected error
   * @example
   * // [{id: '', fcode: '', commonName: ''}, {...}]
   * taxonomy = Taxonomy()
   * companies_data = taxonomy.get_multiple_companies('isin', ['ABC3E53433100', 'XYZ233341067', 'MN943181045'])
   */
  async getMultipleCompanies(codeType, companiesCodes) {
    helper.validateType(codeType, 'string', 'Unexpected value for codeType');
    helper.validateType(
      companiesCodes,
      'array',
      'Unexpected value for companiesCode',
    );

    companiesCodes.forEach((company) => {
      helper.validateType(company, 'string');
    });

    const headers = { 'user-key': this.userKey.apiKey };

    const payload = { data: { attributes: { ids: companiesCodes } } };

    const endpointUrl = `${constants.API_HOST}${constants.API_SNAPSHOTS_COMPANIES_BASEPATH}/${codeType}`;

    const response = await helper.apiSendRequest({
      method: 'POST',
      endpointUrl,
      headers,
      payload,
    });

    return response.data.data.attributes.successes.map((company) => ({
      id: company.id,
      fcode: company.fcode,
      commonName: company.common_name,
    }));
  }

  /**
   * Requests information about either a single company or a list of companies
   * @param {string} codeType - Code type used to request the information
   * about the company. E.g. isin, ticker.
   * @param {string} [companyCode=undefined] - Company code to request data about
   * @param {string[]} [companiesCodes=undefined] - Company codes to request information about
   * @returns {Object|Object[]} - Objects containing the requested company information
   * @throws {TypeError} - When a parameter is not of a valid type
   * * @throws {Error} - When both companyCode and CompaniesCodes parameters are set
   * @throws {Error} - When API request returns unexpected error
   * @example
   * // Get data for a single company using the code type 'isin'
   * taxonomy = Taxonomy()
   * single_company_data = taxonomy.get_company('isin', company_code='ABCNMST00394')
   * @example
   * // Get data for multiple companies sugin the code type 'isin'
   * taxonomy = Taxonomy()
   * multiple_companies_data = taxonomy.get_company('isin',
   *  company_codes=['ABC3E53433100', 'XYZ233341067', 'MN943181045'])
   */
  // eslint-disable-next-line consistent-return
  async getCompany(codeType, { companyCode, companiesCodes }) {
    if (companyCode && companiesCodes) {
      throw new Error(
        'company and companies paramenters cannot be set simultanously',
      );
    }

    if (companyCode) {
      return this.getSingleCompany(codeType, companyCode);
    }

    if (companiesCodes) {
      return this.getMultipleCompanies(codeType, companiesCodes);
    }
  }
}

module.exports = Taxonomy;
