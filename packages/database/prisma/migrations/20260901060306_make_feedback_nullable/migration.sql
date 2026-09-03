-- AlterTable
ALTER TABLE "Feedback" ALTER COLUMN "punctuality" DROP NOT NULL,
ALTER COLUMN "interest" DROP NOT NULL,
ALTER COLUMN "thoroughness" DROP NOT NULL,
ALTER COLUMN "friendliness" DROP NOT NULL;
