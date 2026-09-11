const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');

require('dotenv').config();

const app = express();

app.use(express.json());

// This lets Express show frontend files from the public folder
app.use(express.static(require('node:path').join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.redirect('/catalogue.html');
});

app.get('/api/student', (req, res) => {
    res.json({ name: 'Ujjain Sri Ganesh', studentId: '226411987' });
});

app.get('/api/health', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) throw new Error('Database disconnected');
        await mongoose.connection.db.admin().command({ ping: 1 }, { timeoutMS: 2000 });
        res.json({ status: 'ok', database: 'connected' });
    } catch {
        res.status(503).json({ status: 'unavailable', database: 'disconnected' });
    }
});

// Authentication routes from the shared project
app.use('/api/auth', authRoutes);

// Catalogue routes for US02
app.use('/api/books', bookRoutes);

async function start() {
    if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
        throw new Error('MONGODB_URI and JWT_SECRET are required. Configure .env for native startup, or use the Docker setup instructions.');
    }
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB');
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
    let stopping = false;
    const stop = () => {
        if (stopping) return;
        stopping = true;
        const timeout = setTimeout(() => process.exit(1), 10000);
        timeout.unref();
        server.close(async () => {
            await mongoose.disconnect();
            clearTimeout(timeout);
        });
    };
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);
}

if (require.main === module) start().catch(error => {
    console.error('Startup failed:', error.message);
    process.exitCode = 1;
});

module.exports = app;
