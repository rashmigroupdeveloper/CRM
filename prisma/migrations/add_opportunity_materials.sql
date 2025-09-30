-- CreateTable
CREATE TABLE "opportunity_materials" (
    "id" SERIAL NOT NULL,
    "opportunityId" INTEGER NOT NULL,
    "materialDescription" TEXT NOT NULL,
    "diameter" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitOfMeasurement" TEXT NOT NULL DEFAULT 'MT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunity_materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opportunity_materials_opportunityId_idx" ON "opportunity_materials"("opportunityId");

-- AddForeignKey
ALTER TABLE "opportunity_materials" ADD CONSTRAINT "opportunity_materials_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
