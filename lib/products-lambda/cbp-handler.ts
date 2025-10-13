import { Handler, SQSEvent } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { randomUUID } from 'crypto';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME as string;
const stocksTableName = process.env.STOCK_TABLE_NAME as string;
const snsTopicArn = process.env.SNS_TOPIC_ARN as string;
const snsClient = new SNSClient({ region: process.env.AWS_REGION });

export const main: Handler = async (event: SQSEvent) => {
    console.log('Processing SQS batch...');

    try {
        const sendPromises: Promise<any>[] = [];
        const createdIds: string[] = []; // collect created product ids

        for (const record of event.Records) {
            console.log('Message Body:', record.body);

            const parsedBody = JSON.parse(record.body);
            const id = randomUUID();
            let price, title, description, count;

            if (parsedBody) {
                price = parsedBody.price;
                title = parsedBody.title;
                description = parsedBody.description;
                count = parsedBody.count;
            }

            if (!price || !title || !description || !count) {
                throw new Error(
                    'Missing required fields: price, title, and description'
                );
            }

            const addToProductTableCommand = new PutItemCommand({
                TableName: productTableName,
                Item: {
                    id: { S: id },
                    price: { N: price },
                    title: { S: title },
                    description: { S: description },
                },
            });

            sendPromises.push(dynamoDB.send(addToProductTableCommand));

            const addToStockTableCommand = new PutItemCommand({
                TableName: stocksTableName,
                Item: {
                    product_id: { S: id },
                    count: { N: count !== undefined ? count : 0 },
                },
            });

            sendPromises.push(dynamoDB.send(addToStockTableCommand));
            createdIds.push(id);
        }

        const result = await Promise.all(sendPromises);

        console.log(
            'Batch processing succeeded:',
            JSON.stringify(result, null, 2)
        );

        if (snsTopicArn && createdIds.length) {
            const publishCmd = new PublishCommand({
                TopicArn: snsTopicArn,
                Subject: 'Catalog batch processed',
                Message: JSON.stringify({
                    message: 'New products created',
                    productIds: createdIds,
                    count: createdIds.length,
                }),
            });

            try {
                const pubRes = await snsClient.send(publishCmd);
                console.log('SNS publish result:', pubRes);
            } catch (snsErr) {
                console.error('Failed to publish SNS message:', snsErr);
            }
        }

        return { statusCode: 200, body: 'Batch processed succeeded' };
    } catch (error) {
        console.error('Error fetching data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: 'Internal Server Error',
            }),
        };
    }
};
