-- ============================================================
-- PostgreSQL Sample Schema (Advanced Version)
-- Features: ENUMs, SERIAL/IDENTITY, Nullable/Not Null fields
-- ============================================================
-- Step 1: Create ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'author', 'reader');
CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE reaction_type AS ENUM ('like', 'love', 'laugh', 'angry', 'sad');
-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role DEFAULT 'reader' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- ============================================================
-- USER PROFILES TABLE
-- ============================================================
CREATE TABLE user_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  website VARCHAR(255),
  location VARCHAR(150),
  birthday DATE
);
-- ============================================================
-- POSTS TABLE
-- ============================================================
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  status post_status DEFAULT 'draft' NOT NULL,
  view_count INTEGER DEFAULT 0 NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- ============================================================
-- COMMENTS TABLE
-- ============================================================
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE
  SET NULL,
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- ============================================================
-- CATEGORIES TABLE
-- ============================================================
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL
);
-- ============================================================
-- POST-CATEGORIES JUNCTION TABLE
-- ============================================================
CREATE TABLE post_categories (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);
-- ============================================================
-- REACTIONS TABLE (Example of ENUM + Nullable user)
-- ============================================================
CREATE TABLE reactions (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE
  SET NULL,
    type reaction_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- ============================================================
-- POST STATISTICS VIEW
-- ============================================================
CREATE VIEW post_stats AS
SELECT p.id AS post_id,
  p.title,
  COUNT(DISTINCT c.id) AS comment_count,
  COUNT(DISTINCT r.id) AS reaction_count,
  COALESCE(
    SUM(
      CASE
        WHEN r.type = 'like' THEN 1
        ELSE 0
      END
    ),
    0
  ) AS likes,
  MAX(p.updated_at) AS last_updated
FROM posts p
  LEFT JOIN comments c ON c.post_id = p.id
  LEFT JOIN reactions r ON r.post_id = p.id
GROUP BY p.id,
  p.title;
-- ============================================================
-- INDEXES (for performance)
-- ============================================================
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_reactions_post_id ON reactions(post_id);
CREATE INDEX idx_post_status ON posts(status);
CREATE INDEX idx_user_role ON users(role);