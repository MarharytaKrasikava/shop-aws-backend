import { ProductService } from './product-service';

export async function main(event: any) {
    try {
        const { id } = event;
        if (id) {
            const product = ProductService.getProductById(id);
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
