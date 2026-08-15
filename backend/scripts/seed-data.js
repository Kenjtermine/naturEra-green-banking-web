import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const tableName = process.env.TABLE_NAME || 'NaturEraGreenBankingTable';
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-southeast-2';
const demoUserId = process.env.USER_ID || process.env.DEMO_USER_ID || 'demo-user-001';
const demoCardId = process.env.CARD_ID || process.env.DEMO_CARD_ID || generateSeededId(demoUserId, 8);
const demoBalance = Number(process.env.BALANCE || process.env.DEMO_BALANCE || 10000000);
const now = new Date().toISOString();
const yyyyMM = now.slice(0, 7);

if (!Number.isInteger(demoBalance) || demoBalance < 0) {
    throw new Error('BALANCE/DEMO_BALANCE must be a non-negative integer in VND');
}

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

const configItems = [
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
];

const cardItem = {
    PK: `USER#${demoUserId}`,
    SK: `CARD#${demoCardId}`,
    EntityType: 'CARD',
    userId: demoUserId,
    cardId: demoCardId,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
};

const statItem = {
    PK: `USER#${demoUserId}`,
    SK: `STAT#${yyyyMM}`,
    EntityType: 'MONTHLY_STAT',
    StatMonth: `STAT#${yyyyMM}`,
    totalCo2Kg: 0,
    rewardedThisMonth: 'false',
    createdAt: now,
    updatedAt: now,
};

async function putConfig(item) {
    await ddb.send(new PutCommand({
        TableName: tableName,
        Item: item,
    }));
    console.log(`Seeded ${item.PK} ${item.SK}`);
}

async function upsertFundedProfile() {
    await ddb.send(new UpdateCommand({
        TableName: tableName,
        Key: { PK: `USER#${demoUserId}`, SK: 'PROFILE' },
        UpdateExpression: [
            'SET EntityType = if_not_exists(EntityType, :entityType)',
            'userId = if_not_exists(userId, :userId)',
            'fullName = if_not_exists(fullName, :fullName)',
            'email = if_not_exists(email, :email)',
            'balance = :balance',
            '#currency = :currency',
            'createdAt = if_not_exists(createdAt, :now)',
            'updatedAt = :now',
        ].join(', '),
        ExpressionAttributeNames: {
            '#currency': 'currency',
        },
        ExpressionAttributeValues: {
            ':entityType': 'PROFILE',
            ':userId': demoUserId,
            ':fullName': 'NaturEra Demo User',
            ':email': 'demo@naturera.local',
            ':balance': demoBalance,
            ':currency': 'VND',
            ':now': now,
        },
    }));
    console.log(`Funded USER#${demoUserId} PROFILE with ${demoBalance} VND`);
}

async function putItem(item) {
    await ddb.send(new PutCommand({
        TableName: tableName,
        Item: item,
    }));
    console.log(`Seeded ${item.PK} ${item.SK}`);
}

async function main() {
    console.log(`Seeding demo data into ${tableName} (${region})`);

    for (const item of configItems) {
        await putConfig(item);
    }

    await upsertFundedProfile();
    await putItem(cardItem);
    await putItem(statItem);

    console.log(`Done. User: ${demoUserId}, card: ${demoCardId}, balance: ${demoBalance} VND`);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (currentFile === invokedFile) {
    main().catch((err) => {
        console.error('Seed failed:', err);
        process.exitCode = 1;
    });
}

function generateSeededId(seed, length = 8) {
    return createHash('sha256').update(seed).digest('hex').substring(0, length);
}

export { main, configItems, cardItem, statItem };
