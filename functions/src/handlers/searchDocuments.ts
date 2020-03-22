import * as functions from 'firebase-functions';
import * as _ from 'lodash';
const curl = require('request-promise-native');

// Enable for easier testing
// export const searchDocumentsHandler = functions.region('europe-west2').firestore.document('search-queries/{queryId}').onWrite((change: any) => {
//   const searchData: SearchQuery = change.after.data();
//   const queryId: String = change.after.id;

const searchDocumentsHandler = (db: any) => {
  return (snapshot: any) => {
    const searchData: SearchQuery = snapshot.data();
    const queryId: String = snapshot.id;

    console.log('Got search query', queryId, searchData);

    if (searchData.results) {
      console.log('Error', 'Query already resolved');
      return '0';
    }

    const elasticConfig = functions.config().elasticsearch;
    if (!searchData) return;

    const elasticUrl = `${elasticConfig.url}coronaq/_search?size=100`;

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

    if (searchData && searchData.query && typeof searchData.query === 'object') {
      const queryFieldKeys: string[] = Object.keys(searchData.query);

      // Handle location input
      if (searchData.query['countryCode'] && searchData.query['countryCode'] !== 'all') {
        elasticRequest.body.query.bool.must.push({
          terms: {
            countryCode: ['all', searchData.query['countryCode']]
          }
        });
      } else {
        elasticRequest.body.query.bool.must.push({
          term: {
            countryCode: 'all'
          }
        });
      }
      
      if (searchData.query['state'] && searchData.query['state'] !== 'all') {
        elasticRequest.body.query.bool.must.push({
          terms: {
            state: ['all', searchData.query['state']]
          }
        });
      } else {
        elasticRequest.body.query.bool.must.push({
          term: {
            state: 'all'
          }
        });
      }

      if (searchData.query['region'] && searchData.query['region'] !== 'all') {
        elasticRequest.body.query.bool.must.push({
          terms: {
            regions: ['all', searchData.query['region']]
          }
        });
      } else {
        elasticRequest.body.query.bool.must.push({
          term: {
            region: 'all'
          }
        });
      }

      if (searchData.query['municipality'] && searchData.query['municipality'] !== 'all') {
        elasticRequest.body.query.bool.must.push({
          terms: {
            municipality: ['all', searchData.query['municipality']]
          }
        });
      } else {
        elasticRequest.body.query.bool.must.push({
          term: {
            municipality: 'all'
          }
        });
      }

      // Handle other query keys
      queryFieldKeys.forEach((key: string) => {
        switch(key) {
          case 'countryCode':
          case 'state':
          case 'region':
          case 'municipality':
          break;

          case 'query':
            elasticRequest.body.query.bool.must.push({
              match: {
                'question.de': {
                  analyzer: 'german',
                  query: searchData.query[key]
                }
              }
            });

            elasticRequest.body.query.bool.should.push({
              match: {
                'answer.de': {
                  query: searchData.query[key],
                  analyzer: 'german'
                }
              }
            });

            elasticRequest.body.query.bool.should.push({
              match: {
                'tags': {
                  query: searchData.query[key]
                }
              }
            });
          break;

          case 'tags':
            const tags: string[] = searchData.query[key];

            tags.forEach((tag: string) => {
              elasticRequest.body.query.bool.should.push({ match: { 'tags.de': { query: tag } } });
            });
          break;

          default:
            const subQuery: SubQuery = { match: {} };

            if (subQuery.match) {
              subQuery.match[key] = searchData.query[key];
              elasticRequest.body.query.bool.must.push(subQuery);
            }
          break;
        }
      });
    }

    // Cleanup request object
    if (elasticRequest.body.query.bool.must.length === 0) {
      delete elasticRequest.body.query.bool.must;
    }

    if (elasticRequest.body.query.bool.should.length === 0) {
      delete elasticRequest.body.query.bool.should;
    }

    // Get Documents from FireStore
    async function getQuestionData(questionId: string) {
      return db.collection('questions').doc(questionId).get();
    }

    let elasticHits: any[] = [];

    return curl(elasticRequest)
      .then((response: any) => {
        const doc = db.collection('search-queries').doc(queryId);

        elasticHits = response.hits.hits;

        return Promise.all(response.hits.hits.map(async (hit: any) => {
          return getQuestionData(hit._id);
        }))
          .then((responses: any) => {
            const questions = responses.map((hit: any) => {
              const questionId: string = hit.id;
              const question: Question = hit.data();

              const elasticHit: any = elasticHits.filter((tmpHit: any) => {
                return tmpHit._id === questionId;
              });

              return {
                data: question,
                ref: db.collection('question').doc(questionId),
                meta: (elasticHit && elasticHit.length) ? {
                  score: elasticHit[0] && elasticHit[0]._score ? elasticHit[0]._score : 1
                } : null
              };
            });

            return doc.set(
              {
                results: questions ? questions : [],
              },
              {
                merge: true,
              }
            );
          });
      })
      .catch(console.error);
  }
};

export { searchDocumentsHandler };
