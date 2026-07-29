import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const tableName = process.env.TABLE_NAME || 'NaturEraGreenBankingTable';
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-southeast-2';
const demoUserId = process.env.DEMO_USER_ID || 'demo-user-001';
const demoCardId = process.env.DEMO_CARD_ID || 'card_001';
const now = new Date().toISOString();
const yyyyMM = now.slice(0, 7);

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

const seedItems = [
    {
        PK: 'CONFIG#CO2_RULES',
        SK: 'CURRENT',
        EntityType: 'CONFIG',
        rules: {
            default: 0.0001,
            '5411': 0.00005,
            '5812': 0.0001,
            '5814': 0.00012,
            '4111': 0.00008,
            '4900': 0.00018,
            '5541': 0.00035,
            '3000': 0.001,
        },
        updatedAt: now,
        updatedBy: 'seed-script',
    },
    {
        PK: 'CONFIG#MCC_MAPPING',
        SK: 'CURRENT',
        EntityType: 'CONFIG',
        mapping: {
            default: 'Other',
            '5411': 'Groceries',
            '5812': 'Restaurants',
            '5814': 'Coffee and fast food',
            '4111': 'Public transport',
            '4900': 'Utilities',
            '5541': 'Fuel',
            '3000': 'Flights',
        },
        updatedAt: now,
        updatedBy: 'seed-script',
    },
    {
        PK: `USER#${demoUserId}`,
        SK: 'PROFILE',
        EntityType: 'PROFILE',
        userId: demoUserId,
        fullName: 'NaturEra Demo User',
        email: 'demo@naturera.local',
        balance: 10000000,
        currency: 'VND',
        createdAt: now,
        updatedAt: now,
    },
    {
        PK: `USER#${demoUserId}`,
        SK: `CARD#${demoCardId}`,
        EntityType: 'CARD',
        userId: demoUserId,
        cardId: demoCardId,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
    },
    {
        PK: `USER#${demoUserId}`,
        SK: `STAT#${yyyyMM}`,
        EntityType: 'MONTHLY_STAT',
        StatMonth: `STAT#${yyyyMM}`,
        totalCo2Kg: 0,
        rewardedThisMonth: 'false',
        createdAt: now,
        updatedAt: now,
    },
];

async function putItem(item) {
    await ddb.send(new PutCommand({
        TableName: tableName,
        Item: item,
    }));
    console.log(`Seeded ${item.PK} ${item.SK}`);
}

async function main() {
    console.log(`Seeding ${seedItems.length} items into ${tableName} (${region})`);
    for (const item of seedItems) {
        await putItem(item);
    }
    console.log(`Done. Demo user: ${demoUserId}, card: ${demoCardId}, balance: 10000000 VND`);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (currentFile === invokedFile) {
    main().catch((err) => {
        console.error('Seed failed:', err);
        process.exitCode = 1;
    });
}

export { main, seedItems };
