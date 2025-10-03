import { Handler } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v1 as uuidv1 } from 'uuid';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME as string;

export const addProduct: Handler = async (event, context) => {
    console.log('Event:', event);
    const id = uuidv1();
    let price, title, description;

    if (event.body) {
        const body = JSON.parse(event.body);
        price = body.price;
        title = body.title;
        description = body.description;
    } else {
        price = event.price;
        title = event.title;
        description = event.description;
    }

    if (!price || !title || !description) {
        return {
            statusCode: 400,
            body: 'Missing required fields: price, title, and description',
        };
    }

    try {
        const addToProductTableCommand = new PutItemCommand({
            TableName: productTableName,
            Item: {
                id: { S: id },
                price: { N: price },
                title: { S: title },
                description: { S: description },
            },
        });

        const addToProductTableResult = await dynamoDB.send(
            addToProductTableCommand
        );

        console.log(
            'PutItem to product table succeeded:',
            JSON.stringify(addToProductTableResult, null, 2)
        );

        return addToProductTableResult;
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Error adding item to DynamoDB table');
    }
};
