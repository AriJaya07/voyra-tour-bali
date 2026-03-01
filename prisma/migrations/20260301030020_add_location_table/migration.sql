-- CreateTable
CREATE TABLE "Content" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "subTitle" TEXT,
    "description" TEXT NOT NULL,
    "image1" TEXT,
    "image2" TEXT,
    "image3" TEXT,
    "image4" TEXT,
    "image5" TEXT,
    "imageMain" TEXT,
    "dateAvailable" TIMESTAMP(3) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "destinationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT,
    "hrefLink" TEXT,
    "description" TEXT,
    "destinationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
