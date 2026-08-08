import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../prisma/prisma/client";
import { signAccessToken } from "../lib/tokens";
import { testEnv } from "../test/test-env";
import type { AppEnv, AppVariables } from "../types";
import { requireAdmin, requireAuth } from "./middleware";

function makeApp() {
	const app = new Hono<{ Bindings: AppEnv; Variables: AppVariables }>();
	app.get("/protected", requireAuth, (c) =>
		c.json({ ok: true, userId: c.get("userId") }),
	);
	return app;
}

describe("requireAuth", () => {
	it("deja pasar con un token válido y guarda el userId", async () => {
		const token = await signAccessToken(testEnv, 42);
		const app = makeApp();

		const res = await app.request(
			"/protected",
			{ headers: { Authorization: `Bearer ${token}` } },
			testEnv,
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true, userId: 42 });
	});

	it("responde 401 sin header de autorización", async () => {
		const app = makeApp();
		const res = await app.request("/protected", {}, testEnv);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "No autenticado" });
	});

	it("responde 401 si el header no usa el esquema Bearer", async () => {
		const app = makeApp();
		const res = await app.request(
			"/protected",
			{ headers: { Authorization: "Basic abc123" } },
			testEnv,
		);

		expect(res.status).toBe(401);
	});

	it("responde 401 con un token inválido", async () => {
		const app = makeApp();
		const res = await app.request(
			"/protected",
			{ headers: { Authorization: "Bearer no-es-un-token" } },
			testEnv,
		);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({
			error: "Token inválido o expirado",
		});
	});

	it("responde 401 con un token firmado con otro secreto", async () => {
		const otroEnv = { ...testEnv, JWT_SECRET: "otro-secreto" };
		const token = await signAccessToken(otroEnv, 42);
		const app = makeApp();

		const res = await app.request(
			"/protected",
			{ headers: { Authorization: `Bearer ${token}` } },
			testEnv,
		);

		expect(res.status).toBe(401);
	});
});

describe("requireAdmin", () => {
	function makeDb() {
		return {
			usuarioRol: {
				findFirst: vi.fn(),
			},
		};
	}

	function makeApp(db: ReturnType<typeof makeDb>) {
		const app = new Hono<{ Bindings: AppEnv; Variables: AppVariables }>();
		app.use("*", async (c, next) => {
			c.set("db", db as unknown as PrismaClient);
			await next();
		});
		app.get("/admin", requireAdmin, (c) =>
			c.json({ ok: true, userId: c.get("userId") }),
		);
		return app;
	}

	let db: ReturnType<typeof makeDb>;

	beforeEach(() => {
		vi.clearAllMocks();
		db = makeDb();
	});

	it("deja pasar a un usuario con rol administrador y guarda el userId", async () => {
		const token = await signAccessToken(testEnv, 42);
		db.usuarioRol.findFirst.mockResolvedValue({ id_usuario: 42, id_rol: 1 });
		const app = makeApp(db);

		const res = await app.request(
			"/admin",
			{ headers: { Authorization: `Bearer ${token}` } },
			testEnv,
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true, userId: 42 });
		expect(db.usuarioRol.findFirst).toHaveBeenCalledWith({
			where: { id_usuario: 42, rol: { nombre: "Administrador" } },
		});
	});

	it("responde 403 si el usuario no tiene el rol administrador", async () => {
		const token = await signAccessToken(testEnv, 42);
		db.usuarioRol.findFirst.mockResolvedValue(null);
		const app = makeApp(db);

		const res = await app.request(
			"/admin",
			{ headers: { Authorization: `Bearer ${token}` } },
			testEnv,
		);

		expect(res.status).toBe(403);
		expect(await res.json()).toEqual({ error: "Permisos insuficientes" });
	});

	it("responde 401 sin header de autorización", async () => {
		const app = makeApp(db);

		const res = await app.request("/admin", {}, testEnv);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "No autenticado" });
	});

	it("responde 401 con un token inválido", async () => {
		const app = makeApp(db);

		const res = await app.request(
			"/admin",
			{ headers: { Authorization: "Bearer no-es-un-token" } },
			testEnv,
		);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({
			error: "Token inválido o expirado",
		});
	});
});
