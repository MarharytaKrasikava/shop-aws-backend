import { Construct } from 'constructs';
import { join } from 'path';
import * as cdk from 'aws-cdk-lib';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { aws_apigateway as apigateway } from 'aws-cdk-lib';
import { aws_secretsmanager as secretsmanager } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as dotenv from 'dotenv';
import { InterfaceVpcEndpointAwsService } from 'aws-cdk-lib/aws-ec2';

dotenv.config();

export class ShopCartRdsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        //Define a PostgreSQL database instance in RDS
        const dbCredentialsSecret = new secretsmanager.Secret(
            this,
            'ShopCartDBCreds',
            {
                secretName: 'ShopCartDBCredsName',
                generateSecretString: {
                    secretStringTemplate: JSON.stringify({
                        username: process.env.DB_USERNAME || 'adminuser',
                    }),
                    excludePunctuation: true,
                    includeSpace: false,
                    generateStringKey: 'password',
                },
            }
        );

        new cdk.CfnOutput(this, 'ShopCartDBCredentialsSecretArn', {
            value: dbCredentialsSecret.secretArn,
            exportName: 'ShopCartDBCredentialsSecretArn',
        });

        // Create a VPC for the RDS instance and Lambda function
        const vpc = new ec2.Vpc(this, 'MyVPC', {
            maxAzs: 2, // Default is all AZs in the region
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'PublicSubnet',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
            ],
        });

        vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
            service: InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        });

        const dbInstance = new rds.DatabaseInstance(
            this,
            'ShopCartDBInstance',
            {
                engine: rds.DatabaseInstanceEngine.postgres({
                    version: rds.PostgresEngineVersion.VER_14,
                }),
                instanceType: ec2.InstanceType.of(
                    ec2.InstanceClass.BURSTABLE3,
                    ec2.InstanceSize.MICRO
                ),
                vpc,
                credentials: rds.Credentials.fromSecret(dbCredentialsSecret),
                databaseName: 'ShopCartDB',
                multiAz: false,
                allocatedStorage: 20,
                maxAllocatedStorage: 100,
                allowMajorVersionUpgrade: false,
                autoMinorVersionUpgrade: true,
                backupRetention: cdk.Duration.days(7),
                deleteAutomatedBackups: true,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                deletionProtection: false,
                publiclyAccessible: true,
                vpcSubnets: {
                    subnetType: ec2.SubnetType.PUBLIC,
                },
            }
        );

        new cdk.CfnOutput(this, 'ShopCartDBInstanceEndpoint', {
            value: dbInstance.dbInstanceEndpointAddress,
        });

        // Create Lambda function to interact with the RDS instance
        const lambdaFunction = new lambdaNodejs.NodejsFunction(
            this,
            'ShopCartLambdaFunction',
            {
                runtime: lambda.Runtime.NODEJS_20_X,
                timeout: cdk.Duration.seconds(180),
                memorySize: 512,
                handler: 'handler',
                entry: join(
                    __dirname,
                    '../../../nodejs-aws-cart-api/dist/main.js'
                ),
                environment: {
                    NODE_ENV: 'AWS_LAMBDA',
                    DB_SECRET_NAME: dbCredentialsSecret.secretName,
                    DB_NAME: 'CartDB',
                    DB_PORT: '5432',
                    DB_HOST: dbInstance.dbInstanceEndpointAddress,
                    NO_COLOR: 'true',
                },
                bundling: {
                    forceDockerBundling: false, // try local esbuild instead of Docker
                    minify: true,
                    sourceMap: true,
                    externalModules: [
                        '@nestjs/microservices',
                        '@nestjs/websockets/socket-module',
                        'class-transformer',
                        'class-validator',
                    ],
                },
                vpc,
                vpcSubnets: {
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                allowPublicSubnet: true, // Confirm that lambda is in VPC
                securityGroups: [dbInstance.connections.securityGroups[0]],
            }
        );

        dbInstance.connections.allowDefaultPortFrom(lambdaFunction);
        dbCredentialsSecret.grantRead(lambdaFunction);

        // API Gateway setup
        const api = new apigateway.RestApi(this, 'ShopCartApi', {
            restApiName: 'Shop Cart Service',
            description: 'This service serves a Shop Cart application.',
        });

        const lambdaIntegration = new apigateway.LambdaIntegration(
            lambdaFunction
        );

        // Add resounces
        const cartResource = api.root.addResource('cart');
        const authResource = api.root.addResource('auth');
        const orderResource = api.root.addResource('order');

        // Cart endpoints
        cartResource.addMethod('GET', lambdaIntegration); // Get cart
        cartResource.addMethod('PUT', lambdaIntegration); // Update cart
        cartResource.addMethod('DELETE', lambdaIntegration); // Clear cart

        // Auth endpoints
        authResource.addMethod('POST', lambdaIntegration); // Login/signup

        // Order endpoints
        orderResource.addMethod('GET', lambdaIntegration); // Get orders
        orderResource.addMethod('POST', lambdaIntegration); // Create order

        // Add OPTIONS method for CORS
        cartResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowMethods: ['GET', 'PUT', 'DELETE', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'Authorization'],
        });

        authResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowMethods: ['POST', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'Authorization'],
        });

        orderResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowMethods: ['GET', 'POST', 'OPTIONS'],
            allowHeaders: ['Content-Type', 'Authorization'],
        });

        api.root.addProxy({
            defaultIntegration: lambdaIntegration,
            anyMethod: true,
        });

        // Output the API URL
        new cdk.CfnOutput(this, 'ApiEndpoint', {
            value: api.url,
            description: 'API Gateway endpoint URL',
        });
    }
}
