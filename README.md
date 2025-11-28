# 📘 Article API — Express + TypeScript + MongoDB

A REST API built with **Express**, **TypeScript**, and **Mongoose**. Hosting articles for public as well as CRUD logic for admins.

This API is modular, *somewhat* scalable, and follows clean architecture principles.

---

## 🚀 Features

### 📝 Articles
- Create, read, update, and delete articles  
- Articles are linked to the user who created them  
- Query articles by organization or user  

### 🏢 Organizations
- Create organizations  
- Add or manage users inside organizations  
- Fetch all articles belonging to an organization  

### 👤 Users
- Register new users  
- Secure password hashing using **bcrypt**  
- Users are associated with organizations  
- Fetch user profiles  

### 🔐 Authentication
- JWT-based authentication (access tokens)  
- Route protection
- Token validation using TypeScript-safe decoders  

### ⚙️ Tech Stack
- **Node.js** + **Express**
- **TypeScript**
- **MongoDB** + **Mongoose**

---

## 🛠️ Installation

### Clone the repository
```bash
git clone https://github.com/your-username/article-api.git
cd server
```

### Install dependencies
```bash
npm install
```

### Build the project
```bash
npm run build
```

---

## 🔧 Environment Variables

Create a .env file in the project root:

```bash
MONGO_URI=
APP_PASSWORD=
DISCORD_WEBHOOK_URL=
JWT_SECRET=

# AWS
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
CLOUDFRONT_DOMAIN=
```

---

## ▶️ Running the API

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

---

###🛡️ Error Handling

The API uses a centralized error handler that:
- Returns consistent JSON error responses
- Logs internal server errors
- Validates request payloads

Example error response:
```json
{
  "error": "BAD_REQUEST"
}
```