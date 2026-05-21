-- CreateEnum
CREATE TYPE "DeckSection" AS ENUM ('MAIN', 'EXTRA', 'SIDE');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'EXTRACTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "DeckStatus" AS ENUM ('UPLOADED', 'EXTRACTED', 'REVIEWED', 'IMAGE_GENERATED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ResolutionStatus" AS ENUM ('UNRESOLVED', 'RESOLVED', 'AMBIGUOUS');

-- CreateEnum
CREATE TYPE "ImageAssetCategory" AS ENUM ('UPLOADED_DECKLIST', 'GENERATED_DECK_IMAGE', 'CARD_IMAGE', 'STORE_LOGO', 'EVENT_LOGO', 'SOCIAL_LOGO', 'BACKGROUND_IMAGE');

-- CreateEnum
CREATE TYPE "RetentionPolicy" AS ENUM ('TEMPORARY_CLEANUP_ALLOWED', 'PERMANENT');

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primaryLogoAssetId" TEXT,
    "secondaryLogoAssetId" TEXT,
    "backgroundImageAssetId" TEXT,
    "backgroundColor" TEXT,
    "sourceCreditText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSocialLink" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "url" TEXT,
    "iconAssetId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StoreSocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventType" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoAssetId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentType" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoAssetId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "storeId" TEXT,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isRoot" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "eventTypeId" TEXT,
    "tournamentTypeId" TEXT,
    "name" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "deckName" TEXT NOT NULL,
    "resultLabel" TEXT NOT NULL,
    "uploadedImageAssetId" TEXT NOT NULL,
    "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "status" "DeckStatus" NOT NULL DEFAULT 'UPLOADED',
    "inactiveAt" TIMESTAMP(3),
    "inactiveByUserId" TEXT,
    "inactivityReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeckCard" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "section" "DeckSection" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "resolvedEnglishName" TEXT,
    "cardId" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "resolutionStatus" "ResolutionStatus" NOT NULL DEFAULT 'UNRESOLVED',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DeckCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "ygoprodeckId" INTEGER NOT NULL,
    "officialName" TEXT NOT NULL,
    "cardType" TEXT,
    "frameType" TEXT,
    "imageAssetId" TEXT,
    "imageUrlSource" TEXT,
    "rawPayloadJson" JSONB,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDeckImage" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "imageAssetId" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDeckImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedImageAsset" (
    "id" TEXT NOT NULL,
    "category" "ImageAssetCategory" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalFilename" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "retentionPolicy" "RetentionPolicy" NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ManagedImageAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreSocialLink_storeId_idx" ON "StoreSocialLink"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "EventType_storeId_name_key" ON "EventType"("storeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentType_storeId_name_key" ON "TournamentType"("storeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_storeId_idx" ON "User"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "Tournament_storeId_idx" ON "Tournament"("storeId");

-- CreateIndex
CREATE INDEX "Deck_storeId_idx" ON "Deck"("storeId");

-- CreateIndex
CREATE INDEX "Deck_status_idx" ON "Deck"("status");

-- CreateIndex
CREATE INDEX "DeckCard_deckId_section_idx" ON "DeckCard"("deckId", "section");

-- CreateIndex
CREATE UNIQUE INDEX "Card_ygoprodeckId_key" ON "Card"("ygoprodeckId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_officialName_key" ON "Card"("officialName");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedImageAsset_storagePath_key" ON "ManagedImageAsset"("storagePath");

-- CreateIndex
CREATE INDEX "ManagedImageAsset_category_idx" ON "ManagedImageAsset"("category");

-- CreateIndex
CREATE INDEX "ManagedImageAsset_retentionPolicy_idx" ON "ManagedImageAsset"("retentionPolicy");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_primaryLogoAssetId_fkey" FOREIGN KEY ("primaryLogoAssetId") REFERENCES "ManagedImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_secondaryLogoAssetId_fkey" FOREIGN KEY ("secondaryLogoAssetId") REFERENCES "ManagedImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_backgroundImageAssetId_fkey" FOREIGN KEY ("backgroundImageAssetId") REFERENCES "ManagedImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSocialLink" ADD CONSTRAINT "StoreSocialLink_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSocialLink" ADD CONSTRAINT "StoreSocialLink_iconAssetId_fkey" FOREIGN KEY ("iconAssetId") REFERENCES "ManagedImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "ManagedImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentType" ADD CONSTRAINT "TournamentType_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentType" ADD CONSTRAINT "TournamentType_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "ManagedImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_tournamentTypeId_fkey" FOREIGN KEY ("tournamentTypeId") REFERENCES "TournamentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_uploadedImageAssetId_fkey" FOREIGN KEY ("uploadedImageAssetId") REFERENCES "ManagedImageAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_inactiveByUserId_fkey" FOREIGN KEY ("inactiveByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckCard" ADD CONSTRAINT "DeckCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeckCard" ADD CONSTRAINT "DeckCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "ManagedImageAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDeckImage" ADD CONSTRAINT "GeneratedDeckImage_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDeckImage" ADD CONSTRAINT "GeneratedDeckImage_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "ManagedImageAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
