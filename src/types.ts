import type { PrismaClient } from "../prisma/prisma/client";

export interface AppEnv {
	DB: D1Database;
	IMAGES: R2Bucket;
	JWT_SECRET: string;
	JWT_EXPIRES_IN: string;
	REFRESH_TOKEN_TTL: string;
}

export interface AppVariables {
	userId: number;
	db: PrismaClient;
}
