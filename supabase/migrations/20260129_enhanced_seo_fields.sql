-- Migration: Add enhanced SEO fields to crawled_pages table
-- This migration adds all the new fields collected by the enhanced crawler

-- Add new columns to crawled_pages table
ALTER TABLE crawled_pages
ADD COLUMN IF NOT EXISTS internal_link_urls JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS external_link_urls JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS image_details JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS url_slug TEXT,
ADD COLUMN IF NOT EXISTS url_depth INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_https BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS has_mobile_viewport BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS open_graph JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS schema_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hreflang_tags JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS last_modified TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS has_author_info BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_date_published BOOLEAN DEFAULT false;

-- Create indexes for new fields that will be queried
CREATE INDEX IF NOT EXISTS idx_crawled_pages_content_hash ON crawled_pages(content_hash);
CREATE INDEX IF NOT EXISTS idx_crawled_pages_url_slug ON crawled_pages(url_slug);
CREATE INDEX IF NOT EXISTS idx_crawled_pages_is_https ON crawled_pages(is_https);
CREATE INDEX IF NOT EXISTS idx_crawled_pages_last_modified ON crawled_pages(last_modified);

-- Add comment for documentation
COMMENT ON COLUMN crawled_pages.internal_link_urls IS 'Array of internal links with URLs and anchor text';
COMMENT ON COLUMN crawled_pages.external_link_urls IS 'Array of external links with URLs, anchor text, and nofollow status';
COMMENT ON COLUMN crawled_pages.image_details IS 'Array of image details including URL, alt, dimensions, format, lazy loading';
COMMENT ON COLUMN crawled_pages.open_graph IS 'Open Graph meta tags data';
COMMENT ON COLUMN crawled_pages.schema_data IS 'Detected schema markup types';
COMMENT ON COLUMN crawled_pages.content_hash IS 'Hash of main content for duplicate detection';
COMMENT ON COLUMN crawled_pages.content_hash IS 'Hash of main content for duplicate detection';
