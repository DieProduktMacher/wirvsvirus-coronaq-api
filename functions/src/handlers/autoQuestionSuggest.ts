import * as functions from 'firebase-functions';
import * as _ from 'lodash';
const curl = require('request-promise-native');
import * as cors from 'cors';
const corsHandler = cors({ origin: true });

const autoQuestionSuggestHandler =  async (req: functions.https.Request, res: functions.Response<any>) => {
  return corsHandler(req, res, () => {
    console.log('req.hostname', req.hostname);

    const data = req.body.data;
    console.log('data', data);
    if (!data.terms) return res.status(404).send('');

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
        suggest: {
          text: data.terms,
            questions: {
              completion: {
                field: 'question.de.suggest',
                fuzzy: {
                    fuzziness: 1
                  },
                size: 5
              }
            }
        }
      
        // query: {
        //   bool: {
        //     must: [
        //       {
        //         match: {
        //           'question.de': {
        //             analyzer: 'keyword',
        //             query: data.terms
        //           }
        //         }
        //       }
        //     ]
        //   }
        // },
        // highlight: {
        //   pre_tags: ['<b>'],
        //   post_tags: ['</b>'],
        //   fields: {
        //     'question.de': {
        //       fragment_size: 150,
        //       number_of_fragments: 1
        //     }
        //   }
        // }
      },
      json: true
    };

    console.log('elasticRequest', JSON.stringify(elasticRequest));

    return curl(elasticRequest)
      .then((response: any) => {
        console.log('response', JSON.stringify(response));

        const suggestedQuestions: string[] = response.suggest.questions[0].options.map((entry: any): object => {
          return {
            id: entry._id,
            question: `${entry._source.question['de'].replace('\n', ' ')}`
          };
        });

        return res.send({ data: suggestedQuestions });
      })
      .catch(console.error);
  });
};

export { autoQuestionSuggestHandler };
