import { S3, SQS } from 'aws-sdk';
import csv = require('csv-parser');

export const main: (
    event: any
) => Promise<{ statusCode: number; body: string }> = async (event: any) => {
    const BUCKET_NAME = process.env.BUCKET_NAME;
    const QUEUE_URL = process.env.SQS_URL;

    // Get the object key from the event
    const record = event.Records?.[0];
    const key = record?.s3?.object?.key;

    if (!key) {
        console.error('No S3 object key found in event');
        return { statusCode: 400, body: 'No S3 object key found in event' };
    }

    const s3 = new S3();
    const sqs = new SQS();
    const csvRecords: any[] = [];

    try {
        // Create a readable stream from S3
        const s3Stream = s3
            .getObject({ Bucket: BUCKET_NAME!, Key: key })
            .createReadStream();

        // Pipe the S3 stream to the CSV parser
        await new Promise<void>((resolve, reject) => {
            s3Stream
                .pipe(csv())
                .on('data', (data: any) => {
                    csvRecords.push(data);
                    console.log('Parsed CSV record:', data);
                })
                .on('end', async () => {
                    console.log('CSV parsing completed');

                    const params = {
                        QueueUrl: QUEUE_URL!,
                        Entries: csvRecords.map((record, index) => ({
                            Id: index.toString(),
                            MessageBody: JSON.stringify(record),
                        })),
                    };

                    const res = await sqs.sendMessageBatch(params).promise();

                    if (res.Failed && res.Failed.length > 0) {
                        console.error(
                            'Some messages failed to send:',
                            res.Failed
                        );
                    } else {
                        console.log(
                            `Batch of ${csvRecords.length} messages sent`
                        );
                    }
                    resolve();
                })
                .on('error', (err: Error) => {
                    console.error('Error parsing CSV:', err);
                    reject(err);
                });
        });

        // Move the processed file to the "parsed" folder
        const destinationKey = key.replace('uploaded/', 'parsed/');
        await s3
            .copyObject({
                Bucket: BUCKET_NAME!,
                CopySource: `${BUCKET_NAME}/${key}`,
                Key: destinationKey,
            })
            .promise();
        await s3.deleteObject({ Bucket: BUCKET_NAME!, Key: key }).promise();

        console.log(`File moved to ${destinationKey}`);

        return { statusCode: 200, body: 'CSV parsed and logged successfully' };
    } catch (error) {
        console.error('Error processing S3 object:', error);
        return { statusCode: 500, body: 'Error processing S3 object' };
    }
};
