// eslint-disable-next-line
import { core, helper } from '@factiva/core';

const { constants, StreamUser } = core;
// eslint-disable-next-line
const FIRST_OBJECT = 0;

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
    if (!subscriptionId) {
      try {
        subscriptionIdEnv = helper.loadEnvironmentValue(
          'FACTIVA_STREAM_SUBSCRIPTION_ID',
        );
      } catch (e) {
        throw constants.UNDEFINED_SUBSCRIPTION_ERROR;
      }
    }
    if (!streamUser) {
      throw ReferenceError('Undefined streamUser');
    }
    if (!(streamUser instanceof StreamUser)) {
      throw ReferenceError('streamUser is not instance of StreamUser');
    }

    this.streamUser = streamUser;
    this.subscriptionId = subscriptionId || subscriptionIdEnv;
  }

  /**
   * Get the current stream which the subcription belongs to.
   * this is already given in the constructor(subcriptionId)
   * @throws {ReferenceError} - when there is no stream id specified
   */
  subscriptionIdToStreamId() {
    if (!this.subscriptionId) {
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
    const streamDisabledMsg = 
      `OOPS! Looks like you've exceeded the maximum number of documents received for your account (${maxDocumentsReceived}).
      As such, no new documents will be added to your stream's queue.
      However, you won't lose access to any documents that have already been added to the queue.
      These will continue to be streamed to you.
      Contact your account administrator with any questions or to upgrade your account limits.`;
    this.isStreamDisabled()
      .then((isDisabled) => {
        if (isDisabled) {
          // eslint-disable-next-line
          console.error(streamDisabledMsg);
        }
        setTimeout(
          this.checkDocCountExceeded.bind(this),
          constants.CHECK_EXCEEDED_WAIT_SPACING,
          maxDocumentsReceived,
        );
      })
      .catch((err) => {
        // eslint-disable-next-line
        console.error(err);
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
    userErrorHandling = false,
  }) {
    if (!this.projectId) {
      throw ReferenceError('projectId undefined');
    }
    if (!this.subscriptionId) {
      throw ReferenceError('subscriptionId undefined');
    }

    const subscriptionFullName = `projects/${this.projectId}/subscriptions/${this.subscriptionId}`;
    const onMessageTryCatch = (msg) => {
      try {
        callback(msg);
        if (ackEnabled) msg.ack();
      } catch (err) {
        // eslint-disable-next-line
        console.error(`Error from callback: ${err}\n`);
        if (ackEnabled) msg.nack();
        throw err;
      }
    };

    const onMessageUserHandling = (msg) => {
      callback(msg, (err) => {
        if (err) {
          // eslint-disable-next-line
          console.error(`Error from callback: ${err}`);
          if (ackEnabled) msg.nack();
          throw err;
        } else if (ackEnabled) {
          msg.ack();
        }
      });
    };

    const onMessage = userErrorHandling
      ? onMessageUserHandling
      : onMessageTryCatch;

    // eslint-disable-next-line
    this.pubsubSubscription =
      this.pubsubClient.subscription(subscriptionFullName);

    // eslint-disable-next-line
    console.log(
      `Listeners for subscriptions have been set up
      and await message arrival.`,
    );

    const maxAllowedDocumentExtracts = await this.checkAccountStatus();
    this.checkDocCountExceeded(maxAllowedDocumentExtracts);
    this.pullMessagesFromPubsub(onMessage);
  }

  /**
   * Pull messages from pubsub and process them by a given callback function
   * @param {function} [callback] function which processes messages from Pubsub
   * @throws {ReferenceError} - when the pubsub subcription undefined
   */
  pullMessagesFromPubsub(onMessage) {
    if (!this.pubsubSubscription) {
      throw ReferenceError('pubsub subcription undefined');
    }

    this.pubsubSubscription
      .get()
      .then((data) => {
        const pubsubSub = data[FIRST_OBJECT];
        pubsubSub.on('message', onMessage);
        pubsubSub.on('error', (subErr) => {
          // eslint-disable-next-line
          console.error(`On Subscription Error: ${subErr}`);
          pubsubSub.removeListener('message', onMessage);
          pubsubSub.on('message', onMessage);
        });
      })
      .catch((err) => {
        // eslint-disable-next-line
        console.error(
          `Error retrieving subscription from Google PubSub: ${err}`,
        );
      });
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
