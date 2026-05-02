-- CreateTable
CREATE TABLE "AiChatMemory" (
    "userId" INTEGER NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "notes" JSONB NOT NULL DEFAULT '[]',
    "turnCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChatMemory_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "AiChatMemory" ADD CONSTRAINT "AiChatMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
