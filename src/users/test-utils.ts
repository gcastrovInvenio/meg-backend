import { Hono } from "hono";
import { vi } from "vitest";
import type { PrismaClient, Usuario } from "../../prisma/prisma/client";
import type { AppEnv, AppVariables } from "../types";
import users from "./router";

export function makeDb() {
	return {
		usuario: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		sesion: {
			updateMany: vi.fn(),
		},
	};
}

export type MockDb = ReturnType<typeof makeDb>;

export function makeApp(db: MockDb) {
	const app = new Hono<{ Bindings: AppEnv; Variables: AppVariables }>();
	app.use("*", async (c, next) => {
		c.set("db", db as unknown as PrismaClient);
		await next();
	});
	app.route("", users);
	return app;
}

export function makeUsuario(overrides: Partial<Usuario> = {}): Usuario {
	return {
		id_usuario: 1,
		nombre_completo: "María García",
		correo: "maria@example.com",
		contrasena_hash: "pbkdf2_sha256$100000$hash-fake",
		telefono: "555-1234",
		fecha_registro: new Date("2026-08-07T10:00:00.000Z"),
		correo_verificado: false,
		foto_perfil_key: null,
		intentos_fallidos_login: 0,
		bloqueado_hasta: null,
		mfa_secreto: null,
		token_recuperacion: null,
		expiracion_token_recuperacion: null,
		activo: true,
		...overrides,
	};
}
