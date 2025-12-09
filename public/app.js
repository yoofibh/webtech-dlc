// FRONTEND APP.JS
// My single-page logic for the Digital Library Catalogue.
// Handles: auth, books UI, filters, borrow/return, admin panel.


// Base API endpoint

const API_BASE_URL = '/api';

// Track logged-in user + token
let authToken = localStorage.getItem('token') || null;
let currentUser = null;

// Try loading stored user
try {
  currentUser = JSON.parse(localStorage.getItem('user'));
} catch {
  currentUser = null;
}

// FLASH MESSAGES (simple feedback UI)

const flashEl = document.getElementById('flash-message');

function showFlash(message, type = 'success') {
  if (!flashEl) return;

  flashEl.textContent = message;
  flashEl.classList.remove('flash-success', 'flash-error');
  flashEl.classList.add(type === 'error' ? 'flash-error' : 'flash-success');
  flashEl.style.display = 'block';

  setTimeout(() => {
    flashEl.style.display = 'none';
  }, 3500);
}

// VIEW SWITCHING (SPA logic)

const views = {
  login: document.getElementById('view-login'),
  register: document.getElementById('view-register'),
  books: document.getElementById('view-books'),
  admin: document.getElementById('view-admin'),
};

// Show only one view at a time
function showView(name) {
  Object.keys(views).forEach((v) => {
    if (views[v]) {
      views[v].style.display = v === name ? 'block' : 'none';
    }
  });
}

// NAVIGATION STATE (shows/hides nav buttons)

const navAdmin = document.getElementById('nav-admin');
const navLogin = document.getElementById('nav-login');
const navRegister = document.getElementById('nav-register');
const navLogout = document.getElementById('nav-logout');

function updateNav() {
  if (currentUser && authToken) {
    // Logged-in state
    if (navLogout) navLogout.style.display = 'inline-flex';
    if (navLogin) navLogin.style.display = 'none';
    if (navRegister) navRegister.style.display = 'none';

    // Admin link only for admins
    if (currentUser.role === 'admin') {
      if (navAdmin) navAdmin.style.display = 'inline-flex';
    } else {
      if (navAdmin) navAdmin.style.display = 'none';
    }

  } else {
    // Logged-out state
    if (navLogin) navLogin.style.display = 'inline-flex';
    if (navRegister) navRegister.style.display = 'inline-flex';
    if (navLogout) navLogout.style.display = 'none';
    if (navAdmin) navAdmin.style.display = 'none';
  }
}

// AUTH HELPERS (store/remove user in browser)

function setAuth(token, user) {
  authToken = token;
  currentUser = user;

  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));

  updateNav();
}

function clearAuth() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateNav();
}

// API WRAPPER (handles headers + errors)

async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  const headers = options.headers || {};

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body
      ? options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = (data && data.message) || 'Request failed.';
    throw new Error(message);
  }

  return data;
}
// BOOK RENDERING (Student & Admin views)

const booksListEl = document.getElementById('books-list');
const adminBooksListEl = document.getElementById('admin-books-list');

// Student grid
function renderBooksGrid(books) {
  if (!booksListEl) return;

  if (!books || books.length === 0) {
    booksListEl.innerHTML = '<p>No books found.</p>';
    return;
  }

  booksListEl.innerHTML = books
    .map((book) => {
      const statusClass =
        book.status === 'available' ? 'badge-available' : 'badge-borrowed';

      let actionsHtml = '';

      // Students can borrow
      if (currentUser && book.status === 'available') {
        actionsHtml += `
          <button class="btn small-btn btn-borrow" data-id="${book.id}">
            Borrow
          </button>
        `;
      }

      // Admin can mark returned
      if (currentUser && currentUser.role === 'admin' && book.status === 'borrowed') {
        actionsHtml += `
          <button class="btn small-btn btn-return" data-id="${book.id}">
            Mark Returned
          </button>
        `;
      }

      // Due date display
      let dueDateHtml = '';
      const rawDue =
        book.current_due_date || book.due_date || null;

      if (rawDue) {
        const due = new Date(rawDue);
        const formatted = due.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        dueDateHtml = `<p class="book-meta">Due: ${formatted}</p>`;
      }

      return `
        <article class="book-card" data-id="${book.id}">
          <h3 class="book-title">${book.title}</h3>
          <p class="book-meta">by ${book.author}</p>
          ${book.category ? `<p class="book-meta">Category: ${book.category}</p>` : ''}
          ${book.isbn ? `<p class="book-meta">ISBN: ${book.isbn}</p>` : ''}

          <p class="book-meta">
            Status:
            <span class="badge ${statusClass}">
              ${book.status}
            </span>
          </p>

          ${dueDateHtml}

          ${book.description ? `<p class="book-meta">${book.description}</p>` : ''}

          ${actionsHtml ? `<div class="book-actions">${actionsHtml}</div>` : ''}
        </article>
      `;
    })
    .join('');
}

// Admin table
function renderBooksAdminTable(books) {
  if (!adminBooksListEl) return;

  if (!books || books.length === 0) {
    adminBooksListEl.innerHTML = '<p>No books in the system.</p>';
    return;
  }

  const rows = books
    .map(
      (book) => `
      <tr data-id="${book.id}">
        <td>${book.id}</td>
        <td>${book.title}</td>
        <td>${book.author}</td>
        <td>${book.category || '-'}</td>
        <td>${book.status}</td>
        <td>
          <div class="table-actions">
            <button class="btn secondary-btn btn-edit" data-id="${book.id}">Edit</button>
            <button class="btn secondary-btn btn-delete" data-id="${book.id}">Delete</button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');

  adminBooksListEl.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>ID</th><th>Title</th><th>Author</th>
          <th>Category</th><th>Status</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}


// book fetcher and the filters

async function fetchBooksAndRender() {
  try {
    const search = document.getElementById('search-input')?.value.trim() || '';
    const category = document.getElementById('filter-category')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (status) params.append('status', status);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const data = await apiRequest(`/books${queryString}`);

    console.log('Books from API:', data.books);

    renderBooksGrid(data.books);

    if (currentUser?.role === 'admin') {
      renderBooksAdminTable(data.books);
    }

    populateCategoryFilter(data.books);

  } catch (error) {
    console.error(error);
    showFlash(error.message, 'error');
  }
}


// Populate category dropdown
function populateCategoryFilter(books) {
  const select = document.getElementById('filter-category');
  if (!select) return;

  const unique = new Set();
  books.forEach((b) => b.category && unique.add(b.category));

  const current = select.value;

  select.innerHTML = '<option value="">All categories</option>';

  [...unique].forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });

  select.value = current;
}

// AUTH FORMS (login / register)

function setupAuthForms() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value.trim();

      try {
        const data = await apiRequest('/auth/login', {
          method: 'POST',
          body: { email, password },
        });

        setAuth(data.token, data.user);
        showFlash('Logged in successfully.', 'success');
        showView('books');
        fetchBooksAndRender();

      } catch (error) {
        console.error(error);
        showFlash(error.message, 'error');
      }
    });
  }

  // Register
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value.trim();

      try {
        const data = await apiRequest('/auth/register', {
          method: 'POST',
          body: { name, email, password },
        });

        setAuth(data.token, data.user);
        showFlash('Account created. You are now logged in.', 'success');
        showView('books');
        fetchBooksAndRender();

      } catch (error) {
        console.error(error);
        showFlash(error.message, 'error');
      }
    });
  }
}

// ADMIN BOOK FORM (Add + Edit + Delete)

function setupAdminBookForm() {
  const bookForm = document.getElementById('book-form');
  const bookIdInput = document.getElementById('book-id');
  const titleInput = document.getElementById('book-title');
  const authorInput = document.getElementById('book-author');
  const isbnInput = document.getElementById('book-isbn');
  const categoryInput = document.getElementById('book-category');
  const descInput = document.getElementById('book-description');
  const statusSelect = document.getElementById('book-status');
  const submitBtn = document.getElementById('book-submit-btn');
  const cancelBtn = document.getElementById('book-cancel-edit-btn');

  if (!bookForm) return;

  // Add or update a book
  bookForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser || currentUser.role !== 'admin') {
      showFlash('Only admins can manage books.', 'error');
      return;
    }

    const id = bookIdInput.value;

    const payload = {
      title: titleInput.value.trim(),
      author: authorInput.value.trim(),
      isbn: isbnInput.value.trim(),
      category: categoryInput.value.trim(),
      description: descInput.value.trim(),
      status: statusSelect.value,
    };

    if (!payload.title || !payload.author) {
      showFlash('Title and author are required.', 'error');
      return;
    }

    try {
      if (id) {
        await apiRequest(`/books/${id}`, { method: 'PUT', body: payload });
        showFlash('Book updated successfully.', 'success');
      } else {
        await apiRequest('/books', { method: 'POST', body: payload });
        showFlash('Book added successfully.', 'success');
      }

      clearForm();
      fetchBooksAndRender();

    } catch (error) {
      console.error(error);
      showFlash(error.message, 'error');
    }
  });

  // Reset form
  function clearForm() {
    bookIdInput.value = '';
    titleInput.value = '';
    authorInput.value = '';
    isbnInput.value = '';
    categoryInput.value = '';
    descInput.value = '';
    statusSelect.value = 'available';
    submitBtn.textContent = 'Add Book';
    if (cancelBtn) cancelBtn.style.display = 'none';
  }

  // Cancel edit
  if (cancelBtn) {
    cancelBtn.addEventListener('click', clearForm);
  }

  // Click handling (edit/delete)
  if (adminBooksListEl) {
    adminBooksListEl.addEventListener('click', (e) => {
      const target = e.target;

      if (target.classList.contains('btn-edit')) {
        editBook(target.dataset.id);
      }

      if (target.classList.contains('btn-delete')) {
        deleteBook(target.dataset.id);
      }
    });
  }

  // Load data into form for editing
  async function editBook(id) {
    try {
      const book = await apiRequest(`/books/${id}`);

      bookIdInput.value = book.id;
      titleInput.value = book.title;
      authorInput.value = book.author;
      isbnInput.value = book.isbn || '';
      categoryInput.value = book.category || '';
      descInput.value = book.description || '';
      statusSelect.value = book.status;

      submitBtn.textContent = 'Update Book';
      if (cancelBtn) cancelBtn.style.display = 'inline-flex';
      showView('admin');

    } catch (error) {
      console.error(error);
      showFlash(error.message, 'error');
    }
  }

  // Delete book
  async function deleteBook(id) {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
      await apiRequest(`/books/${id}`, { method: 'DELETE' });
      showFlash('Book deleted successfully.', 'success');
      fetchBooksAndRender();

    } catch (error) {
      console.error(error);
      showFlash(error.message, 'error');
    }
  }
}

// BORROW / RETURN (student actions)

async function borrowBook(id) {
  if (!currentUser) {
    showFlash('You must be logged in to borrow books.', 'error');
    return;
  }

  try {
    await apiRequest(`/books/${id}/borrow`, { method: 'POST' });
    showFlash('Book borrowed successfully.', 'success');
    fetchBooksAndRender();

  } catch (error) {
    console.error(error);
    showFlash(error.message, 'error');
  }
}

async function markBookReturned(id) {
  if (!currentUser) {
    showFlash('You must be logged in.', 'error');
    return;
  }

  try {
    await apiRequest(`/books/${id}/return`, { method: 'POST' });
    showFlash('Book returned successfully.', 'success');
    fetchBooksAndRender();

  } catch (error) {
    console.error(error);
    showFlash(error.message, 'error');
  }
}


// NAVIGATION LOGIC

function setupNav() {
  // Navbar button clicks
  document.querySelectorAll('.nav-link[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;

      if (view === 'admin' && currentUser?.role !== 'admin') {
        showFlash('Admin access only.', 'error');
        return;
      }

      showView(view);

      if (view === 'books' || view === 'admin') {
        fetchBooksAndRender();
      }
    });
  });

  // Logout
  if (navLogout) {
    navLogout.addEventListener('click', () => {
      clearAuth();
      showFlash('Logged out.', 'success');
      showView('login');
    });
  }

  // "Switch view" inside login/register forms
  document.querySelectorAll('.link-like[data-view]').forEach((link) => {
    link.addEventListener('click', () => showView(link.dataset.view));
  });

  // Search button
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', fetchBooksAndRender);
  }

  // Search on Enter
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchBooksAndRender();
      }
    });
  }

  // Clear filters
  const resetBtn = document.getElementById('reset-filters-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const search = document.getElementById('search-input');
      const category = document.getElementById('filter-category');
      const status = document.getElementById('filter-status');

      if (search) search.value = '';
      if (category) category.value = '';
      if (status) status.value = '';

      fetchBooksAndRender();
    });
  }
}

// INITIAL BOOT
document.addEventListener('DOMContentLoaded', () => {
  // Footer year auto-update
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  updateNav();
  setupNav();
  setupAuthForms();
  setupAdminBookForm();

  // Borrow/return handler on student book cards
  if (booksListEl) {
    booksListEl.addEventListener('click', (e) => {
      const borrowBtn = e.target.closest('.btn-borrow');
      const returnBtn = e.target.closest('.btn-return');

      if (borrowBtn) {
        borrowBook(borrowBtn.dataset.id);
        return;
      }
      if (returnBtn) {
        markBookReturned(returnBtn.dataset.id);
        return;
      }
    });
  }

  // Default view when page loads
  if (currentUser && authToken) {
    showView('books');
    fetchBooksAndRender();
  } else {
    showView('login');
  }
});
