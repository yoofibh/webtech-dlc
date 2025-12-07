// ==== CONFIG ====
const API_BASE_URL = 'http://localhost:5000/api';

// Simple state
let authToken = localStorage.getItem('token') || null;
let currentUser = null;

try {
  currentUser = JSON.parse(localStorage.getItem('user'));
} catch {
  currentUser = null;
}

// ==== HELPER: Flash messages ====
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

// ==== HELPER: View switching ====
const views = {
  login: document.getElementById('view-login'),
  register: document.getElementById('view-register'),
  books: document.getElementById('view-books'),
  admin: document.getElementById('view-admin'),
};

function showView(name) {
  Object.keys(views).forEach((key) => {
    if (views[key]) {
      views[key].style.display = key === name ? 'block' : 'none';
    }
  });
}

// ==== HELPER: Auth state + nav update ====
const navAdmin = document.getElementById('nav-admin');
const navLogin = document.getElementById('nav-login');
const navRegister = document.getElementById('nav-register');
const navLogout = document.getElementById('nav-logout');

function updateNav() {
  if (currentUser && authToken) {
    navLogin.style.display = 'none';
    navRegister.style.display = 'none';
    navLogout.style.display = 'inline-flex';

    if (currentUser.role === 'admin') {
      navAdmin.style.display = 'inline-flex';
    } else {
      navAdmin.style.display = 'none';
    }
  } else {
    navLogin.style.display = 'inline-flex';
    navRegister.style.display = 'inline-flex';
    navLogout.style.display = 'none';
    navAdmin.style.display = 'none';
  }
}

// Save auth info to localStorage
function setAuth(token, user) {
  authToken = token;
  currentUser = user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  updateNav();
}

// Clear auth info
function clearAuth() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateNav();
}

// ==== API helper ====
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
    body: options.body ? (options.body instanceof FormData ? options.body : JSON.stringify(options.body)) : undefined,
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

// ==== BOOKS: RENDERING (Student + Admin) ====
const booksListEl = document.getElementById('books-list');
const adminBooksListEl = document.getElementById('admin-books-list');
// Search + filter elements
const searchInput = document.getElementById('search-input');
const filterCategory = document.getElementById('filter-category');
const filterStatus = document.getElementById('filter-status');
const resetFiltersBtn = document.getElementById('reset-filters-btn');


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
      return `
        <article class="book-card">
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
          ${
            book.description
              ? `<p class="book-meta">${book.description}</p>`
              : ''
          }
        </article>
      `;
    })
    .join('');
}

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
          <th>ID</th>
          <th>Title</th>
          <th>Author</th>
          <th>Category</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// Fetch books with optional filters
async function fetchBooksAndRender() {
  try {
    const search = searchInput ? searchInput.value.trim() : '';
    const category = filterCategory ? filterCategory.value : '';
    const status = filterStatus ? filterStatus.value : '';

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (status) params.append('status', status);

    const queryString = params.toString() ? `?${params.toString()}` : '';

    const data = await apiRequest(`/books${queryString}`);
    renderBooksGrid(data.books);

    // Also populate admin table if admin is logged in
    if (currentUser && currentUser.role === 'admin') {
      renderBooksAdminTable(data.books);
      populateCategoryFilter(data.books);
    } else {
      populateCategoryFilter(data.books);
    }
  } catch (error) {
    console.error(error);
    showFlash(error.message, 'error');
  }
}

// Populate category dropdown dynamically
function populateCategoryFilter(books) {
  const select = document.getElementById('filter-category');
  if (!select) return;
  const uniqueCategories = new Set();
  books.forEach((b) => {
    if (b.category) uniqueCategories.add(b.category);
  });

  // keep "All categories" first
  const currentValue = select.value;
  select.innerHTML = '<option value="">All categories</option>';
  [...uniqueCategories].forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
  // try to restore previous selected value
  select.value = currentValue;
}

// ==== AUTH: EVENT HANDLERS ====
function setupAuthForms() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

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

// ==== ADMIN: BOOK FORM HANDLER ====
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
  const cancelEditBtn = document.getElementById('book-cancel-edit-btn');

  if (!bookForm) return;

  // Handle create / update
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

    try {
      if (!payload.title || !payload.author) {
        showFlash('Title and author are required.', 'error');
        return;
      }

      if (id) {
        // Update existing
        await apiRequest(`/books/${id}`, {
          method: 'PUT',
          body: payload,
        });
        showFlash('Book updated successfully.', 'success');
      } else {
        // Create new
        await apiRequest('/books', {
          method: 'POST',
          body: payload,
        });
        showFlash('Book added successfully.', 'success');
      }

      clearBookForm();
      fetchBooksAndRender();
    } catch (error) {
      console.error(error);
      showFlash(error.message, 'error');
    }
  });

  function clearBookForm() {
    bookIdInput.value = '';
    titleInput.value = '';
    authorInput.value = '';
    isbnInput.value = '';
    categoryInput.value = '';
    descInput.value = '';
    statusSelect.value = 'available';
    submitBtn.textContent = 'Add Book';
    cancelEditBtn.style.display = 'none';
  }

  cancelEditBtn.addEventListener('click', () => {
    clearBookForm();
  });

  // Delegate edit/delete button clicks from the admin table
  if (adminBooksListEl) {
    adminBooksListEl.addEventListener('click', (e) => {
      const target = e.target;
      if (target.classList.contains('btn-edit')) {
        const id = target.getAttribute('data-id');
        startEditBook(id);
      } else if (target.classList.contains('btn-delete')) {
        const id = target.getAttribute('data-id');
        deleteBook(id);
      }
    });
  }

  async function startEditBook(id) {
    try {
      const book = await apiRequest(`/books/${id}`);
      bookIdInput.value = book.id;
      titleInput.value = book.title || '';
      authorInput.value = book.author || '';
      isbnInput.value = book.isbn || '';
      categoryInput.value = book.category || '';
      descInput.value = book.description || '';
      statusSelect.value = book.status || 'available';

      submitBtn.textContent = 'Update Book';
      cancelEditBtn.style.display = 'inline-flex';
      showView('admin');
    } catch (error) {
      console.error(error);
      showFlash(error.message, 'error');
    }
  }

  async function deleteBook(id) {
    if (!confirm('Are you sure you want to delete this book?')) return;
    try {
      await apiRequest(`/books/${id}`, {
        method: 'DELETE',
      });
      showFlash('Book deleted successfully.', 'success');
      fetchBooksAndRender();
    } catch (error) {
      console.error(error);
      showFlash(error.message, 'error');
    }
  }
}

// ==== NAV & GLOBAL EVENTS ====
function setupNav() {
  // Nav buttons
  document.querySelectorAll('.nav-link[data-view]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const view = btn.getAttribute('data-view');

      if (view === 'admin') {
        if (!currentUser || currentUser.role !== 'admin') {
          showFlash('Admin access only.', 'error');
          return;
        }
        showView('admin');
        fetchBooksAndRender();
      } else if (view === 'books') {
        showView('books');
        fetchBooksAndRender();
      } else if (view === 'login') {
        showView('login');
      } else if (view === 'register') {
        showView('register');
      }
    });
  });

  // Logout
  navLogout.addEventListener('click', () => {
    clearAuth();
    showFlash('Logged out.', 'success');
    showView('login');
  });

  // "link-like" text inside forms
  document.querySelectorAll('.link-like[data-view]').forEach((span) => {
    span.addEventListener('click', () => {
      const view = span.getAttribute('data-view');
      showView(view);
    });
  });

  // Search button
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      fetchBooksAndRender();
    });
  }

  // Reset button: clear filters + reload all books
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (filterCategory) filterCategory.value = '';
      if (filterStatus) filterStatus.value = '';
      fetchBooksAndRender();
    });
  }

  // Auto-reset when search box is cleared and no filters selected
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const search = searchInput.value.trim();
      const category = filterCategory ? filterCategory.value : '';
      const status = filterStatus ? filterStatus.value : '';

      if (!search && !category && !status) {
        fetchBooksAndRender();
      }
    });
  }
}


// ==== INIT ====
document.addEventListener('DOMContentLoaded', () => {
  // Set footer year
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  updateNav();
  setupNav();
  setupAuthForms();
  setupAdminBookForm();

  // Default view:
  if (currentUser && authToken) {
    showView('books');
    fetchBooksAndRender();
  } else {
    showView('login');
  }
});
