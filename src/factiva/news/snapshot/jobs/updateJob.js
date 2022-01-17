// eslint-disable-next-line
import { core } from '@factiva/core';
import ExtractionJob from './extractionJob';

const { constants } = core;
/**
 * Class that represents the Snapshot Updates. There can be three types of
 * updates: additions, replacements and deletes.
 */
class UpdateJob extends ExtractionJob {
  static async create(userKey, requestInfo) {
    const updateJob = new UpdateJob();
    await updateJob.setInfo(userKey, requestInfo);
    return updateJob;
  }

  /**
   * @param {string|UserKey} userKey - String
   * containing the 32-character long Api Key or a UserKey instance.
   * @param {string} [updateType] - type of update that this job represents.
   *  Requires snapshotId to be provided as well. Not compatible with
   * updateId
   * @param {string} [snapshotId] - Id of the snapshot that is being updated.
   * Requires updateType to be provided as well. Not compatible with updateId
   * @param {string} [updateId] - Id of an update job that has been created
   * previously. Both updateType and snapshotId can be obtained from this
   * value. Not compatible with updateType nor snapshotId
   * @throws {Error} - when fields that are not compatible are provided or when not
   * enough parameters are provided to create the job.
   */
  constructor(userKey, { updateType, snapshotId, updateId } = {}) {
    super(userKey);
    if (updateId && (updateType || snapshotId)) {
      throw new Error(
        'updateId parameter is not compatible with updateType and snapshotId',
      );
    }

    if (updateId) {
      this.jobId = updateId;
      const updateIdTokens = updateId.split('-');
      [this.snapshotId, this.updateType] = updateIdTokens;

      this.link = `${constants.API_HOST}${constants.API_SNAPSHOTS_BASEPATH}/dj-synhub-extraction-${this.userKey.apiKey}-${updateId}`;
    } else if (snapshotId && updateType) {
      this.updateType = updateType;
      this.snapshotId = snapshotId;
    } else {
      throw new Error('Not enough parameters to create an update job');
    }
  }

  getEndpointUrl() {
    // eslint-disable-next-line max-len
    return `${constants.API_HOST}${constants.API_EXTRACTIONS_BASEPATH}/dj-synhub-extraction-${this.userKey.apiKey}-${this.snapshotId}/${this.updateType}`;
  }

  // eslint-disable-next-line class-methods-use-this
  getJobId(source) {
    // UPDATE_ID FORMAT: {API_URL}/dj-synhub-extraction-{USER-KEY}-{SNAPSHOT_ID}-{UPDATE_TYPE}-{DATETIME}
    return source.data.id.split('-').splice(-3);
  }
}

module.exports = UpdateJob;
