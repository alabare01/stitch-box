-- Add sub_counter_state JSONB column to patterns table
-- Stores per-row sub-counter dot progress and stitch marker positions
-- Structure: { [rowIndex]: { dots: [true, false, ...], markers: [{position: 2, color: '#F5C842'}] } }
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS sub_counter_state JSONB DEFAULT '{}'::jsonb;
