import { S3 } from 'aws-sdk';
import csv = require('csv-parser');

export const main: (
    event: any
) => Promise<{ statusCode: number; body: string }> = async (event: any) => {
    const BUCKET_NAME = process.env.BUCKET_NAME;
    console.log('Incoming event:', event);

    // Get the object key from the event
    const record = event.Records?.[0];
    const key = record?.s3?.object?.key;

    if (!key) {
        console.error('No S3 object key found in event');
        return { statusCode: 400, body: 'No S3 object key found in event' };
    }

    const s3 = new S3();

    try {
        // Create a readable stream from S3
        const s3Stream = s3
            .getObject({ Bucket: BUCKET_NAME!, Key: key })
            .createReadStream();

        await new Promise<void>((resolve, reject) => {
            s3Stream
                .pipe(csv())
                .on('data', (data: any) => {
                    console.log('Parsed record:', data);
                })
                .on('end', () => {
                    console.log('CSV parsing completed');
                    resolve();
                })
                .on('error', (err: Error) => {
                    console.error('Error parsing CSV:', err);
                    reject(err);
                });
        });

        return { statusCode: 200, body: 'CSV parsed and logged successfully' };
    } catch (error) {
        console.error('Error processing S3 object:', error);
        return { statusCode: 500, body: 'Error processing S3 object' };
    }
};
