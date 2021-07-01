// eslint-disable-next-line
import { helper } from '@factiva/core';

/**
 * Class that serves as a base for the queries used to make requests to
 * the APIs.
 */
class BulkNewsQuery {
  /**
   * @param {string} where - query where clause
   * @param {string|Object} [includes=undefined] - Contains the query includes clause,
   * which defines the codes to include for specific fields.
   * When an Object is given it is assigned as it is.
   * When a string is given, it is expected to have a JSON format
   * and is parsed to be stored as an Object.
   * @param {string|Object} [excludes=undefined] - Contains the query excludes clause,
   * which defines the codes to exclude for especific fields.
   * When an Object is given it is assigned as it is.
   * When a string is given, it is expected to have a JSON format
   * and is parsed to be stored as an Object.
   * @param {string|Array} [selectFields=undefined] - Contains the query select clause,
   * which defines the fields to be returned by the query.
   * When an Array is given it is assigned as it is.
   * When a string is given, it is expected to have a JSON format
   * and is parsed to be stored as an Object.
   */
  constructor(where, { includes, excludes, selectFields } = {}) {
    helper.validateType(where, 'string');
    this.where = where;
    this.includes = this.parseParameter(includes, 'includes');
    this.excludes = this.parseParameter(excludes, 'excludes');
    this.selectFields = this.parseParameter(selectFields, 'selectFields');
  }

  /**
   * Parses a parameter to an object if a string is given.
   * @param {*} parameter - Parameter to parse
   * @param {*} parameterName - Name to display in case there is an error
   * @returns {Object} - Parsed parameter
   * @throws {TypeError} - When something other than a string or object
   * is passed.
   */
  // eslint-disable-next-line class-methods-use-this
  parseParameter(parameter, parameterName = 'passed parameter') {
    if (parameter) {
      if (typeof parameter === 'string') {
        return JSON.parse(parameter);
      }
      if (typeof parameter === 'object') {
        return parameter;
      }
      throw new TypeError(`Unexpected value for ${parameterName}`);
    }
    return undefined;
  }

  /**
   * Creates the basic query to be used within the Factiva Snapshots API and the Factiva Streams API.
   * @returns {Object} - Object containing the fields that where assigned to the query.
   */
  getBaseQuery() {
    return {
      query: {
        where: this.where,
        ...(this.includes && { includes: this.includes }),
        ...(this.excludes && { excludes: this.excludes }),
        ...(this.selectFields && { select: this.selectFields }),
      },
    };
  }
}

module.exports = BulkNewsQuery;
