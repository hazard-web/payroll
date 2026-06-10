const http = require('http');

function post(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: 5001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    console.log('Registering test user...');
    const reg = await post('/api/auth/register', { email: 'hr@acme.com', password: 'test1234', companyName: 'ACME Ltd' });
    console.log('Register response:', reg.status, reg.body);

    console.log('Attempting login...');
    const login = await post('/api/auth/login', { email: 'hr@acme.com', password: 'test1234' });
    console.log('Login response:', login.status, login.body);
  } catch (err) {
    console.error('Script error:', err.message);
  }
})();
