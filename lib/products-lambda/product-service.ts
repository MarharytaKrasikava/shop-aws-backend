import { DynamoDB } from 'aws-sdk';
import { products } from './mocks/data';

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
        const idPromises = products.map(async (product) => {
            console.log(product);
            const idResult = await dynamoDB
                .get({
                    TableName: stockTableName,
                    Key: { product_id: product.id },
                })
                .promise();

            return {
                ...product,
                count: idResult.Item ? idResult.Item.count : 'Unknown',
            };
        });

        // Wait for all category queries to complete
        return await Promise.all(idPromises);
    }

    public static getProductById(id: string) {
        return products.find((product) => product.id === id);
    }
}
