const mongoose = require('mongoose');
const Book = require('../models/Book');
const User = require('../model/User');

// Only expose the signed-in user's loan and queue position, not other users' IDs.
const bookView = (book, userId) => {
    const queue = book.reservations || [];
    const position = queue.findIndex(id => String(id) === String(userId));
    const borrowedByMe = String(book.borrower) === String(userId);
    return {
        _id: book._id, title: book.title, author: book.author, genre: book.genre,
        available: book.available, borrowedByMe,
        borrowedAt: borrowedByMe ? book.borrowedAt : null,
        reservationPosition: position < 0 ? null : position + 1,
        reservationCount: queue.length,
        canBorrow: book.available && !book.borrower && (!queue.length || position === 0),
        canReserve: !book.available && !borrowedByMe && position < 0
    };
};

const getUserId = async (req, res) => {
    const id = req.user?.userId;
    if (!mongoose.isObjectIdOrHexString(id) || !await User.exists({ _id: id })) {
        res.status(401).json({ message: 'Please sign in with an existing account.' });
        return null;
    }
    return new mongoose.Types.ObjectId(id);
};

const getCirculation = async (req, res) => {
    try {
        const userId = await getUserId(req, res);
        if (!userId) return;
        const books = await Book.find().select('+borrower +borrowedAt +reservations').sort({ title: 1, _id: 1 }).lean();
        res.json(books.map(book => bookView(book, userId)));
    } catch (error) {
        console.error('Circulation lookup failed:', error.message);
        res.status(500).json({ message: 'Unable to load books. Please try again.' });
    }
};

const changeBook = action => async (req, res) => {
    try {
        const userId = await getUserId(req, res);
        if (!userId) return;
        if (!mongoose.isObjectIdOrHexString(req.params.id)) {
            return res.status(400).json({ message: 'Invalid book ID.' });
        }
        let filter;
        let update;
        if (action === 'borrow') {
            filter = { _id: req.params.id, available: true, borrower: null, $or: [
                { reservations: { $exists: false } },
                { reservations: { $size: 0 } },
                { 'reservations.0': userId }
            ] };
            update = { $set: { available: false, borrower: userId, borrowedAt: new Date() }, $pull: { reservations: userId } };
        } else if (action === 'return') {
            filter = { _id: req.params.id, available: false, borrower: userId };
            update = { $set: { available: true, borrower: null, borrowedAt: null } };
        } else {
            filter = { _id: req.params.id, available: false, borrower: { $ne: userId }, reservations: { $ne: userId } };
            update = { $push: { reservations: userId } };
        }
        // A conditional single-document update prevents double loans and duplicate reservations.
        const book = await Book.findOneAndUpdate(filter, update, { returnDocument: 'after', runValidators: true })
            .select('+borrower +borrowedAt +reservations').lean();
        if (!book) {
            if (!await Book.exists({ _id: req.params.id })) return res.status(404).json({ message: 'Book not found.' });
            const messages = {
                borrow: 'This book is on loan or held for the first person in the reservation queue.',
                return: 'You can only return a book you are currently borrowing.',
                reserve: 'You can only reserve an unavailable book once, and cannot reserve your own loan.'
            };
            return res.status(409).json({ message: messages[action] });
        }
        const messages = { borrow: 'Book borrowed successfully.', return: 'Book returned successfully.', reserve: 'Reservation saved successfully.' };
        res.json({ message: messages[action], book: bookView(book, userId) });
    } catch (error) {
        console.error('Circulation update failed:', error.message);
        res.status(500).json({ message: 'Unable to update this book. Please try again.' });
    }
};

module.exports = { getCirculation, borrowBook: changeBook('borrow'), returnBook: changeBook('return'), reserveBook: changeBook('reserve') };
