import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Stack, type StackProps, Duration } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import { Construct } from 'constructs';

const INTEGRATION_RESPONCES = [
    {
        statusCode: '200',
        responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Headers':
                "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'",
            'method.response.header.Access-Control-Allow-Methods':
                "'GET,OPTIONS'",
        },
    },
];

const METHOD_RESPONSES = [
    {
        statusCode: '200',
        responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
        },
    },
];

export class ProductsLambdaStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        const databaseConfig = this.node.tryGetContext('database');
        const productsTableName = databaseConfig.products.tableName;
        const stockTableName = databaseConfig.stock.tableName;

        const getProductListLambda = new Function(
            this,
            'getProductListHandler',
            {
                runtime: Runtime.NODEJS_20_X,
                memorySize: 1024,
                timeout: Duration.seconds(5),
                handler: 'products-handler.getDbProducts',
                code: Code.fromAsset(path.join(__dirname, './')),
                environment: {
                    PRODUCTS_TABLE: productsTableName,
                    STOCK_TABLE: stockTableName,
                },
            }
        );

        //grant permissions
        const productTable = Table.fromTableArn(
            this,
            productsTableName,
            'arn:aws:dynamodb:eu-central-1:306503647861:table/ProductsTable'
        );
        const stockTable = Table.fromTableArn(
            this,
            stockTableName,
            'arn:aws:dynamodb:eu-central-1:306503647861:table/StockTable'
        );

        productTable.grantReadData(getProductListLambda);
        stockTable.grantReadData(getProductListLambda);

        const getProductById = new Function(this, 'getProductByIdHandler', {
            runtime: Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: Duration.seconds(5),
            handler: 'product-by-id-handler.main',
            code: Code.fromAsset(path.join(__dirname, './')),
        });

        const api = new RestApi(this, 'product-api', {
            restApiName: 'Product API Gateway',
            description: 'This API serves the Products Lambda functions.',
        });

        const getProductListIntegration = new LambdaIntegration(
            getProductListLambda,
            {
                integrationResponses: INTEGRATION_RESPONCES,
                proxy: false,
            }
        );

        const getProductByIdIntegration = new LambdaIntegration(
            getProductById,
            {
                requestTemplates: {
                    'application/json': `{"id": "$util.escapeJavaScript($input.params().path.id)"}`,
                },
                integrationResponses: INTEGRATION_RESPONCES,
                proxy: false,
            }
        );

        // Create a resource /products and GET request under it
        const productsResource = api.root.addResource('products');
        // On this resource attach a GET method which pass reuest to our Lambda function
        productsResource.addMethod('GET', getProductListIntegration, {
            methodResponses: METHOD_RESPONSES,
        });

        productsResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowMethods: ['GET', 'OPTIONS'],
        });

        // Create a resource /products/{id} and GET request under it
        const singleProductResource = productsResource.addResource('{id}');
        // On this resource attach a GET method which pass request to our Lambda function
        singleProductResource.addMethod('GET', getProductByIdIntegration, {
            methodResponses: METHOD_RESPONSES,
            requestParameters: {
                'method.request.path.id': true,
            },
        });
        singleProductResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowMethods: ['GET', 'OPTIONS'],
        });
    }
}
