// eslint-disable-next-line
import { core, helper } from '@factiva/core';
// eslint-disable-next-line
import { BulkNewsQuery } from '../bulkNews';

const { constants } = core;

/**
 * Validates that a given options is string and part of the valid options.
 * @param {string} option
 * @param {string[]} validOptions
 * @returns the given option in case it is valid
 * @throws {RangeError} - when the given option is not part of the valid
 * options.
 */
function validateOption(option, validOptions) {
  helper.validateType(option, 'string');
  if (!validOptions.includes(option.trim())) {
    throw new RangeError(
      `Option value ${option} is not within the allowed options: ${validOptions}`,
    );
  }
  return option;
}

/**
 * Class representing queries used in Factiva Snapshots API.
 */
class SnapshotQuery extends BulkNewsQuery {
  /**
   *
   * @param {string} where
   * @param {Object} options
   * @throws {RangeError} - when a parameter is not within the valid range
   */
  constructor(
    where,
    {
      includes = undefined,
      excludes = undefined,
      selectFields = undefined,
      limit = 0,
      fileFormat = constants.API_AVRO_FORMAT,
      frequency = constants.API_MONTH_PERIOD,
      dateField = constants.API_PUBLICATION_DATETIME_FIELD,
      groupBySourceCode = false,
      top = 10,
    } = {},
  ) {
    super(where, includes, excludes, selectFields);

    helper.validateType(limit, 'number');
    if (limit < 0) {
      throw new RangeError('Limit value is not valid or not positive');
    }

    if (limit > 0) {
      this.limit = limit;
    }

    this.fileFormat = validateOption(
      fileFormat.toLowerCase(),
      constants.API_EXTRACTION_FILE_FORMATS,
    );
    this.frequency = validateOption(frequency, constants.API_DATETIME_PERIODS);
    this.dateField = validateOption(dateField, constants.API_DATETIME_FIELDS);

    helper.validateType(groupBySourceCode, 'boolean');
    this.groupBySourceCode = groupBySourceCode;

    helper.validateType(top, 'number');
    if (top <= 0) {
      throw new RangeError('Top value is not valid or not positive');
    }
    this.top = top;
  }

  /**
   * Get query used for explain job.
   * @returns {Object}
   */
  getExplainQuery() {
    return super.getBaseQuery();
  }

  /**
   * Get query used for Analytics Job
   * @returns {Object}
   */
  getAnalyticsQuery() {
    const baseQuery = super.getBaseQuery();
    return {
      query: {
        ...baseQuery.query,
        frequency: this.frequency,
        dateField: this.dateField,
        groupBySourceCode: this.groupBySourceCode,
        top: this.top,
      },
    };
  }

  /**
   * Gets query needed for Extraction Job
   * @returns {Object}
   */
  getExtractionQuery() {
    const baseQuery = super.getBaseQuery();
    return {
      query: {
        ...baseQuery.query,
        ...(this.limit && { includes: this.limit }),
        format: this.fileFormat,
      },
    };
  }
}

module.exports = SnapshotQuery;
