-- Fix short_code column size to support custom codes up to 20 chars
ALTER TABLE urls ALTER COLUMN short_code TYPE VARCHAR(20);
