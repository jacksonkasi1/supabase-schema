-- Sample Multi-Schema Database for Testing Schema Grouping
-- This file demonstrates tables across multiple schemas (public, auth, storage)
-- Import this file using the "Import SQL" button to test schema grouping

-- ============================================
-- PUBLIC SCHEMA - Main application tables
-- ============================================

CREATE TABLE public.users (
  id BIGINT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(100),
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.posts (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.posts
  ADD CONSTRAINT fk_posts_user
  FOREIGN KEY (user_id)
  REFERENCES users(id);

CREATE TABLE public.comments (
  id BIGINT PRIMARY KEY,
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.comments
  ADD CONSTRAINT fk_comments_post
  FOREIGN KEY (post_id)
  REFERENCES posts(id);

ALTER TABLE public.comments
  ADD CONSTRAINT fk_comments_user
  FOREIGN KEY (user_id)
  REFERENCES users(id);

CREATE TABLE public.categories (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.post_categories (
  post_id BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  PRIMARY KEY (post_id, category_id)
);

ALTER TABLE public.post_categories
  ADD CONSTRAINT fk_post_categories_post
  FOREIGN KEY (post_id)
  REFERENCES posts(id);

ALTER TABLE public.post_categories
  ADD CONSTRAINT fk_post_categories_category
  FOREIGN KEY (category_id)
  REFERENCES categories(id);

-- ============================================
-- AUTH SCHEMA - Authentication tables
-- ============================================

CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  encrypted_password VARCHAR(255),
  email_confirmed_at TIMESTAMP,
  last_sign_in_at TIMESTAMP,
  raw_app_meta_data JSONB,
  raw_user_meta_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE auth.sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  token VARCHAR(255) NOT NULL,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

ALTER TABLE auth.sessions
  ADD CONSTRAINT fk_sessions_user
  FOREIGN KEY (user_id)
  REFERENCES users(id);

CREATE TABLE auth.refresh_tokens (
  id BIGINT PRIMARY KEY,
  user_id UUID NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

ALTER TABLE auth.refresh_tokens
  ADD CONSTRAINT fk_refresh_tokens_user
  FOREIGN KEY (user_id)
  REFERENCES users(id);

CREATE TABLE auth.audit_log (
  id BIGINT PRIMARY KEY,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  ip_address VARCHAR(50),
  user_agent TEXT,
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE auth.audit_log
  ADD CONSTRAINT fk_audit_log_user
  FOREIGN KEY (user_id)
  REFERENCES users(id);

-- ============================================
-- STORAGE SCHEMA - File storage tables
-- ============================================

CREATE TABLE storage.buckets (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  owner UUID,
  public BOOLEAN DEFAULT FALSE,
  file_size_limit BIGINT,
  allowed_mime_types TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE storage.objects (
  id UUID PRIMARY KEY,
  bucket_id VARCHAR(255) NOT NULL,
  name TEXT NOT NULL,
  owner UUID,
  path_tokens TEXT[],
  version VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE storage.objects
  ADD CONSTRAINT fk_objects_bucket
  FOREIGN KEY (bucket_id)
  REFERENCES buckets(id);

CREATE TABLE storage.migrations (
  id INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  hash VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- VIEWS
-- ============================================

CREATE VIEW public.user_post_count AS
SELECT
  u.id,
  u.username,
  COUNT(p.id) as post_count
FROM public.users u
LEFT JOIN public.posts p ON p.user_id = u.id
GROUP BY u.id, u.username;

CREATE VIEW auth.active_sessions AS
SELECT
  s.id,
  s.user_id,
  u.email,
  s.ip_address,
  s.created_at,
  s.expires_at
FROM auth.sessions s
JOIN auth.users u ON u.id = s.user_id
WHERE s.expires_at > NOW();
