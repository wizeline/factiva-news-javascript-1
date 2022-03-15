import { core, helper } from '@factiva/core';

const { UserKey, constants, FactivaLogger } = core;
const {
  API_COMPANIES_IDENTIFIER_TYPE,
  API_HOST,
  API_SNAPSHOTS_COMPANIES_BASEPATH,
  API_SNAPSHOTS_COMPANIES_PIT,
  API_SNAPSHOTS_TAXONOMY_BASEPATH,
  DOWNLOAD_DEFAULT_FOLDER,
  TICKER_COMPANY_IDENTIFIER,
} = constants;

const {
  LOGGER_LEVELS: { INFO, DEBUG, ERROR, WARN },
} = constants;
class Company {
  /**
   * Class that represents the company available within the Snapshots API
   * @param {string|UserKey} [userKey] - String
   * containing the 32-character long Api Key or a UserKey instance.
   * If not provided, the constructor will try to obtain its value
   * from the FACTIVA_APIKEY environment variable.
   * @example
   * // Creating a company instance providing an user key
   * myCompany = await Company.create('abcd1234abcd1234abcd1234abcd1234')
   * @example
   * // Creating a company instance with an existing UserKey instance
   * myUser = UserKey('abcd1234abcd1234abcd1234abcd1234')
   * myCompany = await Company.create(userKey = myUser)
   */
  static async create(userKey) {
    const company = new Company(userKey);
    await company.setInfo(userKey);
    return company;
  }

  /**
   * This constructor will not pull data from
   * @param {string|UserKey} [userKey] - String
   * containing the 32-character long Api Key or a UserKey instance.
   * If not provided, the constructor will try to obtain its value
   * from the FACTIVA_APIKEY environment variable.
   * @example
   * // Creating a company instance providing an user key
   * myCompany = Company('abcd1234abcd1234abcd1234abcd1234')
   * @example
   * // Creating a company instance with an existing UserKey instance
   * myUser = UserKey('abcd1234abcd1234abcd1234abcd1234')
   * myCompany = await Company.create(userKey = myUser)
   */
  constructor(userKey) {
    this.userKey = new UserKey(userKey, true);
    this.logger = new FactivaLogger(__filename);
  }

  __API_ENDPOINT_TAXONOMY = `${API_HOST}${API_SNAPSHOTS_TAXONOMY_BASEPATH}`;
  __API_ENDPOINT_COMPANY = `${API_HOST}${API_SNAPSHOTS_COMPANIES_BASEPATH}`;
  __TICKER_COMPANY_IDENTIFIER_NAME = 'ticker_exchange';

  /**
   * Sets async data for the instance. Uses API calls to set data about the
   * user and categories. Uses the same params as create.
   */
  async setInfo(userKey) {
    this.userKey = await UserKey.create(userKey, true);
  }

  /**
   * Validate if the user is allowed to perform company operation and if the identifier given is valid
   * @param {string} indetifier - A company identifier type
   * @throws {RangeError} - if the user is not allowed to permorm this operation
   * @throws {RangeError} - if the identifier requested is not valid
   */
  validatePointInTimeRequest(indetifier) {
    this.logger.log(DEBUG, 'Validating point in time');
    if (!this.userKey.enabledCompanyIdentifiers.length) {
      throw new RangeError('User is not allowed to perform this operation');
    }
    helper.validateOption(indetifier, API_COMPANIES_IDENTIFIER_TYPE);

    const identifierCustom =
      indetifier === TICKER_COMPANY_IDENTIFIER
        ? this.__TICKER_COMPANY_IDENTIFIER_NAME
        : indetifier;

    const identifierDescription = this.userKey.enabledCompanyIdentifiers.filter(
      (company) => company.name === identifierCustom,
    );

    if (!identifierDescription.length) {
      throw new RangeError('User is not allowed to perform this operation');
    }
  }

  /**
   * Dowload a file with the historical and current identifiers for each category and news coded companies.
   * @param {string} identifier - A company identifier type
   * @param {string} fileName - Name to be used as local filename
   * @param {string} fileFormat - Format of the file requested
   * @param {string} [toSavePath=null] - Path to be used to store the file
   * @param {boolean} [addTimestamp=false] - Flag to determine if include timestamp info at the filename
   * @returns {string} Dowloaded file path
   * @throws {RangeError} - if the user is not allowed to permorm this operation
   * @throws {RangeError} - if the identifier requested is not valid
   * @throws {RangeError} - if the format file requested is not valid
   */
  async pointInTimeDownloadAll(
    identifier,
    fileName,
    fileFormat,
    toSavePath = null,
    addTimestamp = false,
  ) {
    this.logger.log(
      INFO,
      'Dowloading file with the historical and current identifiers',
    );
    this.validatePointInTimeRequest(identifier);
    const localPah = toSavePath || DOWNLOAD_DEFAULT_FOLDER;
    const headers = this.userKey.getAuthenticationHeaders();
    const endpoint = `${this.__API_ENDPOINT_TAXONOMY}${API_SNAPSHOTS_COMPANIES_PIT}/${identifier}/${fileFormat}`;

    const localFile = await helper.downloadFile(
      endpoint,
      headers,
      fileName,
      fileFormat,
      localPah,
      addTimestamp,
    );

    return localFile;
  }

  /**
   * Returns the resolved Factiva code and date ranges when the instrument from the identifier, was valid.
   * @param {string} identifier - A company identifier type
   * @param {string} value - Identifier value
   * @returns {object} Factiva code and date ranges from a company
   */
  async pointInTimeQuery(identifier, value) {
    this.logger.log(INFO, 'Dowloading Factiva code and date ranges');
    this.validatePointInTimeRequest(identifier);
    const headers = this.userKey.getAuthenticationHeaders();
    const endpoint = `${this.__API_ENDPOINT_COMPANY}${API_SNAPSHOTS_COMPANIES_PIT}/${identifier}/${value}`;

    const response = await helper.apiSendRequest({
      method: 'GET',
      endpointUrl: endpoint,
      headers,
    });
    return response['data'];
  }
}

module.exports = Company;
