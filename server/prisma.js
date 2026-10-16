import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL no está configurada");

const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });
