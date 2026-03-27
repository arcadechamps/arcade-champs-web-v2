
-- Add rom_path and core columns to games table
ALTER TABLE public.games ADD COLUMN rom_path text;
ALTER TABLE public.games ADD COLUMN core text NOT NULL DEFAULT 'mame2003_plus';
ALTER TABLE public.games ADD COLUMN description text;
