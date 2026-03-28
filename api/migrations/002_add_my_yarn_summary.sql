-- Add user-override columns for yarn summary (editable in place)
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS my_hook_size text;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS my_yarn_weight text;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS my_yardage text;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS my_skeins text;
