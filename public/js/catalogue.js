// Getting the main page elements
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const bookList = document.getElementById('bookList');
const message = document.getElementById('message');

const genreFilter = document.getElementById('genreFilter');
const availabilityFilter = document.getElementById('availabilityFilter');
const sortSelect = document.getElementById('sortSelect');

// Stores the books returned by the backend
let currentBooks = [];

// Enables or disables the catalogue controls while data is loading
const setLoadingState = (isLoading) => {
    searchButton.disabled = isLoading;
    searchInput.disabled = isLoading;
    genreFilter.disabled = isLoading;
    availabilityFilter.disabled = isLoading;
    sortSelect.disabled = isLoading;

    searchButton.textContent = isLoading ? 'Searching...' : 'Search';
};

// Adds the available genres to the genre dropdown
const updateGenreOptions = (books) => {
    const selectedGenre = genreFilter.value;

    const genres = [
        ...new Set(
            books
                .map((book) => book.genre)
                .filter((genre) => genre)
        )
    ].sort();

    genreFilter.innerHTML = '<option value="">All genres</option>';

    genres.forEach((genre) => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        genreFilter.appendChild(option);
    });

    // Keep the selected genre if it still exists in the new results
    if (genres.includes(selectedGenre)) {
        genreFilter.value = selectedGenre;
    }
};

// Shows the books on the page
const displayBooks = (books) => {
    bookList.innerHTML = '';
    message.textContent = '';

    // If there are no matching books, show a message
    if (books.length === 0) {
        message.textContent = 'No books found.';
        return;
    }

    // Create one card for each book
    books.forEach((book) => {
        const card = document.createElement('div');
        card.classList.add('book-card');

        // Showing the book information
        const heading = document.createElement('h2');
        heading.textContent = book.title;
        card.appendChild(heading);
        for (const [label, value] of [
            ['Author', book.author], ['Genre', book.genre || 'Not specified'],
            ['Availability', book.available ? 'Available' : 'Unavailable']
        ]) {
            const detail = document.createElement('p');
            const title = document.createElement('strong');
            title.textContent = `${label}: `;
            detail.append(title, document.createTextNode(value));
            card.appendChild(detail);
        }

        // Add the card to the page
        bookList.appendChild(card);
    });
};

// Applies the selected filters and sorting
const applyFiltersAndSorting = () => {
    let booksToDisplay = [...currentBooks];

    const selectedGenre = genreFilter.value;
    const selectedAvailability = availabilityFilter.value;
    const selectedSort = sortSelect.value;

    // Filter books by genre
    if (selectedGenre) {
        booksToDisplay = booksToDisplay.filter(
            (book) => book.genre === selectedGenre
        );
    }

    // Filter books by availability
    if (selectedAvailability === 'available') {
        booksToDisplay = booksToDisplay.filter(
            (book) => book.available === true
        );
    }

    if (selectedAvailability === 'unavailable') {
        booksToDisplay = booksToDisplay.filter(
            (book) => book.available === false
        );
    }

    // Sort books using the selected option
    if (selectedSort === 'title-asc') {
        booksToDisplay.sort((a, b) =>
            a.title.localeCompare(b.title)
        );
    }

    if (selectedSort === 'title-desc') {
        booksToDisplay.sort((a, b) =>
            b.title.localeCompare(a.title)
        );
    }

    if (selectedSort === 'author-asc') {
        booksToDisplay.sort((a, b) =>
            a.author.localeCompare(b.author)
        );
    }

    displayBooks(booksToDisplay);
};

// This function loads books from our backend API
const loadBooks = async (searchTerm = '') => {
    try {
        // Show a loading message while we wait for the server
        message.textContent = 'Loading books...';

        // Clear old book results before showing new ones
        bookList.innerHTML = '';

        setLoadingState(true);

        // Build the API URL
        let url = '/api/books';

        // If the user searched for something, add it to the URL
        if (searchTerm) {
            url += `?search=${encodeURIComponent(searchTerm)}`;
        }

        // Ask the backend for the books
        const response = await fetch(url);

        // If the server gives an error, stop here
        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }

        // Convert the response into JavaScript data
        const books = await response.json();

        // Make sure the API returned a list of books
        if (!Array.isArray(books)) {
            throw new Error('Invalid book data received from server');
        }

        currentBooks = books;

        // Add the genres returned by the backend to the filter
        updateGenreOptions(books);

        // Display the books using the selected filters and sorting
        applyFiltersAndSorting();

    } catch (error) {
        // Remove old data so failed requests do not leave stale results
        currentBooks = [];
        bookList.innerHTML = '';

        // Show a simple error message if something goes wrong
        message.textContent = 'Unable to load books. Please try again.';
        console.error(error);

    } finally {
        // Re-enable the controls after the request finishes
        setLoadingState(false);
    }
};

// When the search button is clicked, search using the typed text
searchButton.addEventListener('click', () => {
    const searchTerm = searchInput.value.trim();
    loadBooks(searchTerm);
});

// Also allow the Enter key to search
searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        const searchTerm = searchInput.value.trim();
        loadBooks(searchTerm);
    }
});

// Apply filters whenever a filter option changes
genreFilter.addEventListener('change', applyFiltersAndSorting);
availabilityFilter.addEventListener('change', applyFiltersAndSorting);
sortSelect.addEventListener('change', applyFiltersAndSorting);

// Load all books when the page first opens
loadBooks();
