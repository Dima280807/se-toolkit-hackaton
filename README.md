# 🔗 URL Shortener

A simple URL shortener — paste a long URL, get a short one back.

## Product Context

**End users:** Anyone who shares links — students, marketers, developers.

**Problem:** Long URLs are ugly, hard to remember, and take up too much space in messages and presentations.

**Our solution:** A minimal URL shortener with click tracking. One field input, one-click copy, instant redirect.

## Features

### Implemented (Version 1)
- ✅ Paste a long URL → get a short URL
- ✅ Automatic redirect when visiting short URL
- ✅ Click counter for each link
- ✅ Recent URLs list
- ✅ URL validation

### Not Yet Implemented (Version 2)
- 🔲 Custom short codes (e.g., `mylink.co/demo`)
- 🔲 Click analytics page (daily/hourly stats)
- 🔲 URL expiration
- 🔲 QR code generation for short URLs

## Usage

### Local Development

**Prerequisites:** Node.js 20+, PostgreSQL 15+

```bash
# Create database
createdb url_shortener
psql -d url_shortener -f backend/migrations/001_urls.sql

# Start backend (serves frontend too)
cd backend
npm install
npm run dev
```

Open http://localhost:5000

### Docker (Recommended)

```bash
docker compose up -d
```

Open http://localhost:5000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/shorten` | Create short URL |
| GET | `/api/urls` | List all URLs |
| GET | `/:code` | Redirect to original URL |

## Deployment

**Target OS:** Ubuntu 24.04

**Requirements:** Docker 24+, Docker Compose 2+

```bash
git clone <repo-url>
cd se-toolkit-hackathon
docker compose up -d
```

## Tech Stack

- **Backend:** Node.js, Express, PostgreSQL
- **Frontend:** Single HTML page with vanilla JS (no frameworks)
- **Deployment:** Docker, Docker Compose
