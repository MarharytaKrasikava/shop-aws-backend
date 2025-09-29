import { ProductService } from './product-service';

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE as string;
const STOCK_TABLE = process.env.STOCK_TABLE as string;

export const getDbProducts = async () => {
    try {
        // Wait for all category queries to complete
        const productsWithCounts = await ProductService.getProducts(
            PRODUCTS_TABLE,
            STOCK_TABLE
        );

        // Return the combined result
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                data: productsWithCounts,
            }),
        };
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
