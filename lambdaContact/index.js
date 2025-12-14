// index.js

const nodemailer = require('nodemailer');

// --- Environment Variables (Set in AWS Lambda Configuration) ---
// These are loaded securely by the Lambda runtime
const SMTP_HOST = process.env.SMTP_HOST; // e.g., smtp.sendgrid.net
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER; 
const SMTP_PASS = process.env.SMTP_PASS;
const RECEIVING_EMAIL = process.env.RECEIVING_EMAIL; // Your personal/receiving email address
const SENDER_EMAIL = process.env.SENDER_EMAIL; // An email address you control (e.g., contact@yourdomain.com)

// Configure the Nodemailer transport object once outside the handler 
// for efficiency in subsequent calls (Lambda container reuse).
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // Use true if port is 465 (SMTPS)
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    }
});

/**
 * AWS Lambda Handler function.
 * This function will be triggered by AWS API Gateway.
 * @param {object} event - The request event object from API Gateway.
 * @returns {object} - The response object for API Gateway.
 */
exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://YOUR_GITHUB_PAGES_URL.github.io', 
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight request (OPTIONS method)
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    let body;
    try {
        // API Gateway with Lambda Proxy Integration sends the body as a string
        body = JSON.parse(event.body); 
    } catch (e) {
        // Handle malformed JSON request
        return { statusCode: 400, headers, body: JSON.stringify({ message: 'Invalid JSON request format.' }) };
    }

    const { name, email, subject, message } = body;

    // 2. Server-Side Validation
    if (!name || !email || !subject || !message) {
        return { 
            statusCode: 400, 
            headers, 
            body: JSON.stringify({ message: 'Missing required form fields.' }) 
        };
    }
    
    // 3. Construct the Email 
    const mailOptions = {
        // From: MUST be your controlled SENDER_EMAIL to prevent spoofing
        from: `"${name} (Portfolio)" <${SENDER_EMAIL}>`, 
        to: RECEIVING_EMAIL,
        subject: `[Portfolio Contact] ${subject}`,
        // Reply-To: allows you to click reply and send it back to the user's email
        replyTo: email, 
        
        text: `You have a new message from ${name} (${email}):\n\n${message}`,
        html: `
            <h3>New Portfolio Message</h3>
            <p><strong>From:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
        `
    };

    // 4. Send the email
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully from ${email}`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Message sent successfully!' }),
        };
        
    } catch (error) {
        console.error('Error sending email:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Failed to send message.', error: error.message }),
        };
    }
};