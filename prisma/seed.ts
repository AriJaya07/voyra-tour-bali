import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@travel.com" },
    update: {},
    create: {
      email: "admin@travel.com",
      password: hashed,
      name: "Admin",
      role: "admin",
    },
  });

  console.log("✅ Seed selesai — admin@travel.com / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());