/*
  Warnings:

  - You are about to drop the column `totalAmound` on the `Order` table. All the data in the column will be lost.
  - Added the required column `totalAmount` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "totalAmound",
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL;
