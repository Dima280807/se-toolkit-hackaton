# 🔗 Smart URL Shortener

A smart URL shortener that automatically describes and tags your links using AI, so you always remember what each link is about.

## Product Context

**End users:** Students, researchers, and professionals who collect and share links.

**Problem:** People save links without context — a week later it's unclear what the page was about and why it was saved. Finding a specific link in a long browser bookmark list is frustrating.

**Our solution:** Paste a URL, get a short link with an AI-generated description and tags. Search by topic, not by memorized URL fragments. Track clicks, set expiration, and use custom codes for memorable links.

## Features

### ✅ Version 1 — Core Feature
- Paste a long URL → get a short URL
- **LLM-powered auto-description and tagging** — AI analyzes each link and generates a summary + relevant tags
- Automatic redirect when visiting short URL
- Click counter for each link
- Search by description, tags, or URL
- Recent URLs list with AI-generated descriptions
- URL validation

### ✅ Version 2 — Improvements
- **Custom short codes** — Create memorable links like `mylink.co/demo` (3-20 chars, alphanumeric + hyphens/underscores)
- **Click analytics** — View daily click statistics, top browsers/devices, and global analytics dashboard
- **URL expiration** — Set links to auto-delete after N days (or keep them forever with 0 days)
- **One-click copy** — Copy any short URL to clipboard with visual feedback
- **Delete URLs** — Remove unwanted links with confirmation
- **Analytics tab** — Global view of top URLs, total clicks, and detailed per-URL statistics
- **Improved UI** — Tab-based interface with better organization and visual feedback

## Demo

![Smart URL Shortener](https://via.placeholder.com/800x450/667eea/ffffff?text=Smart+URL+Shortener+Screenshot)

*Main interface with AI-powered link creation and analytics*

## Usage

### Quick Start with Docker (Recommended)

**Prerequisites:** Docker 24+, Docker Compose 2+

```bash
# Clone the repository
git clone <repo-url>
cd se-toolkit-hackaton

# With LLM (recommended):
OPENAI_API_KEY=sk-your-key docker compose up -d

# Without LLM (works with simple auto-descriptions):
docker compose up -d
```

Open http://localhost:5000 in your browser.

### Local Development

**Prerequisites:** Node.js 20+, PostgreSQL 15+

```bash
# Create database
createdb url_shortener
psql -d url_shortener -f backend/migrations/001_urls.sql
psql -d url_shortener -f backend/migrations/002_custom_codes_and_expiration.sql

# Set your OpenAI API key (optional — falls back to simple descriptions without it)
export OPENAI_API_KEY=sk-your-key

# Start backend (serves frontend too)
cd backend
npm install
npm run dev
```

Open http://localhost:5000

## How It Works

### Creating a Short URL

1. Paste a long URL into the input field
2. (Optional) Enter a custom code like `my-project` or leave it blank for auto-generation
3. (Optional) Set expiration in days (0 = never expires)
4. Click "Shorten"
5. AI analyzes the URL and generates a description + tags
6. Get your short URL with copy button

### Viewing Analytics

Switch to the **Analytics** tab to see:
- **Total clicks** across all URLs
- **Top URLs** ranked by clicks (last 7 days)
- Click detailed view for each URL:
  - Daily click statistics (last 30 days)
  - Top browsers and devices
  - Creation and expiration dates

### Managing URLs

- **Search** — Filter URLs by description, tags, or original URL
- **Copy** — One-click copy button on each URL
- **Analytics** — View detailed stats for any URL
- **Delete** — Remove URLs you no longer need

## LLM Integration

The app uses **OpenAI GPT-4o-mini** to analyze URLs:

1. When you submit a link, the backend sends the URL to the LLM
2. The LLM generates a **one-line description** of what the page is about
3. The LLM assigns **relevant tags** (e.g., `education`, `youtube`, `news`)
4. Both are saved to the database for easy search and browsing

If no `OPENAI_API_KEY` is configured, the app falls back to a simple hostname-based description — it still works without LLM.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/shorten` | Create short URL (with optional `customCode` and `expiresInDays`) |
| GET | `/api/urls` | List all active URLs (excludes expired) |
| GET | `/api/search?q=query` | Search by description, tags, or URL |
| GET | `/api/analytics` | Global analytics (top URLs, total clicks) |
| GET | `/api/analytics/:code` | Detailed analytics for a specific URL |
| DELETE | `/api/urls/:id` | Delete a URL |
| GET | `/:code` | Redirect to original URL (with click tracking) |

### Request/Response Examples

**Create Short URL:**
```json
POST /api/shorten
{
  "url": "https://example.com/very/long/url",
  "customCode": "my-link",  // optional
  "expiresInDays": 30       // optional, 0 = never
}
```

**Get Analytics:**
```json
GET /api/analytics?limit=5&days=7
{
  "totalClicks": 150,
  "topUrls": [
    {
      "shortUrl": "http://localhost:5000/abc123",
      "originalUrl": "https://example.com",
      "description": "Example website",
      "tags": ["example", "demo"],
      "totalClicks": 50,
      "recentClicks": 12,
      "createdAt": "2026-04-01T10:00:00Z"
    }
  ]
}
```

## Deployment

**Target OS:** Ubuntu 24.04

**Requirements:** Docker 24+, Docker Compose 2+

### Step-by-Step Deployment

1. **Prepare the VM:**
   ```bash
   sudo apt update
   sudo apt install -y docker.io docker-compose
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

2. **Clone and configure:**
   ```bash
   git clone <repo-url>
   cd se-toolkit-hackaton
   ```

3. **Start services:**
   ```bash
   # With LLM:
   OPENAI_API_KEY=sk-your-key docker compose up -d
   
   # Without LLM:
   docker compose up -d
   ```

4. **Verify:**
   ```bash
   docker compose ps
   curl http://localhost:5000/api/health
   ```

5. **Access:** Open `http://<your-vm-ip>:5000` in browser

### Docker Services

- **PostgreSQL 16** — Database (port 5432)
- **Backend (Node.js + Express)** — API + serves frontend (port 5000)

Data is persisted in Docker volumes.

## Database Schema

### Tables

**urls** — Stores all shortened URLs
- `id` — Primary key
- `short_code` — Unique short code (auto-generated or custom)
- `original_url` — Original long URL
- `description` — AI-generated description
- `tags` — Array of AI-generated tags
- `clicks` — Total click count
- `is_custom` — Whether code was user-defined
- `expires_at` — Expiration timestamp (NULL = never)
- `created_at` — Creation timestamp

**click_events** — Detailed click tracking
- `id` — Primary key
- `url_id` — Reference to URL
- `clicked_at` — Click timestamp
- `ip_address` — Clicker's IP
- `user_agent` — Browser/device info

## Tech Stack

- **Backend:** Node.js 18+, Express 5, PostgreSQL 16
- **Frontend:** Single HTML page with vanilla JS (no frameworks)
- **LLM:** OpenAI GPT-4o-mini (optional, with fallback)
- **Deployment:** Docker, Docker Compose
- **Hosting:** Ubuntu 24.04 VM

## Project Structure

```
se-toolkit-hackaton/
├── backend/
│   ├── config/
│   │   └── db.js              # PostgreSQL connection
│   ├── migrations/
│   │   ├── 001_urls.sql       # Initial schema
│   │   └── 002_custom_codes_and_expiration.sql  # V2 features
│   ├── public/
│   │   └── index.html         # Frontend (single file)
│   ├── utils/
│   │   └── llm.js             # OpenAI integration
│   ├── server.js              # Main Express app
│   ├── package.json
│   └── Dockerfile
├── frontend/                  # (Not used — legacy React app)
├── docker-compose.yml
├── LICENSE                    # MIT License
└── README.md
```

## Troubleshooting

**URLs not shortening?**
- Check backend logs: `docker compose logs backend`
- Verify database is running: `docker compose ps`
- Check DB connection in `backend/.env`

**LLM not working?**
- Without `OPENAI_API_KEY`, the app uses fallback mode (hostname-based descriptions)
- With a key, ensure it's valid and has GPT-4o-mini access

**Port conflicts?**
- Change `PORT` in `backend/.env` or `docker-compose.yml`

## License

This project is open-source under the [MIT License](LICENSE).

## Author

Built for the Software Engineering Toolkit Hackaton.
