-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "primaryMuscles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "secondaryMuscles" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "PlanExercise" ADD COLUMN     "primaryMuscles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "secondaryMuscles" TEXT[] DEFAULT ARRAY[]::TEXT[];

