import { app } from './app';

/**
 * AWS Lambda Handler for API Gateway HTTP API v2
 * Bridges API Gateway events to Express application
 */
export const handler = async (event: any, context: any) => {
  return new Promise((resolve, reject) => {
    // Inject Cognito JWT claims if present
    const jwtClaims = event.requestContext?.authorizer?.jwt?.claims;
    const httpContext = event.requestContext?.http || {};
    const method = httpContext.method || event.httpMethod || 'GET';
    const path = event.rawPath || event.path || '/';

    // Map headers
    const headers = event.headers || {};
    if (jwtClaims && !headers['authorization']) {
      // Synthesize bearer token from claims
      headers['authorization'] = `Bearer ${Buffer.from(JSON.stringify(jwtClaims)).toString('base64')}`;
    }

    const req: any = {
      method,
      url: path + (event.rawQueryString ? `?${event.rawQueryString}` : ''),
      headers,
      body: event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : (typeof event.body === 'string' ? JSON.parse(event.body) : event.body)) : {},
      query: event.queryStringParameters || {},
    };

    let responseStatusCode = 200;
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Tenant-Id',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    };
    let responseBody = '';

    const res: any = {
      status(code: number) {
        responseStatusCode = code;
        return this;
      },
      setHeader(name: string, value: string) {
        responseHeaders[name] = value;
        return this;
      },
      json(data: any) {
        responseHeaders['Content-Type'] = 'application/json';
        responseBody = JSON.stringify(data);
        resolve({
          statusCode: responseStatusCode,
          headers: responseHeaders,
          body: responseBody,
        });
      },
      send(data: any) {
        responseBody = typeof data === 'string' ? data : JSON.stringify(data);
        resolve({
          statusCode: responseStatusCode,
          headers: responseHeaders,
          body: responseBody,
        });
      },
      end() {
        resolve({
          statusCode: responseStatusCode,
          headers: responseHeaders,
          body: responseBody,
        });
      },
      on() {},
    };

    try {
      (app as any).handle(req, res, (err: any) => {
        if (err) {
          resolve({
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify({ error: err.message }),
          });
        } else {
          resolve({
            statusCode: 404,
            headers: responseHeaders,
            body: JSON.stringify({ error: 'Endpoint Not Found' }),
          });
        }
      });
    } catch (err: any) {
      resolve({
        statusCode: 500,
        headers: responseHeaders,
        body: JSON.stringify({ error: err.message }),
      });
    }
  });
};
