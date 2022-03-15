// eslint-disable-next-line
import { core } from '@factiva/core';
// eslint-disable-next-line
import { BulkNewsJob } from '../../bulkNews';

const { constants } = core;

/**
 * Class that represents the operation of creating an explain from Factiva
 *  Snapshots API.
 */
class ExplainJob extends BulkNewsJob {
  static async create(userKey, requestInfo) {
    const explainJob = new ExplainJob();
    await explainJob.setInfo(userKey, requestInfo);
    return explainJob;
  }

  constructor(userKey) {
    super(userKey);
    this.documentVolume = 0;
    this.extractionType = 'documents';
  }

  // eslint-disable-next-line class-methods-use-this
  getEndpointUrl() {
    let endpoint = '';
    switch (this.extractionType) {
      case constants.API_SAMPLES_EXTRACTION_TYPE:
        endpoint = `${constants.API_HOST}${constants.API_EXTRACTIONS_BASEPATH}${constants.API_EXTRACTIONS_SAMPLES_SUFFIX}`;
        break;
      default:
        endpoint = `${constants.API_HOST}${constants.API_SNAPSHOTS_BASEPATH}${constants.API_EXPLAIN_SUFFIX}`;
    }
    this.extractionType = constants.API_DEFAULT_EXTRACTION_TYPE;
    return endpoint;
  }

  // eslint-disable-next-line class-methods-use-this
  getJobId(source) {
    return source.data.id;
  }

  setJobData(source) {
    this.documentVolume = source.data.attributes.counts;
  }
}

module.exports = ExplainJob;
