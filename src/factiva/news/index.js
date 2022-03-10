import tools from './tools';
import taxonomy from './taxonomy';
import stream from './stream';
import snapshoots from './snapshot';
import bulkNews from './bulkNews';

module.exports = { tools, ...taxonomy, ...stream, ...snapshoots, ...bulkNews };
