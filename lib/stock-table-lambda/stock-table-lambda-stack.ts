import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import { join } from 'path';

export class StockTableStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        const databaseConfig = this.node.tryGetContext('database');
        const tableName = databaseConfig.stock.tableName;

        const stocksTable = new Table(this, tableName, {
            tableName: tableName,
            partitionKey: {
                name: 'product_id',
                type: AttributeType.STRING,
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const addStockLambda = new lambda.Function(this, 'lambda-function', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'stock-handler.addToStock',
            code: lambda.Code.fromAsset(join(__dirname, './')),
            environment: {
                STOCK_TABLE_NAME: tableName,
            },
        });

        stocksTable.grantWriteData(addStockLambda);
        stocksTable.grantReadData(addStockLambda);
    }
}
