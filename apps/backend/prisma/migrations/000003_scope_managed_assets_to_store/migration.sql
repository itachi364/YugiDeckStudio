-- Associate configurable managed assets with the owning store for scoped lookup selectors.
ALTER TABLE "ManagedImageAsset" ADD COLUMN "storeId" TEXT;

ALTER TABLE "ManagedImageAsset"
ADD CONSTRAINT "ManagedImageAsset_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ManagedImageAsset_storeId_category_idx" ON "ManagedImageAsset"("storeId", "category");
