-- Migration: 0023_ai_intelligence
-- Description: Expand schema for AI Entertainment Intelligence Engine

-- Add ai_metadata to media_items to permanently cache Groq generation
ALTER TABLE public.media_items
ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT NULL;

-- Add dna_v2 to profiles to track expansive AI taste metrics
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS dna_v2 JSONB DEFAULT NULL;
