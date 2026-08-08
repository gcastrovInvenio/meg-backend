import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword", () => {
	it("genera un hash con el formato pbkdf2_sha256$100000$", async () => {
		const hash = await hashPassword("password123");
		expect(hash.startsWith("pbkdf2_sha256$100000$")).toBe(true);
		expect(hash.split("$")).toHaveLength(4);
	});

	it("produce hashes distintos para la misma contraseña", async () => {
		const a = await hashPassword("password123");
		const b = await hashPassword("password123");
		expect(a).not.toBe(b);
	});
});

describe("verifyPassword", () => {
	it("acepta la contraseña correcta", async () => {
		const hash = await hashPassword("password123");
		expect(await verifyPassword("password123", hash)).toBe(true);
	});

	it("rechaza una contraseña incorrecta", async () => {
		const hash = await hashPassword("password123");
		expect(await verifyPassword("incorrecta", hash)).toBe(false);
	});

	it("rechaza hashes mal formados", async () => {
		expect(await verifyPassword("password123", "sin-validar")).toBe(false);
		expect(
			await verifyPassword("password123", "pbkdf2_sha256$abc$salt$derived"),
		).toBe(false);
		expect(
			await verifyPassword("password123", "pbkdf2_sha256$0$salt$derived"),
		).toBe(false);
	});

	it("verifica un hash generado por hashPassword tras varias iteraciones", async () => {
		const hash = await hashPassword("otra-contrasena");
		expect(await verifyPassword("otra-contrasena", hash)).toBe(true);
		expect(await verifyPassword("equivocada", hash)).toBe(false);
	});
});
