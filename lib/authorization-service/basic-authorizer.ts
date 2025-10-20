import * as dotenv from 'dotenv';

dotenv.config();

export const main = async (event: any) => {
    console.log('Event: ', event);
    const authHeader = event.authorizationToken;

    //should return 403 HTTP status if access is denied for this user
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Unauthorized' }),
        };
    }

    //should return 401 HTTP status if Authorization header is not provided
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString(
        'ascii'
    );
    const [username, password] = credentials.split(':');
    const validPassword = process.env[username];

    if (!validPassword || password !== validPassword) {
        return {
            statusCode: 403,
            body: JSON.stringify({ message: 'Forbidden' }),
        };
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

    const policy = generatePolicy('user|a1b2c3d4', 'Allow', event.methodArn);

    return policy;
};
