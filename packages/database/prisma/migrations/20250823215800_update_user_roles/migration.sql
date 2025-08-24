-- First, create a new enum type with the desired values
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'MEMBER');

-- Remove the default value temporarily
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;

-- Convert existing data to the new enum
ALTER TABLE users 
  ALTER COLUMN role TYPE "UserRole_new" 
  USING (
    CASE 
      WHEN role::text = 'ADMIN' THEN 'ADMIN'::text::"UserRole_new"
      WHEN role::text IN ('DATA_ENGINEER', 'ML_ENGINEER', 'COMPLIANCE_OFFICER') THEN 'MEMBER'::text::"UserRole_new"
      ELSE 'MEMBER'::text::"UserRole_new"
    END
  );

-- Drop the old enum
DROP TYPE "UserRole";

-- Rename the new enum to the original name
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- Set the default value back to ADMIN (as per schema)
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'ADMIN'::"UserRole";