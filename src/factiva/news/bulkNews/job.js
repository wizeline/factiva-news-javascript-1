import { existsSync, mkdirSync, writeFile } from 'fs';
import { join } from 'path';

// eslint-disable-next-line
import { core, helper } from '@factiva/core';

const { constants, UserKey, FactivaLogger } = core;
const {
  LOGGER_LEVELS: { INFO, DEBUG, ERROR },
} = constants;

/**
 * Base class to represent the operations that can be done using Factiva
 * Snapshots API or Factiva Streams API.
 * The operations are done in two steps:
 * 1. Submit job:
 *      This will make a request to the corresponding API to start a new
 *      job and, if successful, the API will return a job_id that can be
 *      used to monitor the status of the job
 * 2. Get job results:
 *      This will make a request to the API to get the status of the job.
 *      If the job is finished, the results are saved.
 *
 * This class is not to be instantiated directly, rather to extend in order
 * to implement the missing methods.
 */
class BulkNewsJob {
  /**
   * Creates a job instance while loading data from the API for the
   * user.
   * @param {string|UserKey} [userKey] - String
   * containing the 32-character long Api Key or a UserKey instance.
   * If not provided, the constructor will try to obtain its value
   * from the FACTIVA_APIKEY environment variable.
   * @param {boolean} [requestInfo=false] - Indicates if user data has
   * to be pulled from the server. This operation fills account detail
   * properties along with maximum, used and remaining values.
   * It may take several seconds to complete.
   */
  static async create(userKey) {
    const job = new BulkNewsJob(userKey);
    await job.setInfo();
    return job;
  }

  /**
   * @param {string|UserKey} [userKey] - String
   * containing the 32-character long Api Key or a UserKey instance.
   * If not provided, the constructor will try to obtain its value
   * from the FACTIVA_APIKEY environment variable.
   */
  constructor(userKey) {
    this.jobId = '';
    this.jobState = '';
    this.submittedDatetime = Date.now();
    this.link = '';
    this.userKey = new UserKey(userKey);
    this.logger = new FactivaLogger('/bulkNews-job.js');
  }

  /**
   * Set asynchronous job data that cannot be set in the constructor.
   * Users API calls to retrieve data about the user such as name and
   * remaning extractions.
   * @param {string|UserKey} [userKey] - String
   * containing the 32-character long Api Key or a UserKey instance.
   * If not provided, the constructor will try to obtain its value
   * from the FACTIVA_APIKEY environment variable.
   * @param {boolean} [requestInfo=false] - Indicates if user data has
   * to be pulled from the server. This operation fills account detail
   * properties along with maximum, used and remaining values.
   * It may take several seconds to complete.
   */
  async setInfo(userKey, requestInfo) {
    this.userKey = await UserKey.create(userKey, requestInfo);
  }

  /**
   * Creates the URL for the API endpoint to send the request to sumbit
   * a job, according to the kind of job that is being created.
   * This method needs to be defined by each class that extends this one.
   * @returns - string with the endpoint URL to sumbit the job to.
   * @throws {Error} - when the method has not been defined by the extending
   * class.
   */
  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  getEndpointUrl() {
    throw new Error('Not implemented method!');
  }

  /**
   * Obtains the jobId from the source parameter. The jobId is defined
   * diferently according to the type of job.
   * @param {Object} source - data from where to obtain the jobId from.
   * Usually a response given by the API
   * @returns {string} - obtained jobId
   * @throws {Error} - when the method has not been defined by the extending
   * class.
   */
  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  getJobId(source) {
    throw new Error('Not implemented method!');
  }

  /**
   * Obtains the data for the job, based on an API response
   * @param {Object} source - data from where to obtain the data from.
   * Usually a response given by the API
   * @throws {Error} - when the method has not been defined by the extending
   * class.
   */
  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  setJobData(source) {
    throw new Error('Not implemented method!');
  }

  /**
   * Submits a new job to be processed to the Factiva Snapshots API
   * or Streams API. On a successful response from the API, saves the
   * link of the job as well as the jobId on the caller instance.
   * @param {Object} [payload = undefined] - data required to submit the job
   * @param {boolean} [useLatestApiVersion = false] - Flag to use new Analitycs API version
   * @throws {Error} - when the API reponse does not have a 201 status code.
   */
  async submitJob(payload, useLatestApiVersion = false) {
    this.logger.log(DEBUG, `Submitting job: ${payload}`);
    this.submittedDatetime = Date.now();
    const headers = {
      'user-key': this.userKey.key,
      'Content-Type': 'application/json',
    };
    if (useLatestApiVersion) {
      headers['X-API-VERSION'] = constants.API_LATEST_VERSION;
    }

    const response = await helper.apiSendRequest({
      method: 'POST',
      endpointUrl: this.getEndpointUrl(),
      headers,
      ...(payload && { payload }),
    });

    if (response instanceof Error) {
      throw response;
    }

    this.jobId = this.getJobId(response.data);
    this.jobState = response.data.data.attributes.current_state;
    this.link = response.data.links.self;
  }

  /**
   * Makes a request to the API using the link of the job to get its status.
   * If the job has been completed, obtains the results of the job.
   */
  async getJobResults() {
    this.logger.log(DEBUG, `Getting job results`);
    if (this.link === '') {
      const msg = 'Job has not yet been submitted or Job ID was not set';
      this.logger.log(ERROR, msg);
      throw new ReferenceError(msg);
    }

    const headers = {
      'user-key': this.userKey.key,
      'Content-Type': 'application/json',
    };

    const response = await helper.apiSendRequest({
      method: 'GET',
      endpointUrl: this.link,
      headers,
    });

    this.jobState = response.data.data.attributes.current_state;

    if (!constants.API_JOB_EXPECTED_STATES.includes(this.jobState)) {
      const msg = `Unexpected job state: ${this.jobState}`;
      this.logger.log(ERROR, msg);
      throw new RangeError(msg);
    }

    if (this.jobState === constants.API_JOB_FAILED_STATE) {
      const errors = response.data.errors
        .map((error) => `${error.title}: ${error.detail}`)
        .join();
      const msg = `Job failed with error: ${errors}`;
      this.logger.log(ERROR, msg);
      throw new Error(msg);
    }

    if (this.jobState === constants.API_JOB_DONE_STATE) {
      this.setJobData(response.data);
    }
  }

  /**
   * Submits a new job to be processed, waits until the job is completed
   * and then retrieves the job results.
   * @param {string|Object} [payload = undefined] - data required to process the job
   * @param {boolean} [useLatestApiVersion = false] - Flag to use new Analitycs API version
   * @throws {RangeError} - when an unexpected state is returned from API
   * @throws {Error} - when the returned state is a failed state
   */
  async processJob(payload = undefined, useLatestApiVersion = false) {
    this.logger.log(INFO, `Processing job: ${payload}`);
    await this.submitJob(payload, useLatestApiVersion);
    await this.getJobResults();
    // eslint-disable-next-line no-console
    this.logger.log(DEGUB, `Job link:${this.link}`);

    while (this.jobState !== constants.API_JOB_DONE_STATE) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => {
        setTimeout(r, constants.API_JOB_ACTIVE_WAIT_SPACING * 1000);
      });
      // eslint-disable-next-line no-await-in-loop
      await this.getJobResults();
    }
  }

  /**
   * Downloads a file from a job, using the file URL and stores them in downloadPath
   * @param {string} endpointUrl - URL to download the file from
   * @param {string} downloadPath - path where to store the downloaded file
   */
  async downloadFile(endpointUrl, downloadPath) {
    this.logger.log(INFO, `Dowloading File: ${endpointUrl}`);
    const headers = { 'user-key': this.userKey.key, responseType: 'stream' };
    const response = await helper.apiSendRequest({
      method: 'GET',
      endpointUrl,
      headers,
    });

    await writeFile(downloadPath, response.data, (err) => {
      if (err) {
        throw err;
      }
    });
  }

  /**
   * Downloads all the files from a job ans stores them in the given
   * downloadPath. If no download path is given, the files are stored
   * in a folder with the name of the jobId.
   * @param {string} [downloadPath] - path where to store downloaded files.
   * If not provided, the files are stored in a folder named after the jobId.
   * If such folder does not exists, it is created in the current working
   * directory.
   * @throws {ReferenceError} - when there are no files available to download
   */
  async downloadJobFiles(downloadPath) {
    this.logger.log(INFO, 'Dowloading Job files');
    if (this.files.length === 0) {
      throw new ReferenceError('No files available for download');
    }

    let finalDownloadPath;
    if (!downloadPath) {
      finalDownloadPath = join(process.cwd(), this.jobId);
    } else {
      finalDownloadPath = downloadPath;
    }

    if (!existsSync(finalDownloadPath)) {
      mkdirSync(finalDownloadPath);
    }

    const downloadPromises = [];
    this.files.forEach((fileUrl) => {
      const fileName = BulkNewsJob.getFileName(fileUrl);
      const filePath = join(finalDownloadPath, fileName);
      downloadPromises.push(this.downloadFile(fileUrl, filePath));
    });

    await Promise.all(downloadPromises);
  }

  /**
   * Obtain the Explain job samples from the Factiva Snapshots API.
   * Returns a object array of up to 100 sample documents which  includes title and metadata fields.
   * @param {number} [numSamples=10] - Number of sample documents to get explained by a job
   * @returns {Promise<Object>} List of explain job samples
   */
  async getJobSamples(numSamples) {
    this.logger.log(INFO, `Getting job samples: ${numSamples}`);
    const headers = { 'user-key': this.userKey.key };
    const qsParams = { num_samples: numSamples };
    const endpointUrl = `${this.getEndpointUrl()}/${this.jobId}`;
    this.logger.log(DEBUG, `Samples link: ${endpointUrl}`);

    const response = await helper.apiSendRequest({
      method: 'GET',
      endpointUrl,
      headers,
      qsParams,
    });

    return response.data.data.attributes.sample;
  }

  static getFileName(fileUrl) {
    const partName = fileUrl.split('/').pop();
    if (fileUrl.includes('deletes')) {
      return `deletes-${partName}`;
    }
    if (fileUrl.includes('additions')) {
      return `additions-${partName}`;
    }
    if (fileUrl.includes('replacements')) {
      return `replacements-${partName}`;
    }
    return partName;
  }
}

module.exports = BulkNewsJob;
