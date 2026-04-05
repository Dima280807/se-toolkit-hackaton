# Smart URL Shortener — Implementation Plan

## Project Idea

| Item | Description |
|---|---|
| **End-user** | Students, researchers, and professionals who collect and share links |
| **Problem** | People save links without context — a week later it's unclear what the page was about and why it was saved. Finding a specific link in a browser bookmark list is frustrating. |
| **Product (one sentence)** | A smart URL shortener that automatically describes and tags your links using AI, so you always remember what each link is about. |
| **Core feature** | Paste a URL → get a short link with an AI-generated description and tags for easy search. |

## Architecture

- **Backend:** Node.js + Express (REST API + serves static frontend)
- **Database:** PostgreSQL (stores URL mappings, AI descriptions, tags, click counts)
- **Client:** Single-page web app (vanilla HTML/CSS/JS)
- **LLM Integration:** Calls an LLM API to analyze page content and auto-generate description + tags

## Version 1 — Core Feature

> One thing done well: create short URLs with AI-powered descriptions.

**Implemented:**
- POST `/api/shorten` — accept a long URL, return a short one
- LLM analyzes the page and auto-generates a **description** and **tags**
- GET `/:code` — redirect to the original URL and count clicks
- GET `/api/urls` — list all URLs with descriptions and tags
- Search by description or tags
- Web interface: input field + "Shorten" button + recent URLs with AI descriptions
- URL validation (rejects malformed URLs)
- Docker Compose setup (PostgreSQL + Backend)

**Not in V1:**
- Custom short codes
- Click analytics charts
- URL expiration
- QR codes

## Version 2 — Improvements

> Build on V1 + add value.

**Planned:**
- Custom short codes (e.g., `mylink.co/demo`)
- Click analytics page (daily stats, top URLs)
- One-click copy to clipboard button
- URL expiration (auto-delete after N days)
- Chat-based interface (LLM agent): "create a link for..." / "find my links about..."
- Deploy to VM (Ubuntu 24.04, Docker Compose)
- Add MIT license + improve README
- Pre-record demo video for Task 5
