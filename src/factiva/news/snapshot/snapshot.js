// eslint-disable-next-line
import { core, helper } from '@factiva/core';
// eslint-disable-next-line
import { BulkNewsBase } from '../bulkNews';
// eslint-disable-next-line
import { ExplainJob, AnalyticsJob, ExtractionJob, UpdateJob } from './jobs';
import SnapshotQuery from './query';

const { UserKey } = core;

/**
 * Class that represents a Factiva Snapshot.
 */
class Snapshot extends BulkNewsBase {
  /**
   * Creates a snapshot instance while retrieving data from API. Uses the
   * same parameters as the constructor. When snapshotId is provided,
   * data from the snapshot is retrieved from the API.
   * @param {boolean} [requestInfo=false] - Indicates if user data has
   * to be pulled from the server. This operation fills account detail
   * properties along with maximum, used and remaining values.
   * It may take several seconds to complete.
   */
  static async create(userKey, requestInfo, { query, snapshotId }) {
    const snapshot = new Snapshot(userKey, { query, snapshotId });
    await snapshot.setInfo(userKey, requestInfo, { snapshotId });
    return snapshot;
  }

  /**
   * @param {string|UserKey} [userKey] - String
   * containing the 32-character long Api Key or a UserKey instance.
   * If not provided, the constructor will try to obtain its value
   * from the FACTIVA_APIKEY environment variable.
   * @param {string|SnapshotQuery} [query] -  query used to run
   *  any of the Snapshot-related operations. If a string is provided, a
   * simple query with a `where` clause is created. If other query fields
   * are required, either provide the SnapshotQuery object at creation, or
   * set the appropriate object values after creation. This parameter is
   * not compatible with snapshotId.
   * @param {string} [snapshotId] - 10-character long Snapshot ID.
   * This parameter is not compatible with query.
   * @throws {Error} - when incompatible parameters are provided.
   * @throws {TypeError} - when an unexpected value is provided for the query.
   * @example
   * myKey = "abcd1234abcd1234abcd1234abcd1234"
   * myQuery = "publication_datetime >= '2020-01-01 00:00:00' AND LOWER(language_code) = 'en'"
   * mySnapshot = Snapshot(userKey=myKey, query=myQuery)
   * @example
   * myUser = UserKey()
   * myQuery = SnapshotQuery("publication_datetime >= '2020-01-01 00:00:00' AND LOWER(language_code) = 'en'")
   * myQuery.frequency = 'YEAR'
   * myQuery.group_by_source_code = true
   * myQuery.top = 20
   * mySnapshot = Snapshot(userKey=myUser, query=myQuery)
   */
  constructor(userKey, { query, snapshotId }) {
    super(userKey);
    this.lastExplainJob = new ExplainJob(this.userKey);
    this.lastAnalyticsJob = new AnalyticsJob(this.userKey);

    if (query && snapshotId) {
      throw new Error(
        'The query and snapshotId parameters cannot be set simultaneously',
      );
    }

    if (query) {
      if (query instanceof SnapshotQuery) {
        this.query = query;
      } else if (typeof query === 'string') {
        this.query = new SnapshotQuery(query);
      } else {
        throw new TypeError('Unexpected value for the query-where clause');
      }
      this.lastExtractionJob = new ExtractionJob(this.userKey);
    }

    if (snapshotId) {
      this.query = new SnapshotQuery('');
      this.lastExtractionJob = new ExtractionJob(this.userKey, snapshotId);
    }
  }

  /**
   * Sets async data that cannot be set in constructor. Users API calls to
   * retrive data about the user and the snapshot. Uses same params as
   * create.
   */
  async setInfo(userKey, requestInfo, { snapshotId }) {
    this.userKey = await UserKey.create(userKey, requestInfo);
    if (snapshotId) {
      await this.getExtractionJobResults();
    }
  }

  /**
   * Submits an Explain job to the Factiva Snapshots API, using the
   * assigned user in the userKey, and SnapshotQuery in the `query`
   * properties.
   */
  async submitExplainJob() {
    await this.lastExplainJob.submitJob(this.query.getExplainQuery());
  }

  /**
   * Obtains the Explain job results from the Factiva Snapshots API. Results
   * are stored in the `lastExplainjob` class property.
   */
  async getExplainJobResults() {
    await this.lastExplainJob.getJobResults();
  }

  /**
   * Submits an Explain job to the Factiva Snapshots API, using the same
   * parameters used by `submit_explain_job`. Then, monitors the job until
   * its status change to `JOB_STATE_DONE`. Finally, retrieves and stores
   * the results in the property lastExplainJob`.
   * @example
   * queryClause = "publication_datetime >= '2018-01-01 00:00:00' AND publication_datetime <=
   * '2018-01-02 00:00:00' AND LOWER(language_code) = 'en'";
   * mySnapshot = Snapshot(api_user='abcd1234abcd1234abcd1234abcd1234', query=query_clause);
   * await mySnapshot.processExplain();
   */
  async processExplain() {
    await this.lastExplainJob.processJob(this.query.getExplainQuery());
  }

  /**
   * Submits an Analytics job to the Factiva Snapshots API, using the
   * assigned user in the `userKey`, and SnapshotQuery in the `query`
   * properties.
   */
  async submitAnalyticsJob() {
    await this.lastAnalyticsJob.submitJob(this.query.getAnalyticsQuery());
  }

  /**
   * Obtains the Analytics job results from the Factiva Snapshots API.
   * Results are stored in the `lastAnalyticsJob` class property.
   */
  async getAnalyticsJobResults() {
    await this.lastAnalyticsJob.getJobResults();
  }

  /**
   * Submits an Analytics job to the Factiva Snapshots API, using the same
   * parameters used by `submitAnalyticsJob`. Then, monitors the job until
   * its status change to `JOB_STATE_DONE`. Finally, retrieves and stores
   * the results in the property `lastAnalyticsJob`.
   * @example
   * queryClause = "publication_datetime >= '2018-01-01 00:00:00' AND publication_datetime <=
   * '2018-01-02 00:00:00' AND LOWER(language_code) = 'en'";
   * mySnapshot = Snapshot(api_user='abcd1234abcd1234abcd1234abcd1234', query=query_clause);
   * await mySnapshot.processAnalytics();
   */
  async processAnalytics() {
    await this.lastAnalyticsJob.processJob(this.query.getAnalyticsQuery());
  }

  /**
   * Submits an Extraction job to the Factiva Snapshots API, using the
   * assigned user in the `userkey`, and SnapshotQuery in the `query`
   * properties.
   */
  async submitExtractionJob() {
    await this.lastExtractionJob.submitJob(this.query.getExtractionQuery());
    this.snapshotId = this.lastExtractionJob.jobId;
  }

  /**
   * Obtains the Extraction job results from the Factiva Snapshots API.
   * Results are stored in the `lastExtractionJob` class property.
   */
  async getExtractionJobResults() {
    await this.lastExtractionJob.getJobResults();
  }

  /**
   * Downloads the list of files listed in the Snapshot.lastExtractionJob.files
   * property, and stores them in a folder indicated by `downloadPath`. If no
   * `downloadPath` is provided, then files are stored in a folder with the
   * same name as the snapshot ID.
   * @param {string} [downloadPath] - file path on where to store the files.
   */
  async downloadExtractionFiles(downloadPath = undefined) {
    await this.lastExtractionJob.downloadJobFiles(downloadPath);
  }

  /**
   * Submits an Extraction job to the Factiva Snapshots API, using the same
   * parameters used by `submitExtractionJob`. Then, monitors the job until
   * its status change to `JOB_STATE_DONE`. The final status is retrieved
   * and stored in the property `lastExtractionJob`, which among other
   * properties, contains the list of files to download. The process then
   * downloads all files to the specified `downloadPath`. If no download path
   * is provided, files are stored in a folder named equal to the
   * `snapshotId` property. The process ends after all files are downloaded.
   *
   * Because the whole processing takes places in a single call, it's
   * expected that the execution of this operation takes several
   * minutes, or even hours.
   * @param {string} [downloadPath] - file path on where to store the files
   * resulting from the extraction.
   * @example
   * queryClause = "publication_datetime >= '2018-01-01 00:00:00' AND publication_datetime
   * <= '2018-01-02 00:00:00' AND LOWER(language_code) = 'en'";
   * mySnapshot = Snapshot(api_user='abcd1234abcd1234abcd1234abcd1234', query=query_clause);
   * await mySnapshot.processExtraction('../downloads/data');
   */
  async processExtraction(downloadPath = undefined) {
    await this.lastExtractionJob.processJob(
      this.query.getExtractionQuery(),
      downloadPath,
    );
  }

  /**
   * Submits an Update Job to the Factiva Snapshots API, using the
   * assigned user in the `userKey` and `snapshotId` asigned to
   * the instance and the `updateType` passed as parameter. Assigns
   * the submitted job to the `lastUpdateJob` property.
   * @param {string} updateType -  String containing the update type
   * to submit a job. Could be 'additions', 'replacements' or 'deletes'.
   */
  async submitUpdateJob(updateType) {
    helper.validateType(updateType, 'string');
    this.lastUpdateJob = new UpdateJob(this.userKey, {
      updateType,
      snapshotId: this.lastExtractionJob.jobId,
    });
    await this.lastUpdateJob.submitJob();
  }

  /**
   * Obtains the Update Job results from the Factiva Snapshots API.
   * Results are stored in the `lastUpdateJob` class property.
   * @throws {ReferenceError} - when lastUpdateJob has not beed set.
   */
  async getUpdateJobResults() {
    if (!this.lastUpdateJob) {
      throw new ReferenceError('Update Job has not been set');
    }
    await this.lastUpdateJob.getJobResults();
  }

  /**
   * Downloads the list of files listed in the Snapshot.lastUpdateJob.files
   * property, and stores them in a folder indicated by `downloadPath`. If no
   * `downloadPath` is provided, then files are stored in a folder with the
   * same name as the update ID.
   * @param {string} [downloadPath] - file path on where to store the files.
   * @throws {ReferenceError} - when lastUpdateJob has not beed set.
   */
  async downloadUpdateFiles(downloadPath = undefined) {
    if (!this.lastUpdateJob) {
      throw new ReferenceError('Update Job has not been set');
    }
    await this.lastUpdateJob.downloadJobFiles(downloadPath);
  }

  /**
   * Submits an Update job to the Factiva Snapshots API, using the same
   * parameters used by `submiteUpdateJob`. Then, monitors the job until
   * its status change to `JOB_STATE_DONE`. The final status is retrieved
   * and stored in the property `lastUpdateJob`, which among other
   * properties, contains the list of files to download. The process then
   * downloads all files to the specified `downloadPath`. If no download path
   * is provided, files are stored in a folder named equal to the
   * `lasUpdateJob.jobId` property.
   *
   * Because the whole processing takes places in a single call, it's
   * expected that the execution of this operation takes several
   * minutes, or even hours.
   * @param {string} updateType - update type to process the job. Could be
   * 'additions', 'replacements' or 'deletes'.
   * @param {string} [downloadPath] - file path on where to store the files.
   * @example
   * previousSnapshot = Snapshot(userKey=myUser, snapshotId='sdjjekl93j');
   * previousSnapshot.processUpdate('additions', `./${previous_snapshot.snapshot_id}/additions/`);
   */
  async processUpdate(updateType, downloadPath) {
    this.lastUpdateJob = new UpdateJob(this.userKey, {
      updateType,
      snapshotId: this.lastExtractionJob.jobId,
    });
    await this.lastUpdateJob.processJob(downloadPath);
  }
}

module.exports = Snapshot;
