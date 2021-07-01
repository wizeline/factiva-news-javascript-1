// eslint-disable-next-line
import { core } from '@factiva/core';

const { UserKey } = core;

/**
 * Class that serves as a base for the diferent classes representing
 * actions with bulk news such as Snapshot and Stream
 * This class is not to be instantiated directly.
 */
class BulkNewsBase {
  /**
   * @param {string|UserKey} [userKey=undefined] - String
   * containing the 32-character long Api Key or a UserKey instance.
   * If not provided, the constructor will try to obtain its value
   * from the FACTIVA_APIKEY environment variable.
   * @param {boolean} [requestInfo=false] - Indicates if user data has
   * to be pulled from the server. This operation fills account detail
   * properties along with maximum, used and remaining values.
   * It may take several seconds to complete.
   */
  constructor(userKey) {
    this.userKey = new UserKey(userKey);
  }
}

module.exports = BulkNewsBase;
