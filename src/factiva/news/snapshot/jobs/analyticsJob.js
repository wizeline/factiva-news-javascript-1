// eslint-disable-next-line
import { core } from '@factiva/core';
// eslint-disable-next-line
import { BulkNewsJob } from '../../bulkNews';

const { constants } = core;

/**
 * Class that represents the operation of creating Analtyics from Factiva
 * Snapshots API.
 */
class AnalyticsJob extends BulkNewsJob {
  static async create(userKey, requestInfo) {
    const analyticsJob = new AnalyticsJob();
    await analyticsJob.setInfo(userKey, requestInfo);
    return analyticsJob;
  }

  constructor(userKey) {
    super(userKey);
    this.data = {};
  }

  // eslint-disable-next-line class-methods-use-this
  getEndpointUrl() {
    return `${constants.API_HOST}${constants.API_ANALYTICS_BASEPATH}`;
  }

  // eslint-disable-next-line class-methods-use-this
  getJobId(source) {
    return source.data.id;
  }

  setJobData(source) {
    this.data = source.data.attributes.results;
  }
}

module.exports = AnalyticsJob;
