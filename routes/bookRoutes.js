const express = require('express');
const router = express.Router();

const { getBooks } = require('../controllers/bookController');
const authMiddleware = require('../middleware/authMiddleware');
const { getCirculation, borrowBook, returnBook, reserveBook } = require('../controllers/circulationController');

// This route gets all books or searches books using ?search=
router.get('/', getBooks);
router.get('/circulation', authMiddleware, getCirculation);
router.post('/:id/borrow', authMiddleware, borrowBook);
router.post('/:id/return', authMiddleware, returnBook);
router.post('/:id/reserve', authMiddleware, reserveBook);

// Exporting the router so server.js can use it
module.exports = router;
