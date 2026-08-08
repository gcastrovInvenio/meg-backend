import type { Context, Next } from "hono";
import { verifyAccessToken } from "../lib/tokens";
import type { AppEnv, AppVariables } from "../types";

export async function requireAuth(
	c: Context<{ Bindings: AppEnv; Variables: AppVariables }>,
	next: Next,
) {
	const header = c.req.header("Authorization");
	const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
	if (!token) {
		return c.json({ error: "No autenticado" }, 401);
	}
	try {
		const userId = await verifyAccessToken(token, c.env.JWT_SECRET);
		c.set("userId", userId);
		return next();
	} catch {
		return c.json({ error: "Token inválido o expirado" }, 401);
	}
}
