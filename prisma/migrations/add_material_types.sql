-- Add type, angle fields and MaterialType enum to opportunity_materials table
-- Migration: add_material_types

-- Create MaterialType enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "MaterialType" AS ENUM('PIPE', 'FITTING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to opportunity_materials table
ALTER TABLE "opportunity_materials"
ADD COLUMN IF NOT EXISTS "type" "MaterialType" NOT NULL DEFAULT 'PIPE',
ADD COLUMN IF NOT EXISTS "angle" TEXT;

-- Add index on type column
CREATE INDEX IF NOT EXISTS "opportunity_materials_type_idx" ON "opportunity_materials"("type");

-- Make class and angle optional (they already should be, but ensuring)
ALTER TABLE "opportunity_materials"
ALTER COLUMN "class" DROP NOT NULL,
ALTER COLUMN "angle" DROP NOT NULL;
