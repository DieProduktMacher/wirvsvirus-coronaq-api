import * as functions from 'firebase-functions';
import * as _ from 'lodash';
import * as moment from 'moment';
const { GoogleSpreadsheet } = require('google-spreadsheet');

const importSpreadsheetHandler = (db: any) => {
  return async (data: any, context: any) => {  
    const spreadsheetConfig: any = functions.config().spreadsheet;
    const doc = new GoogleSpreadsheet(spreadsheetConfig.import_sheet_id);
    
    await doc.useServiceAccountAuth({
      client_email: spreadsheetConfig.client_email,
      private_key: spreadsheetConfig.private_key.replace(/\\n/g, '\n'),
    });

    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    const questions: Question[] = _.compact(rows.map((row: any, index: number) => {
      return _.pickBy({
        answer: {
          de: row.Antwort.trim(),
        },
        answeredAt: undefined,
        answeredById: '',
        authoredAt: undefined,
        authoredById: '',
        municipality: row['Stadt'].trim() !== 'Alle' ? row['Stadt'].trim() : 'all',
        countryCode: row['Ländercode'].trim(),
        question:  {
          de: row.Frage.trim(),
        },
        region: row['Region'].trim() !== 'Alle' ? row['Region'].trim() : 'all',
        sourceTitle: row['Quelle'].trim(),
        sourceUrl: row['Url'].trim(),
        state: row['Bundesland'].trim() !== 'Alle' ? row['Bundesland'].trim() : 'all',
        subscriberIds: [],
        tags: row['Content Schlagwörter'].trim().split('\n').concat(row['Kategorie']),
        topic: row['Kategorie'],
        validFrom: row['ValidFrom'] ? moment(row['ValidFrom'], 'DD.MM.YYYY').toDate() : undefined,
        validTo: row['ValidTo'] ? moment(row['ValidTo'], 'DD.MM.YYYY').toDate() : undefined
      }, _.identity);
    }));

    return Promise.all(questions.map((question: Question) => {
      return db.collection('questions').add(question);
    }))
      .then(results => {
        console.log('results.length', results.length);
      })
      .catch(console.error);
  }
};

export { importSpreadsheetHandler };
