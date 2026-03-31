# 🛍️ SmartShop AI

An AI-powered smart shopping web application that helps users search for products intelligently and interact with a Shopping Assistant chatbot. Built with Django REST Framework (backend) and React + Vite (frontend), connected to a MySQL database.

---

## 🚀 Features

- 🔍 **Smart Search** — Search products using natural language (e.g., *"fitness watch under $100"*)
- 🤖 **Shopping Assistant** — AI-powered chatbot to help users compare products and get recommendations
- 🛒 **Product Listings** — Browse products with details including name, price, category, description, and reviews
- ⭐ **Customer Reviews** — View ratings and comments from other shoppers
- 🗂️ **Category Filtering** — Filter products by category (e.g., Electronics, Fitness, etc.)
- 🔧 **Django Admin Panel** — Manage products, categories, and users via the built-in admin dashboard

---

## 🧰 Tech Stack

### Backend
- **Python** + **Django** + **Django REST Framework**
- **MySQL** (via MySQLdb)
- **django-cors-headers** for cross-origin requests

### Frontend
- **React** (with Vite)
- **JavaScript / JSX**
- **HTML / CSS**

---

## 📁 Project Structure

```
smartshop_ai/
├── smartshop_backend/       # Django backend
│   ├── backend/
│   │   └── settings.py      # Project settings
│   ├── smartshop/           # Main app (models, views, urls)
│   ├── manage.py
│   └── .env                 # Environment variables (not in repo)
│
├── smartshop_frontend/      # React + Vite frontend
│   ├── src/                 # React components
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── .gitignore
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have the following installed:
- Python 3.x
- Node.js & npm
- MySQL Server 8.0+
- Git

---

### 🔧 Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/jeanlimsl3-LithanAcad/smartshop-ai.git
   cd smartshop_ai
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv .venv
   # Windows
   .\.venv\Scripts\Activate.ps1
   # Mac/Linux
   source .venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up your `.env` file** inside `smartshop_backend/`
   ```
   DB_NAME=smartshop_startup_db
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_HOST=localhost
   DB_PORT=3306
   ```

5. **Run database migrations**
   ```bash
   cd smartshop_backend
   python manage.py migrate
   ```

6. **Start the backend server**
   ```bash
   python manage.py runserver
   ```
   Backend runs at: `http://127.0.0.1:8000`

---

### 🎨 Frontend Setup

1. **Navigate to the frontend folder**
   ```bash
   cd smartshop_frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the frontend dev server**
   ```bash
   npm run dev
   ```
   Frontend runs at: `http://localhost:5173`

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products/` | List all products |
| GET | `/api/products/<id>/` | Get product details |
| GET | `/api/categories/` | List all categories |
| GET | `/admin/` | Django admin panel |

---

## 🛠️ Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| `mysql` not recognized in terminal | Add `C:\Program Files\MySQL\MySQL Server 8.0\bin` to system PATH |
| `Access denied for user 'root'` | Check MySQL password in `.env` or `settings.py` |
| `Failed to load products` on frontend | Ensure backend is running and CORS is configured |
| `.venv` not activating | Run `Set-ExecutionPolicy RemoteSigned` in PowerShell as admin |

---

## 👤 Author

**Jean** — [GitHub Profile](https://github.com/jeanlimsl3-LithanAcad)

---

## 📄 License

This project is for educational purposes as part of a course project.