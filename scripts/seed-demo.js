const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../model/User');
const Book = require('../models/Book');

async function seed() {
    if (!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD.length < 12) {
        throw new Error('Set DEMO_PASSWORD to at least 12 characters before seeding.');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    for (const username of ['demo.reader', 'demo.reserver']) {
        const email = `${username}@libswap.test`;
        await User.updateOne({ email }, { $setOnInsert: {
            username, email, fullName: username === 'demo.reader' ? 'Demo Reader' : 'Demo Reserver',
            passwordHash: await bcrypt.hash(process.env.DEMO_PASSWORD, 12), role: 'student'
        } }, { upsert: true });
    }
    for (const [title, author, genre] of [
        ['The Hobbit', 'J. R. R. Tolkien', 'Fantasy'],
        ['Pride and Prejudice', 'Jane Austen', 'Fiction'],
        ['The Time Machine', 'H. G. Wells', 'Science Fiction']
    ]) {
        await Book.updateOne({ title, author }, { $setOnInsert: { title, author, genre } }, { upsert: true });
    }
    console.log('Demo books and accounts ready. Existing passwords, loans and reservations were preserved.');
    console.log('Accounts: demo.reader@libswap.test and demo.reserver@libswap.test. Password: DEMO_PASSWORD in .env.docker.');
}
seed().catch(error => { console.error(error.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
