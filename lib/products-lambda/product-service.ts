import { products } from './mocks/data';

export class ProductService {
    public static getProducts() {
        return products;
    }

    public static getProductById(id: string) {
        return products.find((product) => product.id === id);
    }
}
