import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import { join } from 'path';

export class ProductTableStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        const databaseConfig = this.node.tryGetContext('database');
        const tableName = databaseConfig.products.tableName;

        const productsTable = new Table(this, tableName, {
            tableName: tableName,
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING,
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const addProductLambda = new lambda.Function(this, 'lambda-function', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'product-handler.addProduct',
            code: lambda.Code.fromAsset(join(__dirname, './')),
            environment: {
                PRODUCT_TABLE_NAME: tableName,
            },
        });

        productsTable.grantWriteData(addProductLambda);
    }
}
