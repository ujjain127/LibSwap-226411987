// Run inside the isolated Docker verification stack after seed:demo.
const assert = require('node:assert/strict');
const base = 'http://127.0.0.1:3000';
async function request(path, token, body, method = body ? 'POST' : 'GET') {
    const response = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    return { status: response.status, data: await response.json() };
}
async function run() {
    assert.equal((await request('/api/health')).status, 200);
    assert.deepEqual((await request('/api/student')).data, { name: 'Ujjain Sri Ganesh', studentId: '226411987' });
    for (const page of ['catalogue.html', 'borrowBooks.html', 'returnBooks.html']) {
        const response = await fetch(`${base}/${page}`);
        assert.equal(response.status, 200);
        assert.match(await response.text(), /226411987/);
    }
    const tokens = [];
    for (const email of ['demo.reader@libswap.test', 'demo.reserver@libswap.test']) {
        const login = await request('/api/auth/login', null, { email, password: process.env.DEMO_PASSWORD });
        assert.equal(login.status, 200, 'Demo login failed; seed accounts first.');
        tokens.push(login.data.token);
    }
    const [reader, reserver] = tokens;
    const list = await request('/api/books/circulation', reader);
    const book = list.data.find(book => book.title === 'The Hobbit');
    assert.ok(book, 'Seed the demo books first.');
    const action = (action, token) => request(`/api/books/${book._id}/${action}`, token, {});
    if (process.argv[2] === 'before') {
        assert.equal(book.canBorrow, true, 'Use the isolated verification stack with an available demo book.');
        assert.equal((await action('borrow', reader)).status, 200);
        assert.equal((await action('reserve', reserver)).status, 200);
        assert.equal((await action('return', reserver)).status, 409);
        console.log('PASS: identity, all pages, login, borrow, reserve and return ownership. Restart app and MongoDB, then run the after phase.');
    } else if (process.argv[2] === 'after') {
        assert.equal(book.borrowedByMe, true, 'Loan must survive container restart.');
        const reserved = (await request('/api/books/circulation', reserver)).data.find(item => String(item._id) === String(book._id));
        assert.equal(reserved.reservationPosition, 1, 'Reservation must survive container restart.');
        assert.equal((await action('return', reader)).status, 200);
        assert.equal((await action('borrow', reader)).status, 409, 'Queue priority must block the former borrower.');
        assert.equal((await action('borrow', reserver)).status, 200);
        assert.equal((await action('return', reserver)).status, 200);
        console.log('PASS: loan and reservation survive restart, FIFO priority, reserved borrowing and final return.');
    } else throw new Error('Pass before or after as the test phase.');
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
