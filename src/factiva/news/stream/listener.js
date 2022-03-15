import { core, helper } from '@factiva/core';
const { constants, StreamUser, FactivaLogger } = core;
const {
  LOGGER_LEVELS: { INFO, DEBUG, ERROR, WARN },
} = constants;

const defaultCallback = (message) => {
  /* Call to default callback function. */
  // eslint-disable-next-line
  console.log(`Message: ${message.data.toString()}`);
};

class Listener {
  /**
   * Creates a Listener for consuming messages from Pubsub
   * The Listener can check if the user has not reached yet
   * the limit for consuming new messages from pubsub
   * It is intended that the consumer works async
   * @param {string} [subscriptionId=null] - Indicates the subcription
   * needed for consuming from Pubsub
   * @param {object} [streamUser=null] - Indicates the user which is
   * associated the current consumer. The user is an instance from streamUser
   * @throws {ReferenceError} - when there is no stream id specified
   * @throws {ReferenceError} - when there is no streamUser
   * @throws {ReferenceError} - when the streamUser is not an instance of StreamUser
   */
  constructor({ subscriptionId = null, streamUser = null }) {
    let subscriptionIdEnv;
    this.logger = new FactivaLogger(__filename);
    if (!subscriptionId) {
      try {
        subscriptionIdEnv = helper.loadEnvironmentValue(
          'FACTIVA_STREAM_SUBSCRIPTION_ID',
        );
      } catch (e) {
        this.logger.log(ERROR, 'No subscription specified');
        throw constants.UNDEFINED_SUBSCRIPTION_ERROR;
      }
    }
    if (!streamUser) {
      this.logger.log(ERROR, 'Undefined streamUser');
      throw ReferenceError('Undefined streamUser');
    }
    if (!(streamUser instanceof StreamUser)) {
      this.logger.log(ERROR, 'streamUser is not instance of StreamUser');
      throw ReferenceError('streamUser is not instance of StreamUser');
    }

    this.streamUser = streamUser;
    this.subscriptionId = subscriptionId || subscriptionIdEnv;
    this.messagesCount = 0;
  }

  /**
   * Get the current stream which the subcription belongs to.
   * this is already given in the constructor(subcriptionId)
   * @throws {ReferenceError} - when there is no stream id specified
   */
  subscriptionIdToStreamId() {
    if (!this.subscriptionId) {
      this.logger.log(ERROR, 'subscriptionId undefined');
      throw ReferenceError('subscriptionId undefined');
    }
    const subscriptionId = this.subscriptionId.split('-');
    // id for subscription
    subscriptionId.pop();
    // filtered section
    subscriptionId.pop();

    return subscriptionId.join('-');
  }

  /**
   * Get the maxAllowedExtractions from the stream user given
   */
  async checkAccountStatus() {
    await this.streamUser.setInfo(true);

    return this.streamUser.maxAllowedExtractions;
  }

  /**
   * Exceutes a promise
   * which will check for the stream status
   * (every amount of time)
   */
  checkDocCountExceeded(maxDocumentsReceived) {
    // eslint-disable-next-line
    const streamDisabledMsg = `OOPS! Looks like you've exceeded the maximum number of documents received for your account (${maxDocumentsReceived}).
      As such, no new documents will be added to your stream's queue.
      However, you won't lose access to any documents that have already been added to the queue.
      These will continue to be streamed to you.
      Contact your account administrator with any questions or to upgrade your account limits.`;
    this.isStreamDisabled()
      .then((isDisabled) => {
        if (isDisabled) {
          // eslint-disable-next-line
          this.logger.log(WARN, streamDisabledMsg);
        }
        setTimeout(
          this.checkDocCountExceeded.bind(this),
          constants.CHECK_EXCEEDED_WAIT_SPACING,
          maxDocumentsReceived,
        );
      })
      .catch((err) => {
        // eslint-disable-next-line
        this.logger.log(ERROR, err);
        setTimeout(
          this.checkDocCountExceeded.bind(this),
          constants.CHECK_EXCEEDED_WAIT_SPACING,
          maxDocumentsReceived,
        );
      });
  }

  /**
   * Check the current job status from the stream being used.
   * It will notify, if the count limit has been reached
   * @return {boolean} - true when the limit has been reached
   * false when there hasn't reached the limit yet.
   */
  async isStreamDisabled() {
    const disabledStatus = 'DOC_COUNT_EXCEEDED';
    const streamId = this.subscriptionIdToStreamId();
    const endpointUrl = `${constants.API_HOST}${constants.API_STREAMS_BASEPATH}/${streamId}`;
    const headers = this.streamUser.getAuthenticationHeaders();
    const response = await helper.apiSendRequest({
      method: 'GET',
      endpointUrl,
      headers,
    });
    const { data } = response;

    return data.data.attributes.job_status === disabledStatus;
  }

  /**
   * Consume messages from a given pubsub
   * the subcription must be valid for a given
   * subcription id and project id.
   * The function detones the checking for account details
   * and if the stream is still being active
   * The callback is expected to process the message
   * from Pubsub in some way
   * @param {function} [callback=defaultCallback] function which processes messages from Pubsub
   * @param {boolean} [ackEnabled=false] - enables/disables acknowledging messages (Reconsume messages)
   * @param {boolean} [userErrorHandling=false] - Priotize to listen potential errors from pubsub
   * @throws {ReferenceError} - when the project id is undefined
   * @throws {ReferenceError} - when the subcription id is undefined
   */
  async listen({
    callback = defaultCallback,
    ackEnabled = false,
    maximumMessages = null,
    batchSize = 10,
  }) {
    this.logger.log(INFO, 'Starting to listen messages');
    if (!this.projectId) {
      this.logger.log(ERROR, 'projectId undefined');
      throw ReferenceError('projectId undefined');
    }
    if (!this.subscriptionId) {
      this.logger.log(ERROR, 'subscriptionId undefined');
      throw ReferenceError('subscriptionId undefined');
    }
    if (!maximumMessages) {
      this.logger.log(ERROR, 'undefined maximum messages to proceed');
      throw ReferenceError('undefined maximum messages to proceed');
    }

    const subscriptionPath = this.pubsubClient.subscriptionPath(
      this.projectId,
      this.subscriptionId,
    );
    const pubsubRequest = {
      subscription: subscriptionPath,
      maxMessages: batchSize,
    };
    this.logger.log(
      DEBUG,
      `Listeners for subscriptions have been set up
      and await message arrival.`,
    );
    while (!maximumMessages || this.messagesCount < maximumMessages) {
      try {
        if (maximumMessages) {
          maximumMessages = Math.min(
            batchSize,
            maximumMessages - this.messagesCount,
          );
          await this.pullMessagesFromPubsub(
            pubsubRequest,
            subscriptionPath,
            callback,
            ackEnabled,
          );
        }
      } catch (e) {
        this.logger.log(
          WARN,
          `Encountered a problem while trying to pull a message from a stream. Error is as follows: ${e}`,
        );
        this.logger.log(
          WARN,
          'Due to the previous error, system will pause 10 seconds. System will then attempt to pull the message from the stream again.',
        );
        await helper.sleep(constants.PUBSUB_MESSAGES_WAIT_SPACING * 1000);
        await this.setPubsubClient();
      }
    }
  }

  /**
   * Pull messages from pubsub and process them by a given callback function
   * @param {function} [callback] function which processes messages from Pubsub
   * @throws {ReferenceError} - when the pubsub subcription undefined
   */
  async pullMessagesFromPubsub(
    pubsubRequest,
    formattedSubscription,
    callback,
    ackEnabled,
  ) {
    const [response] = await this.pubsubClient.pull(pubsubRequest);

    for (const message of response.receivedMessages) {
      const formatMessage = JSON.parse(message.message.data);
      const messageInfo = formatMessage['data'][0]['id'];
      this.logger.log(INFO, `Received news message with ID: ${messageInfo}`);
      const newsMessage = formatMessage['data'][0]['attributes'];

      const callbackResult = callback(newsMessage, this.subscriptionId);
      if (ackEnabled) {
        const ackRequest = {
          subscription: formattedSubscription,
          ackIds: [formatMessage.ack_id],
        };
        this.pubsubClient.acknowledge(ackRequest);
      }
      this.messagesCount += 1;
      if (!callbackResult) {
        return;
      }
      this.logger.log(DEBUG, `Callback returns: ${callbackResult}`);
    }
  }

  /**
   * Set the pubsub client for the Listener instance.
   * get the pubsub subcription from the streamuser being used
   */
  async setPubsubClient() {
    this.pubsubClient = await this.streamUser.getClientSubscription();
  }

  /**
   * Set the project id for the Listener instance.
   * get the credentials from the streamuser being used
   */
  async setProjectId() {
    const streamingCredentials = await this.streamUser.fetchCredentials();
    this.projectId = streamingCredentials.project_id;
  }

  /**
   * Create a new Listener by using an async constructor.
   * This allows to set the project id and pubsub client
   * without expecting a promise
   * @param {object} [params] object which will be used by the Listener constructor
   * @return {Listener} instance class
   */
  static async create(props) {
    const listener = new Listener(props);
    await listener.setPubsubClient();
    await listener.setProjectId();

    return listener;
  }
}

module.exports = Listener;
