const KVBucketName = 'CSP';

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
  async scheduled(event, env, ctx) {
    return handleEmails(event,env);
  },

};

async function handleRequest(request, env) {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405 })
  }

  // Prepare email subject
  const body = await request.json();
  const cspReport = body['csp-report'];
  const jsonData = JSON.stringify(cspReport, null, 2);
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(jsonData));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const key = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const existingValue = await env[KVBucketName].get(key);
  if (existingValue) {
    return new Response( null, { status: 202 })
  }

  await env[KVBucketName].put(key, jsonData)

  return new Response(null, { status: 201 })
}

async function handleEmails(request, env) {
  try {
    const violations = await env[KVBucketName].list();
    let kvPairs = {};
    for (const violation of violations.keys) {
      const value = await env[KVBucketName].get(violation.name);
      if (value) {
        kvPairs[violation.name] = JSON.parse(value);
        await env[KVBucketName].delete(violation.name);
      }
    }
    if (Object.keys(kvPairs).length > 0) {
      let formattedKVPairs = JSON.stringify(kvPairs, null, 2);
      const message = `
        <html>
          <body>
            <p>The following Content-Security-Policy violation occurred:</p>
            <pre>${formattedKVPairs}</pre>
          </body>
        </html>
      `;
      const EMAIL_SUBJECT = 'Content-Security-Policy Violation'; // Define the email subject
      await sendEmail(EMAIL_SUBJECT, message, env);
    }
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
  return new Response(null, { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

async function sendEmail(subject, bodyHtml, env) {
  // Generate a unique boundary string using a UUID
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

  // Create the multipart body
  let body = `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="from"\r\n\r\n${env.FROM_EMAIL_ADDRESS}\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="to"\r\n\r\n${env.TO_EMAIL_ADDRESS}\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="subject"\r\n\r\n${subject}\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="html"\r\n\r\n${bodyHtml}\r\n`;
  body += `--${boundary}--\r\n`;

  const response = await fetch(`https://api.mailgun.net/v3/${env.MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: body
  });

  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.status} ${response.statusText}`);
  }
}