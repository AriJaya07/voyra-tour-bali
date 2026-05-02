-- CreateTable
CREATE TABLE "AiFamilySeat" (
    "id" SERIAL NOT NULL,
    "ownerUserId" INTEGER NOT NULL,
    "memberUserId" INTEGER,
    "inviteEmail" TEXT,
    "inviteToken" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiFamilySeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiFamilySeat_memberUserId_key" ON "AiFamilySeat"("memberUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AiFamilySeat_inviteToken_key" ON "AiFamilySeat"("inviteToken");

-- CreateIndex
CREATE INDEX "AiFamilySeat_ownerUserId_idx" ON "AiFamilySeat"("ownerUserId");

-- CreateIndex
CREATE INDEX "AiFamilySeat_inviteEmail_idx" ON "AiFamilySeat"("inviteEmail");

-- AddForeignKey
ALTER TABLE "AiFamilySeat" ADD CONSTRAINT "AiFamilySeat_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiFamilySeat" ADD CONSTRAINT "AiFamilySeat_memberUserId_fkey" FOREIGN KEY ("memberUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
