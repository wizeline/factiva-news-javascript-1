// eslint-disable-next-line
import { core } from '@factiva/core';
// eslint-disable-next-line
import { BulkNewsJob } from '../../bulkNews';

const { constants } = core;
/**
 * Class that represents the operation of creating a Snapshot from Factiva
 *  Snapshots API.
 */
class ExtractionJob extends BulkNewsJob {
  static async create(userKey, requestInfo) {
    const extractionJob = new ExtractionJob();
    extractionJob.setInfo(userKey, requestInfo);
    return extractionJob;
  }

  constructor(userKey, snapshotId = undefined) {
    super(userKey);
    this.files = [];
    this.fileFormat = '';

    if (userKey && snapshotId) {
      this.jobId = snapshotId;
      this.link = `${constants.API_HOST}${constants.API_SNAPSHOTS_BASEPATH}/dj-synhub-extraction-${this.userKey.apiKey}-${snapshotId}`;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getEndpointUrl() {
    return `${constants.API_HOST}${constants.API_SNAPSHOTS_BASEPATH}`;
  }

  // eslint-disable-next-line class-methods-use-this
  getJobId(source) {
    return source.data.id.split('-').pop();
  }

  setJobData(source) {
    this.fileFormat = source.data.attributes.format;
    this.files = source.data.attributes.files.map((fileItem) => fileItem.uri);
  }

  /**
   * Overrides method from parent class to call the method for downloading
   *  the files once the snapshot has been completed.
   * @param {string} [payload] - Payload to process job with
   * @param {string} [path] - path to store the snapshots files that are
   * downloaded from the snapshot. If no path is given, the files will be
   * stored in a folder named after the snapshot_id in the current working
   * directory.
   */
  async processJob(payload = undefined, path = undefined) {
    await super.processJob(payload);
    await this.downloadJobFiles(path);
  }
}

module.exports = ExtractionJob;
