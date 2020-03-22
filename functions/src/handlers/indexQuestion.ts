import * as functions from 'firebase-functions';
const curl = require('request-promise-native');

const indexQuestionHandler = (change: any) => {
  const questionData: Question = change.after.data();
  const questionId: String = change.after.id;

  console.log('Indexing question', questionId, questionData);

  const fieldsToIndex = [
    'answer',
    'municipality',
    'countryCode',
    'question',
    'region',
    'sourceTitle',
    'state',
    'tags',
    'topic',
  ];

  const elasticConfig = functions.config().elasticsearch;

  const elasticUrl = `${elasticConfig.url}coronaq/_doc/${questionId}`;

  const elasticMethod = questionData ? 'POST' : 'DELETE';

  const dataToIndex = _.pick(questionData, fieldsToIndex);

  const elasticRequest = {
    method: elasticMethod,
    uri: elasticUrl,
    auth: {
      username: elasticConfig.username,
      password: elasticConfig.password,
    },
    body: dataToIndex,
    json: true
  };

  return curl(elasticRequest)
    .then((response: any) => {
      console.log('response', response.result);
    })
    .catch(console.error);
};

export { indexQuestionHandler };
