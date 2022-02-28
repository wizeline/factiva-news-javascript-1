# FACTIVA-NEWS

Factiva Javascript Library for Dow Jones Users

## Requirements
- Node v13
- `npm install @factiva/core`

Manual Example:
  
    Download Factiva Core Javascript
    Run `npm link` at the root directory of Factiva Core
    Run `npm link @factiva/core` at the root directory of Factiva News

## Installation
- `npm install @factiva/news`
- `npm run babel`

Example of importing modules:

```js
  const { helper, core } = require('@factiva/core');
  const { Snapshot, SnapshotQuery } = require('../lib/factiva/news/snapshot');
```

## Environment vars
To be able to use Stream Listener options, add the following environment vars depending on your selected listener tool

To use BigQuery Stream Listener

``` bash
export GOOGLE_APPLICATION_CREDENTIALS="/Users/credentials.json"
export BIGQUERY_DATA_SET=dataset
export BIGQUERY_TABLE=table
```

To use MongoDB Stream Listener

``` bash
export MONGODB_CONNECTION_STRING=mongodb://localhost:27017
export MONGODB_DATABASE_NAME=factiva-news
export MONGODB_COLLECTION_NAME=stream-listener  
```

## Snapshots

- Explain
```js
const s = await Snapshot.create(null, false, {
  query: VALID_WHERE_STATEMENT,
});
await s.processExplain();
```

- Analytics
```js
const s = await Snapshot.create(null, false, {
  query: VALID_WHERE_STATEMENT,
});
await s.processAnalytics();
```

- Extraction
```js
const s = await Snapshot.create(VALID_USER_KEY, false, {
  snapshotId: VALID_SNAPSHOT_ID,
});
await s.downloadExtractionFiles();
```

- Update
```js
const uj = new UpdateJob(null, { updateId: VALID_UPDATE_ID });
await uj.getJobResults();
await uj.downloadJobFiles();
```

## Streams

- Create a stream from snapshot id
```js

const stream = new Stream({
  snapshotId: '<snapshotId>',
  apiKey: '<apiKey>',
});

stream.create().then(result => console.log(result));
```

- Create a stream from a query
```js
const stream = new Stream({
  query: "query",
  apiKey: '<apiKey>'
});

stream.create().then(result => console.log(result));
```

- Get info from an existing Stream 
```js
Stream.create({
  streamId: '<streamId>',
  apiKey: '<apiKey>',
})
  .then((stream) => stream.getInfo('<subscriptionId>'))
  .then((subscription) => console.log(subscription));
```

- Delete a stream
```js
const stream = new Stream({
  streamId: '<streamId>',
  apiKey: '<apiKey>'
});

stream.delete().then(result => console.log(result));
```

- Deleting a subscription 
```js
Stream.create({
  streamId: '<streamId>',
  apiKey: '<apiKey>',
})
  .then((stream) => stream.deleteSubscription('<subscriptionId>'))
  .then((subscription) => console.log(subscription));
```

- Creating a subscription 
```js
Stream.create({
  streamId: '<streamId>',
  apiKey: '<apiKey>',
})
  .then((stream) => stream.createSubscription())
  .then((subscription) => console.log(subscription));
```

- Consuming from Pubsub
```js
  Stream.create({
    streamId: '<streamId>',
    apiKey: '<apiKey>',
  })
    .then((stream) => {
      stream.consumeMessages({
        subscriptionId: '<subscriptionId>'
      });
    });
```

## Taxonomies

- Get Categories
```js
  const taxonomy = await Taxonomy.create(VALID_USER_KEY, false);
  const industryCodes = await taxonomy.getCategoryCodes('industries');
```

- Get Company
```js
  const taxonomy = await Taxonomy.create(VALID_USER_KEY);
  const companyData = await taxonomy.getCompany('isin', {
    companyCode: 'PLUNMST00014',
  });
```

- Get Multiple Companies
```js
const taxonomy = await Taxonomy.create(VALID_USER_KEY, false);
const companiesData = await taxonomy.getCompany('isin', {
  companiesCodes: [
    'US0378331005',
    'US0231351067',
    'US5949181045',
    'US4523531083',
  ],
});
```

## Tests

For running active tests
- `npm run test`