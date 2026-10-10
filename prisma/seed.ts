// تشغيل: npx tsx prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { SAMPLE_LISTINGS } from '../lib/sample_data';

const prisma = new PrismaClient();

async function main() {
  await prisma.listing.deleteMany();
  for (const { id, ...data } of SAMPLE_LISTINGS) {
    await prisma.listing.create({ data });
  }
  console.log('تمت إضافة', SAMPLE_LISTINGS.length, 'إعلانات');
}

main().finally(() => prisma.$disconnect());
