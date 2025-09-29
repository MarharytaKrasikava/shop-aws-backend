import { Handler } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v1 as uuidv1 } from 'uuid';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME as string;
console.log('uuidv1():', uuidv1());

export const addProduct: Handler = async (event, context) => {
    console.log('Event:', event);
    const id = uuidv1();

    try {
        const addToProductTableCommand = new PutItemCommand({
            TableName: productTableName,
            Item: {
                id: { S: id },
                price: { N: event.price },
                title: { S: event.title },
                description: { S: event.description },
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

// {
//     "price": "150",
//     "title": "Product 5",
//     "description": "Description for Product 5"
// }
