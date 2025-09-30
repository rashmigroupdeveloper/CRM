-- Remove quantity, sizeDI, and classification fields from opportunities table
ALTER TABLE opportunities DROP COLUMN IF EXISTS quantity;
ALTER TABLE opportunities DROP COLUMN IF EXISTS "sizeDI";
ALTER TABLE opportunities DROP COLUMN IF EXISTS classification;
