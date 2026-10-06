-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_slug_key" ON "Exercise"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Workout_slug_key" ON "Workout"("slug");

