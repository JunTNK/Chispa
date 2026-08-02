-- ═══════════════════════════════════════════════════════════
-- MIGRATION 007: Language preference (cross-device)
-- ═══════════════════════════════════════════════════════════
-- Guarda el idioma de la UI en el Digital Twin para que siga
-- al usuario entre dispositivos (push/pull del sync).
--   1. Aplica en Supabase (SQL editor) o con `supabase db push`
--   2. Regenera tipos con `supabase gen types typescript`
-- ═══════════════════════════════════════════════════════════

alter table public.digital_twins
  add column if not exists lang text not null default 'es'
  check (lang in ('es', 'en'));
