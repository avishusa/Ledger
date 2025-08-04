-- CreateTable
CREATE TABLE "public"."IngestLog" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "fileName" TEXT,
    "ledgerId" INTEGER,

    CONSTRAINT "IngestLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."IngestLog" ADD CONSTRAINT "IngestLog_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "public"."Ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;
