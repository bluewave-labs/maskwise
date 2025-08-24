-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_policyId_fkey";

-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "policyId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
