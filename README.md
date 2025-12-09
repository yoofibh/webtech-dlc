# Campus Digital Library Catalogue System

This is my web technologies exam project: a **Digital Library Catalogue System** for a university campus.

The goal is to allow **students** to browse and search books online, and give **librarians/admins** a simple dashboard to manage the catalogue (add, edit, delete books, and track borrowed items).

The project is built with:

- **Backend**: Node.js, Express, PostgreSQL
- **Frontend**: Vanilla HTML, CSS and JavaScript (Single Page Application style)
- **Auth**: JSON Web Tokens (JWT) with role-based access (student / admin)

---

## 🎯 Core Features

### 1. User Accounts & Authentication
- Users can **register** and **log in** with email + password.
- Passwords are hashed using **bcrypt** before saving to the database.
- After login, the server issues a **JWT token**, which the frontend stores and sends with each protected request.
- There are two main roles:
  - `student` – default role for normal users.
  - `admin` – has access to book management and admin actions.

### 2. Books Catalogue (Student View)
- Public catalogue where users can:
  - View all books.
  - See title, author, category, status, and description.
- Filters and search:
  - Search by **title** or **author**.
  - Filter by **category**.
  - Filter by **status** (`available` or `borrowed`).

### 3. Admin Dashboard (Librarian View)
Admins can:

- Add new books to the system.
- Edit existing books (title, author, category, description, status).
- Delete books that are no longer in the catalogue.
- See an overview table of **all books** in the system.

Admin pages and routes are protected by middleware that checks both:
- **JWT validity**, and  
- **User role** (`admin` only).

### 4. Borrowing & Returning Books
- Logged-in students can **borrow** a book if its status is `available`.
- When a book is borrowed:
  - A record is created in the `borrow_records` table.
  - A default **7-day due date** is set.
  - The book status changes from `available` ➝ `borrowed`.
- Books can be **returned** by:
  - The student who borrowed it, or
  - Any admin user.
- On return:
  - `returned_at` is set on the borrow record.
  - Book status goes back to `available`.

The student-facing UI also shows a **current due date** (if the book is borrowed and still active).

---

## 🏗️ Tech Stack & Architecture

### Backend
- **Node.js** with **Express.js**
- **PostgreSQL** database (hosted on Render in my case)
- Main files:
  - `server.js` – bootstraps the app, middleware, routes, and seeds an admin on startup.
  - `config/db.js` – PostgreSQL connection pool.
  - `config/seedAdmin.js` – ensures there is at least one admin account.
  - `routes/authRoutes.js` – handles registration and login.
  - `routes/bookRoutes.js` – handles books CRUD and borrow/return logic.
  - `middleware/auth.js` – verifies JWT tokens and enforces `admin` role where needed.

### Frontend
- **Plain HTML, CSS and JS** (no frontend framework).
- Single-page style behaviour:
  - Views:
    - Login
    - Register
    - Books (student view)
    - Admin (manage books)
  - `app.js` switches views, calls the backend API, and manages UI state.
- **Styling**:
  - `styles.css` – custom dark theme library UI with cards, tables, and responsive layout.

---

  Database Design 

The main tables are:

1. **users**
   - `id` (PK)
   - `name`
   - `email` (unique)
   - `password_hash`
   - `role` (`student` or `admin`)
   - `created_at`

2. **books**
   - `id` (PK)
   - `title`
   - `author`
   - `isbn`
   - `category`
   - `description`
   - `status` (`available` or `borrowed`)
   - `created_at`

3. **borrow_records**
   - `id` (PK)
   - `user_id` (FK → users.id)
   - `book_id` (FK → books.id)
   - `borrowed_at`
   - `due_date`
   - `returned_at` (nullable, set when book is returned)

---
 Setup & Running Locally

 1. Clone the Repository

```bash
git clone <your-repo-url-here>
cd <your-project-folder>
