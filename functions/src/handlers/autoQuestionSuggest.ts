import * as functions from 'firebase-functions';
import * as _ from 'lodash';
const curl = require('request-promise-native');

const autoQuestionSuggestHandler =  async (data: any, context: any) => {  
  if (!data.terms) return 'No search terms defined';

  const elasticConfig = functions.config().elasticsearch;
  const elasticUrl = `${elasticConfig.url}coronaq/_search?size=10`;

  const elasticRequest: any = {
    method: 'GET',
    uri: elasticUrl,
    auth: {
      username: elasticConfig.username,
      password: elasticConfig.password,
    },
    body: {
      query: {
        bool: {
          must: [],
          should: []
        }
      }
    },
    json: true
  };

  elasticRequest.body.query.bool.must.push({
    match: {
      'question.de': {
        analyzer: 'german',
        query: data.terms
      }
    }
  });

  elasticRequest.body.query.bool.should.push({
    match: {
      'answer.de': {
        query: data.terms,
        analyzer: 'german'
      }
    }
  });

  elasticRequest.body.query.bool.should.push({
    match: {
      'tags': {
        query: data.terms
      }
    }
  });

  return curl(elasticRequest)
    .then((response: any) => {
      console.log('response', response.result);
    })
    .catch(console.error);
};

export { autoQuestionSuggestHandler };
