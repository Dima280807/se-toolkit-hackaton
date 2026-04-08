const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const pool = require('./config/db');
const { analyzeUrl } = require('./utils/llm');
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
    const { url, customCode, expiresInDays } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Handle custom code
    let shortCode;
    let isCustom = false;
    
    if (customCode) {
      // Validate custom code (alphanumeric, hyphens, underscores, 3-20 chars)
      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(customCode)) {
        return res.status(400).json({ 
          error: 'Custom code must be 3-20 characters long and contain only letters, numbers, hyphens, or underscores' 
        });
      }
      
      // Check if custom code is already taken
      const existing = await pool.query('SELECT id FROM urls WHERE short_code = $1', [customCode]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Custom code is already taken' });
      }
      
      shortCode = customCode;
      isCustom = true;
    } else {
      // Generate random short code
      shortCode = crypto.randomBytes(4).toString('base64url').slice(0, 6);
    }

    // LLM analysis for description and tags
    const { description, tags } = await analyzeUrl(url);

    // Calculate expiration date if specified
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Save to database
    const result = await pool.query(
      'INSERT INTO urls (short_code, original_url, description, tags, is_custom, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [shortCode, url, description, tags, isCustom, expiresAt]
    );

    const entry = result.rows[0];
    const shortUrl = `${BASE_URL}/${entry.short_code}`;

    res.status(201).json({
      shortUrl,
      originalUrl: entry.original_url,
      description: entry.description,
      tags: entry.tags,
      clicks: entry.clicks,
      expiresAt: entry.expires_at,
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
      'SELECT id, short_code, original_url, description, tags, clicks, created_at, expires_at FROM urls WHERE expires_at IS NULL OR expires_at > NOW() ORDER BY created_at DESC'
    );

    const urls = result.rows.map(row => ({
      id: row.id,
      shortUrl: `${BASE_URL}/${row.short_code}`,
      originalUrl: row.original_url,
      description: row.description,
      tags: row.tags || [],
      clicks: row.clicks,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    }));

    res.json(urls);
  } catch (error) {
    console.error('List URLs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search URLs by description, tags, or original URL
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await pool.query(
      `SELECT id, short_code, original_url, description, tags, clicks, created_at 
       FROM urls 
       WHERE LOWER(description) LIKE LOWER($1) 
          OR LOWER(original_url) LIKE LOWER($1)
          OR $1 = ANY(tags)
       ORDER BY created_at DESC`,
      [`%${q}%`]
    );

    const urls = result.rows.map(row => ({
      id: row.id,
      shortUrl: `${BASE_URL}/${row.short_code}`,
      originalUrl: row.original_url,
      description: row.description,
      tags: row.tags || [],
      clicks: row.clicks,
      createdAt: row.created_at
    }));

    res.json(urls);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Redirect short URL
app.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const result = await pool.query(
      'SELECT id, original_url, expires_at FROM urls WHERE short_code = $1',
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

    const urlData = result.rows[0];

    // Check if URL has expired
    if (urlData.expires_at && new Date(urlData.expires_at) < new Date()) {
      return res.status(410).send(`
        <html>
          <head><title>URL Expired</title></head>
          <body style="text-align:center;padding:50px;font-family:sans-serif;">
            <h1>⏰ URL Expired</h1>
            <p>This short URL has expired and is no longer available.</p>
            <a href="/">Go to homepage</a>
          </body>
        </html>
      `);
    }

    // Log click event for analytics
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await pool.query(
      'INSERT INTO click_events (url_id, ip_address, user_agent) VALUES ($1, $2, $3)',
      [urlData.id, ip, userAgent]
    );

    // Increment click count
    await pool.query('UPDATE urls SET clicks = clicks + 1 WHERE id = $1', [urlData.id]);

    // Redirect
    res.redirect(urlData.original_url);
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).send('Internal server error');
  }
});

// Get analytics for a specific URL
app.get('/api/analytics/:code', async (req, res) => {
  try {
    const { code } = req.params;

    // Get URL info
    const urlResult = await pool.query(
      'SELECT id, short_code, original_url, description, tags, clicks, created_at, expires_at FROM urls WHERE short_code = $1',
      [code]
    );

    if (urlResult.rows.length === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }

    const urlData = urlResult.rows[0];

    // Get daily click statistics (last 30 days)
    const dailyStats = await pool.query(
      `SELECT DATE(clicked_at) as date, COUNT(*) as clicks
       FROM click_events
       WHERE url_id = $1 AND clicked_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(clicked_at)
       ORDER BY DATE(clicked_at) DESC`,
      [urlData.id]
    );

    // Get top user agents
    const topUserAgents = await pool.query(
      `SELECT user_agent, COUNT(*) as count
       FROM click_events
       WHERE url_id = $1
       GROUP BY user_agent
       ORDER BY count DESC
       LIMIT 10`,
      [urlData.id]
    );

    res.json({
      url: {
        shortUrl: `${BASE_URL}/${urlData.short_code}`,
        originalUrl: urlData.original_url,
        description: urlData.description,
        tags: urlData.tags || [],
        totalClicks: urlData.clicks,
        createdAt: urlData.created_at,
        expiresAt: urlData.expires_at
      },
      dailyStats: dailyStats.rows,
      topUserAgents: topUserAgents.rows
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get global analytics (top URLs)
app.get('/api/analytics', async (req, res) => {
  try {
    const { limit = 10, days = 7 } = req.query;

    // Get top URLs by clicks in the last N days
    const topUrls = await pool.query(
      `SELECT u.id, u.short_code, u.original_url, u.description, u.tags, u.clicks, u.created_at,
              COUNT(ce.id) as recent_clicks
       FROM urls u
       LEFT JOIN click_events ce ON u.id = ce.url_id AND ce.clicked_at >= NOW() - INTERVAL '${days} days'
       WHERE u.expires_at IS NULL OR u.expires_at > NOW()
       GROUP BY u.id
       ORDER BY u.clicks DESC
       LIMIT $1`,
      [limit]
    );

    // Get total clicks across all URLs
    const totalClicks = await pool.query('SELECT SUM(clicks) as total FROM urls');

    res.json({
      totalClicks: parseInt(totalClicks.rows[0].total) || 0,
      topUrls: topUrls.rows.map(row => ({
        shortUrl: `${BASE_URL}/${row.short_code}`,
        originalUrl: row.original_url,
        description: row.description,
        tags: row.tags || [],
        totalClicks: row.clicks,
        recentClicks: parseInt(row.recent_clicks),
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    console.error('Global analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a URL
app.delete('/api/urls/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM urls WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'URL not found' });
    }

    res.json({ message: 'URL deleted successfully' });
  } catch (error) {
    console.error('Delete URL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve frontend
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
