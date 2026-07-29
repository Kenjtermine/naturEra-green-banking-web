import * as fs from 'node:fs';
import * as path from 'node:path';
import * as lambda from './src/functions/transaction-interceptor/Lambda.js';

const mockDataPath = path.resolve('./src/functions/transaction-interceptor/mock-request.json');
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

async function runTest() {
  const event = { body: JSON.stringify(mockData) };
  const result = await lambda.handler(event);
  console.log(JSON.parse(result.body));
}

runTest();