-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Participant" (
    "login" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "parallelName" TEXT NOT NULL,
    "expValue" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "expToNextLevel" INTEGER NOT NULL,
    "campusId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "logtime" DOUBLE PRECISION,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("login")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "participantLogin" TEXT NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL,
    "participantLogin" TEXT NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Points" (
    "participantLogin" TEXT NOT NULL,
    "prp" INTEGER NOT NULL,
    "crp" INTEGER NOT NULL,
    "coins" INTEGER NOT NULL,

    CONSTRAINT "Points_pkey" PRIMARY KEY ("participantLogin")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "participantLogin" TEXT NOT NULL,
    "punctuality" DOUBLE PRECISION NOT NULL,
    "interest" DOUBLE PRECISION NOT NULL,
    "thoroughness" DOUBLE PRECISION NOT NULL,
    "friendliness" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("participantLogin")
);

-- CreateTable
CREATE TABLE "ExpEntry" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "participantLogin" TEXT NOT NULL,

    CONSTRAINT "ExpEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_participantLogin_fkey" FOREIGN KEY ("participantLogin") REFERENCES "Participant"("login") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_participantLogin_fkey" FOREIGN KEY ("participantLogin") REFERENCES "Participant"("login") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Points" ADD CONSTRAINT "Points_participantLogin_fkey" FOREIGN KEY ("participantLogin") REFERENCES "Participant"("login") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_participantLogin_fkey" FOREIGN KEY ("participantLogin") REFERENCES "Participant"("login") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpEntry" ADD CONSTRAINT "ExpEntry_participantLogin_fkey" FOREIGN KEY ("participantLogin") REFERENCES "Participant"("login") ON DELETE RESTRICT ON UPDATE CASCADE;

