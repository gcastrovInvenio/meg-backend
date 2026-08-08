import { describe, expect, it } from "vitest";
import { testEnv } from "../test/test-env";
import {
	parseDuration,
	randomRefreshToken,
	signAccessToken,
	verifyAccessToken,
} from "./tokens";

describe("parseDuration", () => {
	it("convierte unidades de tiempo a segundos", () => {
		expect(parseDuration("15m")).toBe(900);
		expect(parseDuration("1d")).toBe(86400);
		expect(parseDuration("2h")).toBe(7200);
		expect(parseDuration("90s")).toBe(90);
	});

	it("usa segundos por defecto si no hay unidad", () => {
		expect(parseDuration("30")).toBe(30);
	});

	it("acepta números directamente", () => {
		expect(parseDuration(120)).toBe(120);
	});

	it("lanza un error con valores inválidos", () => {
		expect(() => parseDuration("abc")).toThrow("Duración inválida");
		expect(() => parseDuration("")).toThrow("Duración inválida");
	});
});

describe("signAccessToken / verifyAccessToken", () => {
	it("firma y verifica un token devolviendo el userId", async () => {
		const token = await signAccessToken(testEnv, 7);
		expect(await verifyAccessToken(token, testEnv.JWT_SECRET)).toBe(7);
	});

	it("aplica la expiración configurada", async () => {
		const env = { ...testEnv, JWT_EXPIRES_IN: "5m" };
		const token = await signAccessToken(env, 1);
		const payload = JSON.parse(
			Buffer.from(token.split(".")[1], "base64url").toString(),
		);
		expect(payload.exp - payload.iat).toBe(300);
	});

	it("rechaza tokens firmados con otro secreto", async () => {
		const token = await signAccessToken(testEnv, 7);
		await expect(verifyAccessToken(token, "otro-secreto")).rejects.toThrow();
	});

	it("rechaza tokens alterados", async () => {
		const token = await signAccessToken(testEnv, 7);
		const [, , firma] = token.split(".");
		const firmaAlterada =
			firma.slice(0, 10) + (firma[10] === "a" ? "b" : "a") + firma.slice(11);
		const alterado = `${token.split(".")[0]}.${token.split(".")[1]}.${firmaAlterada}`;
		await expect(
			verifyAccessToken(alterado, testEnv.JWT_SECRET),
		).rejects.toThrow();
	});
});

describe("randomRefreshToken", () => {
	it("genera un token base64url de 64 caracteres", () => {
		const token = randomRefreshToken();
		expect(token).toMatch(/^[A-Za-z0-9_-]{64}$/);
	});

	it("genera tokens distintos en cada llamada", () => {
		expect(randomRefreshToken()).not.toBe(randomRefreshToken());
	});
});
