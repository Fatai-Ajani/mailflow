ALTER TABLE templates ADD COLUMN batch_name TEXT NOT NULL DEFAULT 'General';
ALTER TABLE campaigns ADD COLUMN rotation_mode TEXT NOT NULL DEFAULT 'random';
ALTER TABLE campaigns ADD COLUMN template_batches TEXT NOT NULL DEFAULT '[]';