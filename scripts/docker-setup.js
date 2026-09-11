const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const destination = path.join(__dirname, '..', '.env.docker');
try {
    fs.writeFileSync(destination, [
        'APP_PORT=3000',
        `JWT_SECRET=${crypto.randomBytes(32).toString('hex')}`,
        `DEMO_PASSWORD=${crypto.randomBytes(12).toString('hex')}`,
        ''
    ].join('\n'), { flag: 'wx', mode: 0o600 });
    console.log('Created private .env.docker. Demo account passwords are stored there.');
} catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log('.env.docker already exists; existing settings preserved.');
}
