import * as AWS from 'aws-sdk';

const S3 = new AWS.S3();

export const main: (
    event: any
) => Promise<{ statusCode: number; body: string }> = async (event: any) => {
    const BUCKET_NAME = process.env.BUCKET_NAME;
    console.log('Incoming event:', event);

    try {
        // Extract the `fileName` query parameter
        const { fileName } = event;
        if (!fileName) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Missing 'fileName' query parameter",
                }),
            };
        }

        // Define the S3 key pattern
        const key = `uploaded/${fileName}`;

        // Generate a pre-signed URL
        const params = {
            Bucket: BUCKET_NAME,
            Key: key,
            Expires: 60,
            ContentType: 'text/csv',
        };

        const signedUrl = await S3.getSignedUrlPromise('putObject', params);

        return {
            statusCode: 200,
            body: JSON.stringify({ signedUrl }),
        };
    } catch (err) {
        console.error('Error generating signed URL:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to generate signed URL',
                error: err instanceof Error ? err.message : String(err),
            }),
        };
    }
};
