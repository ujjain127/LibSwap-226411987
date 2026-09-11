const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'local-circulation-test-secret';
const app = require('../server');
const Book = require('../models/Book');
let server, base;
const dbName = `libswap_test_${Date.now()}_${process.pid}`;

before(async () => {
    await mongoose.connect(process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017', {
        dbName, serverSelectionTimeoutMS: 5000
    });
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

async function request(path, token, body, method = body ? 'POST' : 'GET') {
    const response = await fetch(base + path, {
        method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {})
    });
    return { status: response.status, data: await response.json() };
}

test('real login, borrowing, returns, reservations, legacy records and concurrent requests', async () => {
    const tokens = [];
    for (const username of ['alice', 'bob', 'charlie']) {
        const account = { username, fullName: username, email: `${username}@example.test`, password: 'Test-password-123' };
        assert.equal((await request('/api/auth/register', null, account)).status, 201);
        const login = await request('/api/auth/login', null, account);
        assert.equal(login.status, 200);
        tokens.push(login.data.token);
    }
    const [alice, bob, charlie] = tokens;
    // Insert the original schema shape directly: new circulation fields are absent.
    const { insertedId } = await Book.collection.insertOne({ title: 'Legacy Book', author: 'Test Author', genre: 'Fiction', available: true });
    const path = `/api/books/${insertedId}`;
    const act = (action, token, body = {}) => request(`${path}/${action}`, token, body);
    assert.equal((await act('borrow')).status, 401);
    assert.equal((await act('borrow', 'bad-token')).status, 401);
    const deletedUser = jwt.sign({ userId: new mongoose.Types.ObjectId().toString() }, process.env.JWT_SECRET);
    assert.equal((await act('borrow', deletedUser)).status, 401);
    assert.equal((await request('/api/books/bad-id/borrow', alice, {})).status, 400);
    assert.equal((await request(`/api/books/${new mongoose.Types.ObjectId()}/borrow`, alice, {})).status, 404);
    assert.equal((await act('reserve', bob)).status, 409);
    const race = await Promise.all([act('borrow', alice), act('borrow', bob)]);
    assert.deepEqual(race.map(r => r.status).sort(), [200, 409]);
    const owner = race[0].status === 200 ? alice : bob;
    const next = owner === alice ? bob : alice;
    assert.equal((await act('reserve', owner)).status, 409);
    assert.equal((await act('return', charlie, { userId: jwt.decode(owner).userId })).status, 409);
    const duplicates = await Promise.all([act('reserve', next), act('reserve', next)]);
    assert.deepEqual(duplicates.map(r => r.status).sort(), [200, 409]);
    assert.equal((await act('reserve', charlie)).status, 200);
    const stored = await Book.collection.findOne({ _id: insertedId });
    assert.deepEqual(stored.reservations.map(String), [jwt.decode(next).userId, jwt.decode(charlie).userId]);
    const mine = await request('/api/books/circulation', next);
    assert.equal(mine.data[0].reservationPosition, 1);
    const catalogue = await request('/api/books');
    for (const field of ['borrower', 'borrowedAt', 'reservations']) assert.equal(field in catalogue.data[0], false);
    assert.equal(catalogue.data[0].available, false);
    assert.equal((await act('return', owner)).status, 200);
    assert.equal((await act('return', owner)).status, 409);
    assert.equal((await act('borrow', charlie)).status, 409);
    assert.equal((await act('borrow', owner)).status, 409);
    assert.equal((await act('borrow', next)).status, 200);
    assert.equal((await act('return', next)).status, 200);
    assert.equal((await act('borrow', charlie)).status, 200);
    assert.equal((await act('return', charlie)).status, 200);
    const final = await Book.collection.findOne({ _id: insertedId });
    assert.equal(final.available, true);
    assert.equal(final.borrower, null);
    assert.deepEqual(final.reservations, []);
    for (const page of ['/catalogue.html', '/borrowBooks.html', '/returnBooks.html', '/css/catalogue.css', '/css/circulation.css', '/js/circulation.js']) {
        assert.equal((await fetch(base + page)).status, 200);
    }
});
