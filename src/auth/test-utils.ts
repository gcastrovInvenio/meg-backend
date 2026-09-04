import { Hono } from "hono";
import { vi } from "vitest";
import type { PrismaClient, Sesion, Usuario } from "../../prisma/prisma/client";
import type { AppEnv, AppVariables } from "../types";
import auth from "./router";

export function makeDb() {
	return {
		usuario: {
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
		sesion: {
			create: vi.fn(),
			findUnique: vi.fn(),
			update: vi.fn(),
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
	app.route("", auth);
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

export function makeSesion(overrides: Partial<Sesion> = {}): Sesion {
	return {
		id_sesion: 1,
		id_usuario: 1,
		refresh_token: "refresh-token-1",
		dispositivo: null,
		direccion_ip: null,
		creado_en: new Date("2026-08-07T10:00:00.000Z"),
		expira_en: new Date("2026-09-06T10:00:00.000Z"),
		revocado: false,
		...overrides,
	};
}
