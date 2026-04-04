const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const pool = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create short URL
app.post('/api/shorten', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Generate short code
    const shortCode = crypto.randomBytes(4).toString('base64url').slice(0, 6);

    // Save to database
    const result = await pool.query(
      'INSERT INTO urls (short_code, original_url) VALUES ($1, $2) RETURNING *',
      [shortCode, url]
    );

    const entry = result.rows[0];
    const shortUrl = `${BASE_URL}/${entry.short_code}`;

    res.status(201).json({
      shortUrl,
      originalUrl: entry.original_url,
      clicks: entry.clicks,
      createdAt: entry.created_at
    });
  } catch (error) {
    console.error('Shorten error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all URLs
app.get('/api/urls', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, short_code, original_url, clicks, created_at FROM urls ORDER BY created_at DESC'
    );

    const urls = result.rows.map(row => ({
      id: row.id,
      shortUrl: `${BASE_URL}/${row.short_code}`,
      originalUrl: row.original_url,
      clicks: row.clicks,
      createdAt: row.created_at
    }));

    res.json(urls);
  } catch (error) {
    console.error('List URLs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Redirect short URL
app.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const result = await pool.query(
      'SELECT original_url FROM urls WHERE short_code = $1',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).send(`
        <html>
          <head><title>URL Not Found</title></head>
          <body style="text-align:center;padding:50px;font-family:sans-serif;">
            <h1>🔗 URL Not Found</h1>
            <p>This short URL doesn't exist or has expired.</p>
            <a href="/">Go to homepage</a>
          </body>
        </html>
      `);
    }

    // Increment click count
    await pool.query('UPDATE urls SET clicks = clicks + 1 WHERE short_code = $1', [code]);

    // Redirect
    res.redirect(result.rows[0].original_url);
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).send('Internal server error');
  }
});

// Serve frontend
app.use(express.static('/app/public'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
