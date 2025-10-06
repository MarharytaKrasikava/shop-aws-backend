import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { join } from 'path';
import {
    INTEGRATION_RESPONCES,
    METHOD_RESPONSES,
} from '../constants/responces';

export class ImportServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Task 5.1 Create S3 bucket
        const bucket = new s3.Bucket(this, 'ProductImportBucket', {
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // Note: only use DESTROY for development
        });

        new BucketDeployment(this, 'UploadFolderDeployment', {
            destinationBucket: bucket,
            destinationKeyPrefix: 'uploaded/',
            sources: [Source.data('placeholder.txt', 'abc')],
        });

        // Task 5.2 Lambda function to generate pre-signed URLs
        const importProductFileLambda = new lambda.Function(
            this,
            'importProductFile',
            {
                runtime: lambda.Runtime.NODEJS_20_X,
                memorySize: 1024,
                timeout: cdk.Duration.seconds(5),
                handler: 'import-product-file.main',
                code: lambda.Code.fromAsset(join(__dirname, './')),
                environment: {
                    BUCKET_NAME: bucket.bucketName,
                },
            }
        );

        // Grant S3 permissions to the Lambda function
        bucket.grantReadWrite(importProductFileLambda);

        const api = new RestApi(this, 'import-api', {
            restApiName: 'Product Import API Gateway',
            description: 'This API serves the Import Lambda functions',
        });

        // Integration for the importProductFileLambda
        const importIntegration = new LambdaIntegration(
            importProductFileLambda,
            {
                requestTemplates: {
                    'application/json': `{ "fileName": "$input.params('fileName')" }`,
                },
                integrationResponses: INTEGRATION_RESPONCES,
                proxy: false,
            }
        );

        const importResource = api.root.addResource('import');

        importResource.addMethod('GET', importIntegration, {
            methodResponses: METHOD_RESPONSES,
        });

        // Task 5.3 Lambda function to parse CSV files from S3
        const importFileParserLambda = new lambda.Function(
            this,
            'importFileParser',
            {
                runtime: lambda.Runtime.NODEJS_20_X,
                memorySize: 1024,
                timeout: cdk.Duration.seconds(5),
                handler: 'import-file-parser.main',
                code: lambda.Code.fromAsset(join(__dirname, './')),
                environment: {
                    BUCKET_NAME: bucket.bucketName,
                },
            }
        );

        // Grant S3 permissions to the Lambda function
        bucket.grantRead(importFileParserLambda);

        bucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new LambdaDestination(importFileParserLambda),
            { prefix: 'uploaded/' }
        );
    }
}
