import type { AppEnv } from "../types";

export const testEnv: AppEnv = {
	DB: {} as D1Database,
	JWT_SECRET: "test-secret-key",
	JWT_EXPIRES_IN: "15m",
	REFRESH_TOKEN_TTL: "30d",
};
