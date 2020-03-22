import * as functions from 'firebase-functions';

// Function handlers
import { autoQuestionSuggestHandler } from './handlers/autoQuestionSuggest';
import { importSpreadsheetHandler } from './handlers/importSpreadsheet';
import { indexQuestionHandler } from './handlers/indexQuestion';
import { searchDocumentsHandler } from './handlers/searchDocuments';

const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

/*
 * Receives updated data from firebase collection "questions" and updates elastic
 */
export const indexQuestion = functions.region('europe-west2').firestore.document('questions/{questionId}').onWrite(indexQuestionHandler);

/*
 * Imports data from Google spreadsheet to firebase collection "questions"
 */
export const importSpreadsheet = functions.region('europe-west2').https.onCall(importSpreadsheetHandler(db));

/*
 * Get auto suggest for question queries
 */
export const autoQuestionSuggest = functions.region('europe-west2').https.onCall(autoQuestionSuggestHandler);

/*
 * Listens to new documents in firebase collection "search-queries",
 * gets results from elasticsearch and writes the results back to firebase
 */
// Enable for easier testing
// export const searchDocumentsHandler = functions.region('europe-west2').firestore.document('search-queries/{queryId}').onWrite((change: any) => {
  export const searchDocuments = functions.region('europe-west2').firestore.document('search-queries/{queryId}').onCreate(searchDocumentsHandler(db));
