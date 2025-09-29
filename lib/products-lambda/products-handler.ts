import { ProductService } from './product-service';

export async function main() {
    return ProductService.getProducts();
}
