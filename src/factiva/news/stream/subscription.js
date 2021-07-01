// eslint-disable-next-line
import { core, helper } from '@factiva/core';
import Listener from './Listener';

const { constants, StreamUser } = core;

const SUBSCRIPTION_IDX = 0;
class Subscription {
  /**
   * Creates a subcription instance with three kinds of operation:
   * Create Subscrition from stream id
   * Delete Subscription from subscription id
   * Create Listener from stream id and subcription id
   * Can be used as well for consuming messages from Pubsub.
   * @param {string} [id=null] - Indicates if a subcription is
   * already initialized
   * @param {string} [streamId=null] - Indicates the current sream
   * which is being used and which the current subscription belongs to
   * @param {string} [subscriptionType=null] - Indicates the
   * type of subcription (expected to be a string)
   * @throws {ReferenceError} - when there is no stream id specified
   */
  constructor({ id = null, streamId = null, subscriptionType = null } = {}) {
    this.id = id;

    let streamIdEnv;
    if (!streamId) {
      try {
        streamIdEnv = helper.loadEnvironmentValue(
          'FACTIVA_STREAM_SUBSCRIPTION_ID',
        );
      } catch (e) {
        throw constants.UNDEFINED_STREAM_ID_ERROR;
      }
    }
    this.url = `${constants.API_HOST}${constants.API_STREAMS_BASEPATH}`;
    this.streamId = streamId || streamIdEnv;
    this.id = id;
    this.subscriptionType = subscriptionType;
    this.listener = null;
  }

  /**
   * Creates a new subcription based on the
   * stream id already given
   * @param {object} [headers=null] - headers use for the Factiva Streams API
   * for handling subscriptions
   * @return {object} [data] - response from factiva streams which contains
   * a new subscription.
   * @throws {ReferenceError} - when there is an Id (Subscription already created)
   * @throws {ReferenceError} - when there is no any streamId
   */
  async create({ headers = null } = {}) {
    if (this.id) {
      throw ReferenceError('subcription already initialized');
    }
    if (!this.streamId) {
      throw ReferenceError(
        `streamId is not defined, it must be
        defined for creating a subscription`,
      );
    }
    const endpointUrl = `${this.url}/${this.streamId}/subscriptions`;
    const response = await helper.apiSendRequest({
      method: 'POST',
      endpointUrl,
      headers,
    });
    const { data } = response;
    this.id = data.data[SUBSCRIPTION_IDX].id;
    this.subscriptionType = data.data[SUBSCRIPTION_IDX].type;

    return data;
  }

  /**
   * Delete a subcription based on the
   * stream id and subscription id already given
   * @param {object} [headers=null] - headers use for the Factiva Streams API
   * for handling subscriptions
   * @return {boolean} - it returns true if the operation is successful
   * @throws {ReferenceError} - when there is no any id (subscription created)
   */
  async delete({ headers = null }) {
    if (!this.id) {
      throw ReferenceError('undefined subscription');
    }
    const uri = `${this.url}/${this.streamId}/subscriptions/${this.id}`;
    await helper.apiSendRequest({
      method: 'DELETE',
      endpointUrl: uri,
      headers,
    });

    return true;
  }

  /**
   * Create a new listener instance
   * it's required to pass a streamUser for
   * subcribing to a proper Pubsub consumer
   * @param {object} [user] - StreamUser which is passed down to the Listener instance
   * @throws {ReferenceError} - when there isn't any id (subscription created)
   */
  async createListener(user) {
    if (!(user instanceof StreamUser)) {
      throw ReferenceError('user is not a StreamUser instance');
    }

    this.listener = await Listener.create({
      subscriptionId: this.id,
      streamUser: user,
    });
  }

  /**
   * Consume messages from a pubsub instance.
   * The listener for pubsub must be initialized
   * This listener allows to consume messages in an async way
   * @param {function} [callback=null] - function to pass down for consuming new messages from Pubsub
   * @param {boolean} [ackEnabled=false] - enables/disables acknowledging messages
   * (consuming a message again or not)
   * @param {boolean} [userErrorHandling=false] - Priotizes processing errors from Pubsub
   * @throws {ReferenceError} - when the listener isn't initialized yet
   */
  async consumeMessages({
    callback = null,
    ackEnabled = false,
    userErrorHandling = false,
  }) {
    if (!this.listener) {
      throw ReferenceError('uninitialized listener');
    }
    this.listener.listen({
      ...(callback ? { callback } : undefined),
      ackEnabled,
      userErrorHandling,
    });
  }

  /**
   * Representation to return for the current instance
   * @return {string} - object representation for the Subscription instance
   */
  toString() {
    return `Subscription(id=${this.id}, type=${this.subscriptionType})`;
  }
}

module.exports = Subscription;
