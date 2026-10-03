"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const app_1 = require("./app");
/**
 * AWS Lambda Handler for API Gateway HTTP API v2
 * Bridges API Gateway events to Express application
 */
const handler = async (event, context) => {
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
        const req = {
            method,
            url: path + (event.rawQueryString ? `?${event.rawQueryString}` : ''),
            headers,
            body: event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : (typeof event.body === 'string' ? JSON.parse(event.body) : event.body)) : {},
            query: event.queryStringParameters || {},
        };
        let responseStatusCode = 200;
        const responseHeaders = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Tenant-Id',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
        };
        let responseBody = '';
        const res = {
            status(code) {
                responseStatusCode = code;
                return this;
            },
            setHeader(name, value) {
                responseHeaders[name] = value;
                return this;
            },
            json(data) {
                responseHeaders['Content-Type'] = 'application/json';
                responseBody = JSON.stringify(data);
                resolve({
                    statusCode: responseStatusCode,
                    headers: responseHeaders,
                    body: responseBody,
                });
            },
            send(data) {
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
            on() { },
        };
        try {
            app_1.app.handle(req, res, (err) => {
                if (err) {
                    resolve({
                        statusCode: 500,
                        headers: responseHeaders,
                        body: JSON.stringify({ error: err.message }),
                    });
                }
                else {
                    resolve({
                        statusCode: 404,
                        headers: responseHeaders,
                        body: JSON.stringify({ error: 'Endpoint Not Found' }),
                    });
                }
            });
        }
        catch (err) {
            resolve({
                statusCode: 500,
                headers: responseHeaders,
                body: JSON.stringify({ error: err.message }),
            });
        }
    });
};
exports.handler = handler;
