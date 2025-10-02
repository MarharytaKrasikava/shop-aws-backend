import { Handler } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const stocksTableName = process.env.STOCK_TABLE_NAME as string;

export const addToStock: Handler = async (event) => {
    console.log('Event:', event);

    try {
        const addToStockTableCommand = new PutItemCommand({
            TableName: stocksTableName,
            Item: {
                product_id: { S: event.id },
                count: { N: event.count !== undefined ? event.count : 0 },
            },
        });
        const addToStockTableResult = await dynamoDB.send(
            addToStockTableCommand
        );

        console.log(
            'PutItem to stock table succeeded:',
            JSON.stringify(addToStockTableResult, null, 2)
        );

        return addToStockTableResult;
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
