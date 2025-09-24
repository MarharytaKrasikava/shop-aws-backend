import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Stack, type StackProps, Duration } from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

export class ProductsLambdaStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const getProductList = new Function(this, 'getProductListHandler', {
            runtime: Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: Duration.seconds(5),
            handler: 'products-handler.main',
            code: Code.fromAsset(path.join(__dirname, './')),
        });

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
            getProductList,
            {
                integrationResponses: [{ statusCode: '200' }],
                proxy: false,
            }
        );

        const getProductByIdIntegration = new LambdaIntegration(
            getProductById,
            {
                requestTemplates: {
                    'application/json': `{"id": "$util.escapeJavaScript($input.params().path.id)"}`,
                },
                integrationResponses: [{ statusCode: '200' }],
                proxy: false,
            }
        );

        // Create a resource /products and GET request under it
        const productsResource = api.root.addResource('products');
        // On this resource attach a GET method which pass reuest to our Lambda function
        productsResource.addMethod('GET', getProductListIntegration, {
            methodResponses: [{ statusCode: '200' }],
        });

        productsResource.addCorsPreflight({
            allowOrigins: ['https://d3edbkwqqrzc4j.cloudfront.net'],
            allowMethods: ['GET'],
        });

        // Create a resource /products/{id} and GET request under it
        const singleProductResource = productsResource.addResource('{id}');
        // On this resource attach a GET method which pass request to our Lambda function
        singleProductResource.addMethod('GET', getProductByIdIntegration, {
            methodResponses: [{ statusCode: '200' }],
            requestParameters: {
                'method.request.path.id': true,
            },
        });
        singleProductResource.addCorsPreflight({
            allowOrigins: ['https://d3edbkwqqrzc4j.cloudfront.net'],
            allowMethods: ['GET'],
        });
    }
}
