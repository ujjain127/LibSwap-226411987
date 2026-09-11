// Shared behaviour for the borrow/reserve and return pages.
const bookList = document.getElementById('bookList');
const message = document.getElementById('message');
const loginForm = document.getElementById('loginForm');
const searchInput = document.getElementById('searchInput');
const returnPage = document.body.dataset.page === 'return';
let token = sessionStorage.getItem('libswapToken') || '';
let books = [];
let busy = false;

function announce(text, error = false) {
    message.textContent = text;
    message.className = error ? 'error' : '';
}

function node(tag, text) {
    const item = document.createElement(tag);
    item.textContent = text;
    return item;
}

function render() {
    document.getElementById('loginSection').hidden = Boolean(token);
    document.getElementById('session').hidden = !token;
    document.getElementById('controls').hidden = !token;
    bookList.replaceChildren();
    if (!token) return;
    const search = searchInput.value.trim().toLowerCase();
    const visible = books.filter(book => (!returnPage || book.borrowedByMe) &&
        `${book.title} ${book.author} ${book.genre || ''}`.toLowerCase().includes(search));
    for (const book of visible) {
        const card = node('article', '');
        card.className = 'book-card';
        card.append(node('h2', book.title), node('p', `Author: ${book.author}`), node('p', `Genre: ${book.genre || 'Not specified'}`));
        const status = book.borrowedByMe ? 'Borrowed by you' : book.available ?
            (book.reservationCount ? 'Held for the first reservation' : 'Available') : 'Unavailable';
        card.append(node('p', `Status: ${status}`));
        if (book.borrowedByMe && book.borrowedAt) card.append(node('p', `Borrowed: ${new Date(book.borrowedAt).toLocaleDateString()}`));
        if (book.reservationPosition) card.append(node('p', `Your reservation position: ${book.reservationPosition}`));
        const action = returnPage ? 'return' : book.canBorrow ? 'borrow' : book.canReserve ? 'reserve' : null;
        if (action) {
            const button = node('button', { borrow: 'Borrow book', return: 'Return book', reserve: 'Reserve book' }[action]);
            button.type = 'button';
            button.disabled = busy;
            button.addEventListener('click', () => changeBook(book._id, action));
            card.append(button);
        } else if (book.borrowedByMe && !returnPage) {
            const link = node('a', 'Go to My Returns');
            link.href = 'returnBooks.html';
            card.append(link);
        }
        bookList.append(card);
    }
    if (!visible.length) bookList.append(node('p', search ? 'No matching books.' : returnPage ? 'You have no borrowed books.' : 'No books in the catalogue yet.'));
}

function setBusy(value) {
    busy = value;
    document.querySelectorAll('button').forEach(button => { button.disabled = value; });
    bookList.setAttribute('aria-busy', String(value));
    render();
}

function clearSession() {
    token = '';
    books = [];
    sessionStorage.removeItem('libswapToken');
    render();
}

async function request(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    const data = await response.json();
    if (response.status === 401) clearSession();
    if (!response.ok) throw new Error(data.message || 'Request failed. Please try again.');
    return data;
}

async function loadBooks() {
    try { books = await request('/api/books/circulation'); }
    catch (error) { books = []; throw error; }
    finally { render(); }
}

async function refresh() {
    if (busy || !token) return;
    setBusy(true);
    announce('Loading books...');
    try { await loadBooks(); announce(''); }
    catch (error) { announce(error.message, true); }
    finally { setBusy(false); }
}

async function changeBook(id, action) {
    if (busy) return;
    setBusy(true);
    try {
        const result = await request(`/api/books/${id}/${action}`, { method: 'POST' });
        announce(result.message);
    } catch (error) { announce(error.message, true); }
    finally {
        if (token) {
            try { await loadBooks(); }
            catch (error) { announce(`Could not refresh the list: ${error.message}`, true); }
        }
        setBusy(false);
    }
}

loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    announce('Signing in...');
    try {
        const data = await request('/api/auth/login', {
            method: 'POST', body: JSON.stringify({
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value
            })
        });
        token = data.token;
        sessionStorage.setItem('libswapToken', token);
        loginForm.reset();
        await loadBooks();
        announce('Signed in successfully.');
    } catch (error) { announce(error.message, true); }
    finally { setBusy(false); }
});

document.getElementById('logoutButton').addEventListener('click', () => { clearSession(); announce('Signed out.'); });
document.getElementById('refreshButton').addEventListener('click', refresh);
searchInput.addEventListener('input', render);
render();
if (token) refresh();
else announce('Sign in to manage your books.');
