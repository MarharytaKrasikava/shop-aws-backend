#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ProductsLambdaStack } from '../lib/products-lambda/products-lambda-stack';

const app = new cdk.App();

new ProductsLambdaStack(app, 'ProductsLambdaStack', {});
