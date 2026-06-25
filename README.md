# BIGIN – Insurance Management System

A comprehensive Insurance Agency Management System built to streamline policy management, customer tracking, renewals, invoicing, commissions, and business reporting.

> Developed as a full-stack web application to automate the daily operations of an insurance brokerage.

---

## Overview

BIGIN is designed to replace manual spreadsheets and paperwork with a centralized digital platform. It enables insurance agencies to manage policies, customers, insurers, commissions, renewals, invoices, and reports from a single dashboard.

---

## Features

### Dashboard
- Business overview
- Policy statistics
- Financial year summary
- Quick analytics

### Customer Management
- Customer profiles
- Contact information
- Policy history
- Search & filtering

### Policy Management
- Add/Edit/Delete policies
- Multiple insurance products
- Premium tracking
- Policy term management
- Payment frequency management
- Policy status tracking

### Renewals
- Upcoming renewal tracking
- Month-wise filters
- Due-date monitoring
- Renewal reports
- Customer reminders

### Insurer Management
- Insurer database
- Commission configuration
- Policy mapping

### GST Invoice Management
- GST invoice generation
- Invoice tracking
- Invoice status management
- PDF generation

### Pre-Invoice Processing
- Invoice preparation workflow
- Policy validation
- Batch processing

### Commission Management
- Commission calculation
- Override support
- Monthly tracking
- Commission reports

### POSP Management
- POSP member management
- Policy assignment
- Commission tracking
- Performance reports

### Reports
- Business reports
- Commission reports
- Renewal reports
- Policy reports
- Excel export
- PDF export

### Data Import
- Excel import
- Bulk policy upload
- Validation checks

### Security
- Authentication
- Role-based access
- Protected APIs
- Secure database operations

---

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- Axios
- React Router

### Backend
- Node.js
- Express.js
- Prisma ORM

### Database
- SQLite (Development)
- Easily configurable for PostgreSQL/MySQL

### Other Tools
- JWT Authentication
- ExcelJS
- PDF Generation
- REST APIs

---

## Project Structure

```
BIGIN-Insurance-System/

├── backend/
│   ├── prisma/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   ├── controllers/
│   └── tests/
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│
├── uploads/
├── docs/
└── README.md
```

---

## Installation

### Clone the repository

```bash
git clone https://github.com/yourusername/BIGIN-Insurance-System.git
cd BIGIN-Insurance-System
```

### Backend

```bash
cd backend

npm install

npx prisma migrate dev

npm run dev
```

### Frontend

```bash
cd frontend

npm install

npm run dev
```

---

## Environment Variables

Create a `.env` file inside the backend directory.

```env
DATABASE_URL="file:./dev.db"

JWT_SECRET=your_secret_key

PORT=5000
```

---

## Available Scripts

Backend

```bash
npm run dev
npm test
npm run build
```

Frontend

```bash
npm run dev
npm run build
npm run preview
```

---

## Key Modules

- Dashboard
- Customers
- Policies
- Renewals
- Insurers
- GST Invoices
- Pre-Invoice Processing
- Commission Management
- POSP Management
- Reports
- Data Import
- Authentication

---

## REST API

Example endpoints

```
POST   /api/auth/login
GET    /api/policies
POST   /api/policies
PUT    /api/policies/:id
DELETE /api/policies/:id

GET    /api/customers

GET    /api/renewals

GET    /api/invoices

GET    /api/reports

GET    /api/posp
```

---

## Screenshots

You can add screenshots here.

```
docs/screenshots/dashboard.png

docs/screenshots/policies.png

docs/screenshots/renewals.png

docs/screenshots/invoices.png
```

---

## Future Improvements

- Email notifications
- SMS reminders
- OTP authentication
- Cloud deployment
- Automated backups
- Mobile application
- Payment gateway integration
- Advanced analytics dashboard

---

## Learning Outcomes

This project demonstrates experience with:

- Full Stack Development
- REST API Design
- Database Design
- Prisma ORM
- Authentication
- Business Workflow Automation
- Report Generation
- Excel Processing
- PDF Generation
- Data Validation
- Production-level CRUD Operations

---

## Disclaimer

This repository is intended to showcase the software architecture and implementation skills involved in building an insurance management platform.

Sensitive production data, client information, credentials, and proprietary business data are not included.

---

## Author

**Praveen Adithya**

B.Tech Computer Science (Big Data Analytics)

GitHub: https://github.com/yourusername

LinkedIn: https://linkedin.com/in/yourprofile

---
