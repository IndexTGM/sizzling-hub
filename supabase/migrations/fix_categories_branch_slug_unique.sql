-- Migration: Fix category slug uniqueness to be per-branch
-- Previously: UNIQUE(slug) — prevents same category name across ALL branches
-- Now: UNIQUE(branch_id, slug) — allows same category name in different branches

-- Drop the old global unique constraint
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_slug_key;

-- Add new composite unique constraint scoped per branch
ALTER TABLE public.categories ADD CONSTRAINT categories_branch_slug_key UNIQUE (branch_id, slug);