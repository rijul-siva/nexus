# Nexus Backend API

REST API for the Nexus collaborative workspace. Built with **Node.js**, **Express**, and **MongoDB**.

---

## Quick Start

```bash
cd backend
npm install
# copy .env.example → .env and fill in MONGO_URI / JWT_SECRET
npm run dev      # development (nodemon)
npm start        # production
npm test         # run test suite
```

---

## Environment Variables (`.env`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port to listen on | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/nexus` |
| `JWT_SECRET` | Secret key for signing JWTs (≥ 32 chars) | — |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `CLIENT_ORIGIN` | Front-end origin for CORS | `http://127.0.0.1:5500` |

---

## API Reference

### Auth  `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/signup` | — | Register a new user |
| POST | `/login` | — | Login, returns JWT |
| GET | `/me` | ✅ | Get current user |

### Users  `/api/users`  *(all require JWT)*

| Method | Path | Description |
|--------|------|-------------|
| GET | `/profile` | Get own profile |
| PATCH | `/profile` | Update profile fields |
| PATCH | `/password` | Change password |
| DELETE | `/account` | Delete account + all files |

### Files  `/api/files`  *(all require JWT)*

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List files (supports `?q=` search) |
| POST | `/` | Create file |
| GET | `/:id` | Get single file |
| PATCH | `/:id` | Update file |
| DELETE | `/:id` | Delete file |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |

---

## Authentication

Send the JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

---

## Response Format

```json
{ "status": "success", "data": { ... } }
{ "status": "fail",    "message": "..." }
{ "status": "error",   "message": "..." }
```

---

## Security Features

- **Helmet** – HTTP security headers  
- **CORS** – restricted to `CLIENT_ORIGIN`  
- **Rate limiting** – 200 req/15 min globally; 20 req/15 min on auth endpoints  
- **Bcrypt** – passwords hashed with salt rounds 12  
- **express-mongo-sanitize** – NoSQL injection protection  
- **JWT** – stateless authentication  
- **Input validation** – express-validator on every endpoint  

