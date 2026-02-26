-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDesc" TEXT,
    "price" DOUBLE PRECISION,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" INTEGER,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoryId" INTEGER,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "destinationId" INTEGER,
    "packageId" INTEGER,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_slug_key" ON "Destination"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Package_slug_key" ON "Package"("slug");

-- AddForeignKey
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
