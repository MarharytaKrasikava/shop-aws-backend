import { DynamoDB } from 'aws-sdk';

export class ProductService {
    public static async getProducts(
        productTableName: string,
        stockTableName: string
    ): Promise<DynamoDB.DocumentClient.ItemList> {
        const dynamoDB = new DynamoDB.DocumentClient();
        const productsResult = await dynamoDB
            .scan({ TableName: productTableName })
            .promise();
        const products =
            productsResult.Items as DynamoDB.DocumentClient.ItemList;

        // Step 2: Fetch counts for each product
        const stockPromises = products.map(async (product) => {
            console.log(product);
            const idResult = await dynamoDB
                .get({
                    TableName: stockTableName,
                    Key: { product_id: product.id },
                })
                .promise();

            // Return the combined result
            return {
                ...product,
                count: idResult.Item ? idResult.Item.count : 'Unknown',
            };
        });

        // Wait for all category queries to complete
        return await Promise.all(stockPromises);
    }

    public static async getProductById(
        id: string,
        productTableName: string,
        stockTableName: string
    ) {
        const dynamoDB = new DynamoDB.DocumentClient();
        const productItemResult = await dynamoDB
            .get({
                TableName: productTableName,
                Key: { id },
            })
            .promise();
        const stockItemResult = await dynamoDB
            .get({
                TableName: stockTableName,
                Key: { product_id: id },
            })
            .promise();
        return {
            ...productItemResult.Item,
            count: stockItemResult.Item
                ? stockItemResult.Item.count
                : 'Unknown',
        };
    }
}
