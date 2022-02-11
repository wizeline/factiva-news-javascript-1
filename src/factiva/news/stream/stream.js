// eslint-disable-next-line
import { core, helper } from '@factiva/core';

import Subscription from './Subscription';
// eslint-disable-next-line
import { BulkNewsQuery } from '../bulkNews';

const { constants, StreamResponse, StreamUser } = core;

class Stream {
  constructor({
    streamId = null,
    snapshotId = null,
    query = '',
    streamUser = null,
    key = null,
    requestInfo = false,
  } = {}) {
    /**
     * Creates a stream instance for CRUD operations over Factiva Streams
     * and can be optonially used for consuming messages from Pubsub.
     * There can be provided parameters for creating a new Stream or
     * on the other hand instantiate an already existing stream
     * @param {string} [streamId=null] - Indicates if a stream
     * can be created from a given id.
     * @param {string} [snaphotId=null] - Indicates if a stream
     * can be created from a snapshot id. The query used for a
     * snapshot must be in Dataflow SQL query syntax,
     * othwerwise the stream can not be created
     * @param {string} [query=''] - Indicates if a stream
     * can be created from a given query in Dataflow SQL query syntax.
     * @param {object} [streamUser=null] - Indicates the user which is
     * associated the current stream. The user is an instance from streamUser
     * @param {object} [key=null] - Indicates the key to use
     * for create a user. This applies only if there isn't a streamUser
     * @param {boolean} [requestInfo=false] - Indicates if the user
     * needs to load the account details
     */
    this.streamId = streamId;
    this.snapshotId = snapshotId;
    this.query = new BulkNewsQuery(query);
    // eslint-disable-next-line
    this.streamUser =
      streamUser instanceof StreamUser
        ? streamUser
        : new StreamUser(key, requestInfo);
    this.subscriptions = {};

    if (!this.streamUser) throw ReferenceError('Undefined Stream User');
  }

  // eslint-disable-next-line
  get streamUrl() {
    return `${constants.API_HOST}${constants.API_STREAMS_BASEPATH}`;
  }

  /**
   * Returns all the subscriptions available for the stream.
   * The current subscriptions are available in an object
   * The operation consists in returning the subsctions as a List
   * @return {Array} - it can be empty if the stream is in pending process.
   */
  get allSubscriptions() {
    const subscriptions = Object.values(this.subscriptions);

    return subscriptions.map((subscription) => subscription.toString());
  }

  /**
   * Creates all the subscriptions that are available for a given stream
   * There a two cases in which this function is called:
   * During the creation of a stream
   * Or if it exists a stream id
   * @param {object} [data] - response from factiva streams which contains subscriptions.
   */
  async createDefaultSubscription({ data }) {
    const subscriptionsData = data.relationships.subscriptions.data;
    await Promise.all(
      subscriptionsData.map(async (subscription) => {
        const subscriptionObj = new Subscription({
          id: subscription.id,
          streamId: data.id,
          subscriptionType: subscription.type,
        });
        await subscriptionObj.createListener(this.streamUser);
        this.subscriptions[subscriptionObj.id] = subscriptionObj;
      }),
    );
  }

  /**
   * New subcription is created depending on the current state of the
   * Stream instance
   * If there exists a valid stream id inside the instance, is possible
   * to create a new subscription
   * if the limit of 5 subscriptions has been reached is not possible
   * @throws {TypeError} - when the subscription failed to be created.
   */
  async createSubscription() {
    try {
      const newSubscription = new Subscription({ streamId: this.streamId });
      const headers = this.streamUser.getAuthenticationHeaders();
      await newSubscription.create({ headers });

      newSubscription.createListener(this.streamUser);
      this.subscriptions[newSubscription.id] = newSubscription;

      return newSubscription.id;
    } catch (err) {
      throw TypeError(
        `Unexpected error happened while
        creating the subscription: ${err}`,
      );
    }
  }

  /**
   * Delete a subcription based on a given string subcription id
   * The current subscription must exists and
   * must belong to the current stream
   * @param {string} [subscriptionId] - subscription to be deleted.
   * @throws {ReferenceError} - when subsciption id has not been found.
   * @throws {TypeError} - when the subsciption failed to be deleted.
   */
  async deleteSubscription(subscriptionId) {
    if (!this.subscriptions[subscriptionId]) {
      throw constants.INVALID_SUBSCRIPTION_ID_ERROR;
    }

    const headers = this.streamUser.getAuthenticationHeaders();
    try {
      await this.subscriptions[subscriptionId].delete({
        headers,
      });
    } catch (err) {
      throw TypeError(
        `Unexpected error happened while
        deleting the subscription: ${err}`,
      );
    }

    delete this.subscriptions[subscriptionId];

    return true;
  }

  /**
   * This method is only used when the stream id has been passed
   * It is expected that all subscriptions will be loaded
   */
  async setAllSubscriptions() {
    if (!this.streamId) {
      throw constants.UNDEFINED_STREAM_ID_ERROR;
    }

    const endpointUrl = `${this.streamUrl}/${this.streamId}`;
    const headers = this.streamUser.getAuthenticationHeaders();
    const response = await helper.apiSendRequest({
      method: 'GET',
      endpointUrl,
      headers,
    });

    await this.createDefaultSubscription(response.data);
  }

  /**
   * Consume messages from a given subscription, which must
   * be specified and must belong to the current stream.
   * This function allows to pulls messages from pubsub in an async way
   * @param {function} [callback=null] - callback function to called from pubsub
   * every time a new message is pulled.
   * @param {string} [subscriptionId=null] - subscription use for consuming messages.
   * @param {boolean} [ackEnabled=false] - allows messages to be reconsumed or not.
   * @param {boolean} [userErrorHandling] - specifies if the priority is to check for errors.
   * @throws {ReferenceError} - when subsciption id has not been found.
   */
  async consumeMessages({
    callback = null,
    subscriptionId = null,
    ackEnabled = false,
    userErrorHandling = false,
  }) {
    if (!this.subscriptions[subscriptionId]) {
      throw constants.INVALID_SUBSCRIPTION_ID_ERROR;
    }

    this.subscriptions[subscriptionId].consumeMessages({
      callback,
      ackEnabled,
      userErrorHandling,
    });
  }

  /**
   * Get information of all streams from the current stream being used
   * @return {Array.<StreamResponse>} - way for handling every factiva stream response.
   * @throws {ReferenceError} - when stream id has not been found.
   */
  async getAllStreams() {
    const uri = `${this.streamUrl}`;
    const headers = this.streamUser.getAuthenticationHeaders();
    const response = await helper.apiSendRequest({
      method: 'GET',
      endpointUrl: uri,
      headers,
    });
    const { data } = response;
    const streams = [];

    data.data.forEach((stream) => {
      streams.push(
        new StreamResponse({
          ...stream,
          ...(stream.links ? { links: stream.links } : null),
        }),
      );
    });

    return streams;
  }

  /**
   * Get information from the current stream being used
   * The key is that there must be a stream id
   * which is given at the creation of a stream given
   * by the constructor or create method
   * @return {StreamResponse} - way for handling every factiva stream response.
   * @throws {ReferenceError} - when stream id has not been found.
   */
  async getInfo() {
    if (!this.streamId) {
      throw constants.UNDEFINED_STREAM_ID_ERROR;
    }

    const uri = `${this.streamUrl}/${this.streamId}`;
    const headers = this.streamUser.getAuthenticationHeaders();
    const response = await helper.apiSendRequest({
      method: 'GET',
      endpointUrl: uri,
      headers,
    });
    const { data } = response;

    return new StreamResponse({
      ...data.data,
      ...(data.links ? { links: data.links } : null),
    });
  }

  /**
   * Create a new stream based on the query or snapshotId
   * If both exists the priority goes over the snapshotId
   * If none exists there must be an exception
   * @throws {ReferenceError} - when query and snapshotId are not set.
   */
  async create() {
    if (!this.snapshotId && !this.query) {
      throw ReferenceError('Snapshot id and query not found');
    }

    if (this.snapshotId) {
      return this.createBySnapshotId();
    }

    return this.createByQuery();
  }

  /**
   * Create a stream from a given query
   * The query must in Dataflow syntax
   * Otherwise there may be exceptions
   * returned from the Factiva API used
   * @throws {ReferenceError} - when the query is not set.
   */
  async createByQuery() {
    if (!this.query) {
      throw ReferenceError('query undefined');
    }

    const baseQuery = this.query.getBaseQuery();
    const payload = {
      data: {
        attributes: baseQuery.query,
        type: 'stream',
      },
    };

    const headers = this.streamUser.getAuthenticationHeaders();
    headers['Content-Type'] = 'application/json';
    const response = await helper.apiSendRequest({
      method: 'POST',
      endpointUrl: this.streamUrl,
      headers,
      payload,
    });

    this.streamId = await response.data.id;
    await this.createDefaultSubscription(response.data);

    const { data } = response;
    return new StreamResponse({
      ...data.data,
      ...(data.links ? { links: data.links } : null),
    });
  }

  /**
   * Create a stream from a given snapshotId
   * The query from the snapshot
   * must in Dataflow syntax
   * Otherwise there may be exceptions
   * returned from the Factiva API used
   * @throws {ReferenceError} - when the snapshotId is not set.
   */
  async createBySnapshotId() {
    if (!this.snapshotId) {
      throw ReferenceError('snaphotId undefined');
    }

    const headers = this.streamUser.getAuthenticationHeaders();
    headers['Content-Type'] = 'application/json';
    const uri = `${constants.API_HOST}${constants.API_SNAPSHOTS_BASEPATH}/${this.snapshotId}/streams`;
    const response = await helper.apiSendRequest({
      method: 'POST',
      endpointUrl: uri,
      headers,
    });

    this.streamId = await response.data.id;
    await this.createDefaultSubscription(response.data);

    const { data } = response;
    return new StreamResponse({
      ...data.data,
      ...(data.links ? { links: data.links } : null),
    });
  }

  /**
   * Delete a stream from its given streamId
   * There could be potential issues accesing other
   * functions after deleting the stream
   * @throws {ReferenceError} - when the streamId is not set.
   */
  async delete() {
    if (!this.streamId) {
      throw constants.UNDEFINED_STREAM_ID_ERROR;
    }

    const endpointUrl = `${this.streamUrl}/${this.streamId}`;
    const headers = this.streamUser.getAuthenticationHeaders();
    headers['Content-Type'] = 'application/json';
    const response = await helper.apiSendRequest({
      method: 'DELETE',
      endpointUrl,
      headers,
    });

    const { data } = response;

    return new StreamResponse({
      ...data.data,
      ...(data.links ? { links: data.links } : null),
    });
  }

  /**
   * Create a new Stream by using an async constructor.
   * This allows to set all the subcriptions
   * from a Stream with streamId specified
   * @param {object} [props] object which will be used by the Stream constructor
   * @return {Stream} instance class
   */
  static async create(props) {
    const stream = new Stream(props);
    if (stream.streamId) await stream.setAllSubscriptions();

    return stream;
  }
}

module.exports = Stream;
