const https = require('https');

// --- Environment Variables (Set in AWS Lambda Configuration) ---
const SECURE_ENDPOINT_URL = process.env.SECURE_ENDPOINT_URL; 
const SECURE_API_KEY = process.env.SECURE_API_KEY;          
const TARGET_HOST = SECURE_ENDPOINT_URL.split('/')[0];      
const TARGET_PATH = '/default/';                          

// CORS headers for the *new* public API Gateway
const PROXY_HEADERS = {
    'Access-Control-Allow-Origin': 'https://vemmie.github.io', 
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

exports.handler = async (event) => {
    // Handle OPTIONS preflight request
    if (event.httpMethod === 'OPTIONS') {
        return { 
            statusCode: 200, 
            headers: PROXY_HEADERS 
        };
    }
    
    const requestBody = event.body;

    const options = {
        hostname: TARGET_HOST,
        path: TARGET_PATH,
        method: 'POST',
        headers: {
            'X-Api-Key': SECURE_API_KEY, 
            'Content-Type': 'application/json',
            'Content-Length': requestBody ? Buffer.byteLength(requestBody) : 0
        }
    };
    
    // Use a Promise to await the external HTTP request
    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let responseBody = '';

            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                // Return the response from the secure API back to the client
                resolve({
                    statusCode: res.statusCode,
                    headers: PROXY_HEADERS, // Ensure new API Gateway has CORS too
                    body: responseBody,
                });
            });
        });

        req.on('error', (e) => {
            console.error('Proxy Error:', e);
            resolve({
                statusCode: 500,
                headers: PROXY_HEADERS,
                body: JSON.stringify({ message: `Proxy failed to connect: ${e.message}` }),
            });
        });

        // Write the original request body and end the request
        if (requestBody) {
            req.write(requestBody);
        }
        req.end();
    });
};