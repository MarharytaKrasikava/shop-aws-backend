import { ProductService } from './product-service';

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE as string;
const STOCK_TABLE = process.env.STOCK_TABLE as string;

export async function main(event: any) {
    try {
        const { id } = event;
        if (id) {
            const product = ProductService.getProductById(
                id,
                PRODUCTS_TABLE,
                STOCK_TABLE
            );
            if (product) {
                return product;
            } else {
                return { message: 'Product not found' };
            }
        } else {
            return {
                message: `id is missing in the event. Event: ${JSON.stringify(
                    event
                )}`,
            };
        }
    } catch (error) {
        return { message: event, error };
    }
}
