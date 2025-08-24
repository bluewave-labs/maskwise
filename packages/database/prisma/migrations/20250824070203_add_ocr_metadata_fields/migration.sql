-- AlterEnum
ALTER TYPE "DatasetStatus" ADD VALUE 'UPLOADED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FileType" ADD VALUE 'DOC';
ALTER TYPE "FileType" ADD VALUE 'XLSX';
ALTER TYPE "FileType" ADD VALUE 'XLS';
ALTER TYPE "FileType" ADD VALUE 'PPTX';
ALTER TYPE "FileType" ADD VALUE 'PPT';
ALTER TYPE "FileType" ADD VALUE 'ODT';
ALTER TYPE "FileType" ADD VALUE 'ODS';
ALTER TYPE "FileType" ADD VALUE 'ODP';
ALTER TYPE "FileType" ADD VALUE 'RTF';
ALTER TYPE "FileType" ADD VALUE 'HTML';
ALTER TYPE "FileType" ADD VALUE 'XML';
ALTER TYPE "FileType" ADD VALUE 'JPEG';
ALTER TYPE "FileType" ADD VALUE 'PNG';
ALTER TYPE "FileType" ADD VALUE 'TIFF';
ALTER TYPE "FileType" ADD VALUE 'BMP';
ALTER TYPE "FileType" ADD VALUE 'GIF';

-- AlterTable
ALTER TABLE "datasets" ADD COLUMN     "extractionConfidence" DOUBLE PRECISION,
ADD COLUMN     "extractionMethod" TEXT,
ADD COLUMN     "ocrMetadata" JSONB;
