import { main as importProductFile } from '../lib/import-service/import-product-file';

describe('importProductFile', () => {
    it('should return 400 error if no fileName query string in the event', () => {
        const event = {};
        const result = importProductFile(event);
        expect(result).resolves.toEqual({
            statusCode: 400,
            body: JSON.stringify({
                message: "Missing 'fileName' query parameter",
            }),
        });
    });

    it('should return 200 and signedUrl if fileName query string is provided', async () => {
        process.env.BUCKET_NAME = 'test-bucket';

        const event = { fileName: 'test.csv' };
        const result = await importProductFile(event);

        expect(result).toHaveProperty('statusCode', 200);
        expect(result).toHaveProperty('body');
    });
});
