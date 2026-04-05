-- Add support for custom short codes and URL expiration
ALTER TABLE urls ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE urls ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;

-- Create click_events table for analytics
CREATE TABLE IF NOT EXISTS click_events (
  id SERIAL PRIMARY KEY,
  url_id INTEGER REFERENCES urls(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Create index for expiration check
CREATE INDEX IF NOT EXISTS idx_urls_expires_at ON urls(expires_at);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_click_events_url_id ON click_events(url_id);
CREATE INDEX IF NOT EXISTS idx_click_events_clicked_at ON click_events(clicked_at);
