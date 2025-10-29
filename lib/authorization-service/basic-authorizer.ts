import * as dotenv from 'dotenv';

dotenv.config();

export const main = async (event: any) => {
    console.log('Event: ', event);
    const authHeader = event.authorizationToken;

    //should return 401 HTTP status if Authorization header is not provided
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        throw new Error('Unauthorized: missing auth token'); // API Gateway => 401 (UNAUTHORIZED)
    }

    //should return 403 HTTP status if access is denied for this user
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString(
        'ascii'
    );
    const [username, password] = credentials.split(':');
    const validPassword = process.env[username];

    if (!validPassword || password !== validPassword) {
        return generatePolicy('user', 'Deny', event.methodArn); // API Gateway => 403 (ACCESS_DENIED)
    }

    function generatePolicy(
        principalId: string,
        effect: string,
        resource: string
    ) {
        return {
            principalId: principalId,
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: 'execute-api:Invoke',
                        Effect: effect,
                        Resource: resource,
                    },
                ],
            },
        };
    }

    return generatePolicy('user|a1b2c3d4', 'Allow', event.methodArn); // API Gateway => 403 (ACCESS_DENIED)
};
