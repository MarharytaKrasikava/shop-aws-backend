#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ProductsLambdaStack } from '../lib/products-lambda/products-lambda-stack';
import { ProductTableStack } from '../lib/product-table-lambda/product-table-lambda-stack';
import { StockTableStack } from '../lib/stock-table-lambda/stock-table-lambda-stack';

const app = new cdk.App();

new ProductsLambdaStack(app, 'ProductsLambdaStack', {});
new ProductTableStack(app, 'ProductTableStack', {});
new StockTableStack(app, 'StockTableStack', {});
