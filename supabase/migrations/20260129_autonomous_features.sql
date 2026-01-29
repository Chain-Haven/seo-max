-- Migration: Autonomous SEO + AI Development Features
-- Run this in Supabase SQL Editor

-- 1. User Feedback table (for autonomous dev agent to read)
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'improvement', 'other')),
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'addressed', 'dismissed')),
    addressed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON user_feedback
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON user_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for autonomous agent)
CREATE POLICY "Service role full access on user_feedback" ON user_feedback
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 2. Autonomous Changes log table (tracks AI-made changes)
CREATE TABLE IF NOT EXISTS autonomous_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commit_message TEXT,
    files_changed TEXT[] DEFAULT '{}',
    commit_sha TEXT,
    feedback_processed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (read-only for users, full access for service role)
ALTER TABLE autonomous_changes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view changes
CREATE POLICY "Authenticated users can view autonomous changes" ON autonomous_changes
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service role can do everything
CREATE POLICY "Service role full access on autonomous_changes" ON autonomous_changes
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 3. Add last_scan_at column to stores table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stores' AND column_name = 'last_scan_at'
    ) THEN
        ALTER TABLE stores ADD COLUMN last_scan_at TIMESTAMPTZ;
    END IF;
END $$;

-- 4. Add applied_at and dismissed_at columns to seo_improvements if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seo_improvements' AND column_name = 'applied_at'
    ) THEN
        ALTER TABLE seo_improvements ADD COLUMN applied_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seo_improvements' AND column_name = 'dismissed_at'
    ) THEN
        ALTER TABLE seo_improvements ADD COLUMN dismissed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_changes_created ON autonomous_changes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stores_last_scan ON stores(last_scan_at);
