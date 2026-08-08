import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "../../prisma/prisma/client";

export function createPrisma(db: D1Database): PrismaClient {
	const adapter = new PrismaD1(db);
	return new PrismaClient({ adapter });
}
