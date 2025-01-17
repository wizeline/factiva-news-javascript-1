const COLUMN_NAMES = [
  'action',
  'an',
  'art',
  'body',
  'byline',
  'company_codes',
  'company_codes_about',
  'company_codes_about_ticker_exchange',
  'company_codes_association',
  'company_codes_association_ticker_exchange',
  'company_codes_lineage',
  'company_codes_lineage_ticker_exchange',
  'company_codes_occur',
  'company_codes_occur_ticker_exchange',
  'company_codes_relevance',
  'company_codes_relevance_ticker_exchange',
  'company_codes_ticker_exchange',
  'copyright',
  'credit',
  'currency_codes',
  'delivery_datetime',
  'document_type',
  'industry_codes',
  'ingestion_datetime',
  'language_code',
  'market_index_codes',
  'modification_date',
  'modification_datetime',
  'person_codes',
  'publication_date',
  'publication_datetime',
  'publisher_name',
  'region_codes',
  'region_of_origin',
  'section',
  'snippet',
  'source_code',
  'source_name',
  'subject_codes',
  'title',
  'word_count',
];

const formatMessageToResponseSchema = (message) =>
  Object.keys(message)
    .filter((key) => COLUMN_NAMES.includes(key))
    .reduce((obj, key) => {
      obj[key] = message[key];
      return obj;
    }, {});

module.exports = { formatMessageToResponseSchema };
