-- ============================================================
-- Add branch_id to profiles for branch-scoped admin access
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS branch_id uuid
REFERENCES public.branches(id);