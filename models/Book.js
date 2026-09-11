const mongoose = require('mongoose');

// This schema explains what information we want to store for each library book
const bookSchema = new mongoose.Schema(
    {
        // Book title is required
        title: {
            type: String,
            required: true,
            trim: true
        },

        // Author name is also required
        author: {
            type: String,
            required: true,
            trim: true
        },

        // Genre is optional, but useful for searching later
        genre: {
            type: String,
            trim: true
        },

        // This tells us if the book is currently available to borrow
        available: {
            type: Boolean,
            default: true
        },

        // Keep the loan and queue in one document so changes are atomic.
        borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, select: false },
        borrowedAt: { type: Date, default: null, select: false },
        reservations: { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [], select: false }
    },
    {
        // MongoDB will automatically save createdAt and updatedAt
        timestamps: true
    }
);

// Exporting the Book model so other files can use it
module.exports = mongoose.model('Book', bookSchema);
