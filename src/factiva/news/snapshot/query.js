// eslint-disable-next-line
import { core, helper } from '@factiva/core';
// eslint-disable-next-line
import { BulkNewsQuery } from '../bulkNews';

const { constants } = core;

/**
 * Validate if groupBySourceCode and groupByDimensios fields has no conflicts eachother
 * @param {(boolean|null)} groupBySourceCode
 * @param {(string[]|null)} groupByDimensions
 * @returns {ReferenceError} Error if the variable is not the type given
 */
const validateGroupOptions = (groupBySourceCode, groupByDimensions) => {
  if (
    typeof groupBySourceCode === 'boolean' &&
    Array.isArray(groupByDimensions)
  ) {
    throw new TypeError(
      'The value groupBySourceCode and groupByDimensions are not compatible each other',
    );
  }
};

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
      groupBySourceCode = null,
      top = 10,
      groupByDimensions = null,
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

    this.fileFormat = helper.validateOption(
      fileFormat.toLowerCase(),
      constants.API_EXTRACTION_FILE_FORMATS,
    );
    this.frequency = helper.validateOption(
      frequency,
      constants.API_DATETIME_PERIODS,
    );
    this.dateField = helper.validateOption(
      dateField,
      constants.API_DATETIME_FIELDS,
    );

    validateGroupOptions(groupBySourceCode, groupByDimensions);

    if (typeof groupBySourceCode === 'boolean') {
      this.groupBySourceCode = groupBySourceCode;
    }

    if (Array.isArray(groupByDimensions)) {
      this.groupByDimensions = groupByDimensions;
    }

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
    validateGroupOptions(this.groupBySourceCode, this.groupByDimensions);
    const baseQuery = super.getBaseQuery();
    const analitycsQuery = {
      query: {
        ...baseQuery.query,
        frequency: this.frequency,
        'date_field': this.dateField,
        top: this.top,
      },
    };
    if (typeof this.groupBySourceCode === 'boolean') {
      analitycsQuery.query['group_by_source_code'] = this.groupBySourceCode;
    } else {
      if (this.groupByDimensions && this.groupByDimensions.length) {
        if (this.groupByDimensions.length <= 4) {
          this.groupByDimensions.forEach((option) => {
            helper.validateOption(
              option,
              constants.API_GROUP_DIMENSIONS_FIELDS,
            );
          });
        } else {
          throw new ReferenceError('The maximiun group_dimensions options is 4');
        }
      } else {
        this.groupByDimensions = [];
      }
      analitycsQuery.query['group_dimensions'] = this.groupByDimensions;
    }
    return analitycsQuery;
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
