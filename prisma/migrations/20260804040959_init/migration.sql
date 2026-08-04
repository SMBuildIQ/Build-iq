-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "companyName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "squareFeet" INTEGER,
    "stories" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Blueprint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sheetType" TEXT,
    "pageCount" INTEGER NOT NULL DEFAULT 1,
    "analysisJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "Blueprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaterialItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "unitCost" REAL NOT NULL,
    "laborHours" REAL NOT NULL DEFAULT 0,
    "laborRate" REAL NOT NULL DEFAULT 0,
    "wasteFactor" REAL NOT NULL DEFAULT 0.1,
    "spruceSku" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "confidence" REAL,
    "projectId" TEXT NOT NULL,
    "bidPackageId" TEXT,
    CONSTRAINT "MaterialItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MaterialItem_bidPackageId_fkey" FOREIGN KEY ("bidPackageId") REFERENCES "BidPackage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Estimate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "materialCost" REAL NOT NULL,
    "laborCost" REAL NOT NULL,
    "wasteCost" REAL NOT NULL,
    "contingencyPct" REAL NOT NULL DEFAULT 0.1,
    "contingencyCost" REAL NOT NULL,
    "overheadPct" REAL NOT NULL DEFAULT 0.08,
    "overheadCost" REAL NOT NULL,
    "profitPct" REAL NOT NULL DEFAULT 0.12,
    "profitAmount" REAL NOT NULL,
    "taxPct" REAL NOT NULL DEFAULT 0.065,
    "taxAmount" REAL NOT NULL,
    "grandTotal" REAL NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "Estimate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BidPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trade" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "BidPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpruceSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiEndpoint" TEXT,
    "soapEndpoint" TEXT,
    "apiKey" TEXT,
    "branchCode" TEXT,
    "accountNumber" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mockMode" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "SpruceSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpruceSyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "payload" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "SpruceSyncLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_projectId_key" ON "Estimate"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "SpruceSettings_userId_key" ON "SpruceSettings"("userId");
