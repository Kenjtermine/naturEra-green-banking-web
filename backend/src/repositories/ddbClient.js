import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import config from '../configs/config';

// Khởi tạo DynamoDB client
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.awsRegion }));

export default ddbClient;