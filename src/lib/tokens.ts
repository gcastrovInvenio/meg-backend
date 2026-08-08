import { sign, verify } from "hono/jwt";
import type { AppEnv } from "../types";
import { bytesToBase64Url } from "./encoding";

export const ACCESS_TOKEN_ALG = "HS256";

type AccessTokenPayload = {
	sub: string;
	iat: number;
	exp: number;
};

export function parseDuration(value: string | number): number {
	if (typeof value === "number") {
		return value;
	}
	const match = /^(\d+)\s*(s|m|h|d)?$/.exec(value.trim());
	if (!match) {
		throw new Error(`Duración inválida: ${value}`);
	}
	const amount = parseInt(match[1], 10);
	const unit = match[2] ?? "s";
	const multiplier: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
	return amount * multiplier[unit];
}

export async function signAccessToken(
	env: AppEnv,
	userId: number,
): Promise<string> {
	const expiresIn = parseDuration(env.JWT_EXPIRES_IN ?? "15m");
	const now = Math.floor(Date.now() / 1000);
	const payload: AccessTokenPayload = {
		sub: String(userId),
		iat: now,
		exp: now + expiresIn,
	};
	return sign(payload, env.JWT_SECRET, ACCESS_TOKEN_ALG);
}

export async function verifyAccessToken(
	token: string,
	secret: string,
): Promise<number> {
	const payload = await verify(token, secret, ACCESS_TOKEN_ALG);
	return Number(payload.sub);
}

export function randomRefreshToken(): string {
	return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(48)));
}
