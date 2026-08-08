import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword } from "../lib/password";
import { signAccessToken } from "../lib/tokens";
import { testEnv } from "../test/test-env";
import {
	type MockDb,
	makeApp,
	makeDb,
	makeSesion,
	makeUsuario,
} from "./test-utils";

vi.mock("../lib/password", () => ({
	hashPassword: vi.fn(),
	verifyPassword: vi.fn(),
}));

async function json<T>(res: Response): Promise<T> {
	return (await res.json()) as T;
}

describe("POST /auth/register", () => {
	let db: MockDb;
	let app: ReturnType<typeof makeApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		db = makeDb();
		app = makeApp(db);
	});

	it("registra un usuario y crea una sesión", async () => {
		vi.mocked(hashPassword).mockResolvedValue("hash-del-password");
		db.usuario.findUnique.mockResolvedValue(null);
		const nuevo = makeUsuario({ id_usuario: 7 });
		db.usuario.create.mockResolvedValue(nuevo);

		const res = await app.request(
			"/auth/register",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					nombre_completo: "María García",
					correo: "  MARIA@Example.COM ",
					contrasena: "password123",
					telefono: "555-1234",
				}),
			},
			testEnv,
		);

		expect(res.status).toBe(201);
		const body = await json<{
			usuario: { id_usuario: number };
			accessToken: string;
			refreshToken: string;
			expiraEn: string;
		}>(res);
		expect(body.usuario.id_usuario).toBe(7);
		expect(body.accessToken).toEqual(expect.any(String));
		expect(body.refreshToken).toEqual(expect.any(String));
		expect(body.expiraEn).toEqual(expect.any(String));

		expect(hashPassword).toHaveBeenCalledWith("password123");
		expect(db.usuario.findUnique).toHaveBeenCalledWith({
			where: { correo: "maria@example.com" },
		});
		expect(db.usuario.create).toHaveBeenCalledWith({
			data: {
				nombre_completo: "María García",
				correo: "maria@example.com",
				contrasena_hash: "hash-del-password",
				telefono: "555-1234",
			},
		});
		expect(db.sesion.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				id_usuario: 7,
				refresh_token: expect.any(String),
				expira_en: expect.any(Date),
			}),
		});
	});

	it("responde 409 si el correo ya existe", async () => {
		db.usuario.findUnique.mockResolvedValue(makeUsuario());

		const res = await app.request(
			"/auth/register",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					nombre_completo: "Otra Persona",
					correo: "maria@example.com",
					contrasena: "password123",
				}),
			},
			testEnv,
		);

		expect(res.status).toBe(409);
		expect(await res.json()).toEqual({
			error: "El correo ya está registrado",
		});
		expect(db.usuario.create).not.toHaveBeenCalled();
	});

	it("responde 400 si faltan campos", async () => {
		const res = await app.request(
			"/auth/register",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					correo: "maria@example.com",
					contrasena: "password123",
				}),
			},
			testEnv,
		);

		expect(res.status).toBe(400);
		const body = await json<{ error: string }>(res);
		expect(body.error).toEqual(expect.any(String));
	});

	it("responde 400 si el correo no es válido", async () => {
		const res = await app.request(
			"/auth/register",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					nombre_completo: "María García",
					correo: "correo-invalido",
					contrasena: "password123",
				}),
			},
			testEnv,
		);

		expect(res.status).toBe(400);
	});

	it("responde 400 si la contraseña es corta", async () => {
		const res = await app.request(
			"/auth/register",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					nombre_completo: "María García",
					correo: "maria@example.com",
					contrasena: "1234567",
				}),
			},
			testEnv,
		);

		expect(res.status).toBe(400);
	});
});

describe("POST /auth/login", () => {
	let db: MockDb;
	let app: ReturnType<typeof makeApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		db = makeDb();
		app = makeApp(db);
	});

	it("inicia sesión con credenciales correctas y resetea los intentos fallidos", async () => {
		vi.mocked(verifyPassword).mockResolvedValue(true);
		db.usuario.findUnique.mockResolvedValue(
			makeUsuario({ intentos_fallidos_login: 2 }),
		);

		const res = await app.request(
			"/auth/login",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					correo: "  MARIA@example.com ",
					contrasena: "password123",
				}),
			},
			testEnv,
		);

		expect(res.status).toBe(200);
		const body = await json<{
			usuario: { correo: string };
			accessToken: string;
			refreshToken: string;
		}>(res);
		expect(body.usuario.correo).toBe("maria@example.com");
		expect(body.accessToken).toEqual(expect.any(String));
		expect(body.refreshToken).toEqual(expect.any(String));

		expect(db.usuario.update).toHaveBeenCalledWith({
			where: { id_usuario: 1 },
			data: { intentos_fallidos_login: 0, bloqueado_hasta: null },
		});
	});

	it("responde 401 si el usuario no existe", async () => {
		db.usuario.findUnique.mockResolvedValue(null);

		const res = await app.request(
			"/auth/login",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					correo: "nadie@example.com",
					contrasena: "password123",
				}),
			},
			testEnv,
		);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Credenciales inválidas" });
		expect(verifyPassword).not.toHaveBeenCalled();
	});

	it("responde 403 si el usuario está desactivado", async () => {
		db.usuario.findUnique.mockResolvedValue(makeUsuario({ activo: false }));

		const res = await app.request(
			"/auth/login",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					correo: "maria@example.com",
					contrasena: "password123",
				}),
			},
			testEnv,
		);

		expect(res.status).toBe(403);
		expect(await res.json()).toEqual({ error: "Usuario desactivado" });
	});

	it("responde 423 si la cuenta está bloqueada", async () => {
		const bloqueadoHasta = new Date(Date.now() + 60_000);
		db.usuario.findUnique.mockResolvedValue(
			makeUsuario({ bloqueado_hasta: bloqueadoHasta }),
		);

		const res = await app.request(
			"/auth/login",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					correo: "maria@example.com",
					contrasena: "password123",
				}),
			},
			testEnv,
		);

		expect(res.status).toBe(423);
		expect(await res.json()).toEqual({
			error: "Cuenta temporalmente bloqueada",
			bloqueado_hasta: bloqueadoHasta.toISOString(),
		});
	});

	it("incrementa los intentos fallidos con contraseña incorrecta", async () => {
		vi.mocked(verifyPassword).mockResolvedValue(false);
		db.usuario.findUnique.mockResolvedValue(makeUsuario());

		const res = await app.request(
			"/auth/login",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					correo: "maria@example.com",
					contrasena: "incorrecta",
				}),
			},
			testEnv,
		);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Credenciales inválidas" });
		expect(db.usuario.update).toHaveBeenCalledWith({
			where: { id_usuario: 1 },
			data: { intentos_fallidos_login: 1, bloqueado_hasta: undefined },
		});
	});

	it("bloquea la cuenta tras 5 intentos fallidos", async () => {
		vi.mocked(verifyPassword).mockResolvedValue(false);
		db.usuario.findUnique.mockResolvedValue(
			makeUsuario({ intentos_fallidos_login: 4 }),
		);

		const res = await app.request(
			"/auth/login",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					correo: "maria@example.com",
					contrasena: "incorrecta",
				}),
			},
			testEnv,
		);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({
			error: "Demasiados intentos fallidos, cuenta bloqueada por 15 minutos",
		});
		expect(db.usuario.update).toHaveBeenCalledWith({
			where: { id_usuario: 1 },
			data: {
				intentos_fallidos_login: 0,
				bloqueado_hasta: expect.any(Date),
			},
		});
	});

	it("responde 400 si faltan campos", async () => {
		const res = await app.request(
			"/auth/login",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ correo: "maria@example.com" }),
			},
			testEnv,
		);

		expect(res.status).toBe(400);
	});
});

describe("POST /auth/refresh", () => {
	let db: MockDb;
	let app: ReturnType<typeof makeApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		db = makeDb();
		app = makeApp(db);
	});

	it("revoca la sesión usada y emite un nuevo par de tokens", async () => {
		db.sesion.findUnique.mockResolvedValue(makeSesion());
		db.usuario.findUnique.mockResolvedValue(makeUsuario());

		const res = await app.request(
			"/auth/refresh",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ refreshToken: "refresh-token-1" }),
			},
			testEnv,
		);

		expect(res.status).toBe(200);
		const body = await json<{
			accessToken: string;
			refreshToken: string;
			expiraEn: string;
		}>(res);
		expect(body.accessToken).toEqual(expect.any(String));
		expect(body.refreshToken).toEqual(expect.any(String));
		expect(body.expiraEn).toEqual(expect.any(String));

		expect(db.sesion.update).toHaveBeenCalledWith({
			where: { id_sesion: 1 },
			data: { revocado: true },
		});
	});

	it("responde 401 si la sesión no existe", async () => {
		db.sesion.findUnique.mockResolvedValue(null);

		const res = await app.request(
			"/auth/refresh",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ refreshToken: "no-existe" }),
			},
			testEnv,
		);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Sesión inválida o expirada" });
	});

	it("responde 401 si la sesión está revocada", async () => {
		db.sesion.findUnique.mockResolvedValue(makeSesion({ revocado: true }));

		const res = await app.request(
			"/auth/refresh",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ refreshToken: "refresh-token-1" }),
			},
			testEnv,
		);

		expect(res.status).toBe(401);
	});

	it("responde 401 si la sesión expiró", async () => {
		db.sesion.findUnique.mockResolvedValue(
			makeSesion({ expira_en: new Date(Date.now() - 1000) }),
		);

		const res = await app.request(
			"/auth/refresh",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ refreshToken: "refresh-token-1" }),
			},
			testEnv,
		);

		expect(res.status).toBe(401);
	});

	it("responde 401 si el usuario está desactivado", async () => {
		db.sesion.findUnique.mockResolvedValue(makeSesion());
		db.usuario.findUnique.mockResolvedValue(makeUsuario({ activo: false }));

		const res = await app.request(
			"/auth/refresh",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ refreshToken: "refresh-token-1" }),
			},
			testEnv,
		);

		expect(res.status).toBe(401);
	});

	it("responde 400 si falta el refreshToken", async () => {
		const res = await app.request(
			"/auth/refresh",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({}),
			},
			testEnv,
		);

		expect(res.status).toBe(400);
	});
});

describe("POST /auth/logout", () => {
	let db: MockDb;
	let app: ReturnType<typeof makeApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		db = makeDb();
		app = makeApp(db);
	});

	it("revoca la sesión y confirma el cierre", async () => {
		db.sesion.findUnique.mockResolvedValue(makeSesion());

		const res = await app.request(
			"/auth/logout",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ refreshToken: "refresh-token-1" }),
			},
			testEnv,
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ mensaje: "Sesión cerrada" });
		expect(db.sesion.update).toHaveBeenCalledWith({
			where: { id_sesion: 1 },
			data: { revocado: true },
		});
	});

	it("responde 200 aunque la sesión no exista", async () => {
		db.sesion.findUnique.mockResolvedValue(null);

		const res = await app.request(
			"/auth/logout",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ refreshToken: "no-existe" }),
			},
			testEnv,
		);

		expect(res.status).toBe(200);
		expect(db.sesion.update).not.toHaveBeenCalled();
	});

	it("responde 400 si falta el refreshToken", async () => {
		const res = await app.request(
			"/auth/logout",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({}),
			},
			testEnv,
		);

		expect(res.status).toBe(400);
	});
});

describe("GET /auth/me", () => {
	let db: MockDb;
	let app: ReturnType<typeof makeApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		db = makeDb();
		app = makeApp(db);
	});

	it("devuelve el usuario autenticado con un token válido", async () => {
		const token = await signAccessToken(testEnv, 1);
		db.usuario.findUnique.mockResolvedValue(makeUsuario());

		const res = await app.request(
			"/auth/me",
			{
				method: "GET",
				headers: { Authorization: `Bearer ${token}` },
			},
			testEnv,
		);

		expect(res.status).toBe(200);
		const body = await json<{
			usuario: { id_usuario: number; correo: string; nombre_completo: string };
		}>(res);
		expect(body.usuario).toMatchObject({
			id_usuario: 1,
			correo: "maria@example.com",
			nombre_completo: "María García",
		});
		expect(db.usuario.findUnique).toHaveBeenCalledWith({
			where: { id_usuario: 1 },
		});
	});

	it("responde 401 sin header de autorización", async () => {
		const res = await app.request("/auth/me", {}, testEnv);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "No autenticado" });
	});

	it("responde 401 con un token inválido", async () => {
		const res = await app.request(
			"/auth/me",
			{
				method: "GET",
				headers: { Authorization: "Bearer token-falso" },
			},
			testEnv,
		);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({
			error: "Token inválido o expirado",
		});
	});

	it("responde 404 si el usuario autenticado no existe", async () => {
		const token = await signAccessToken(testEnv, 999);
		db.usuario.findUnique.mockResolvedValue(null);

		const res = await app.request(
			"/auth/me",
			{
				method: "GET",
				headers: { Authorization: `Bearer ${token}` },
			},
			testEnv,
		);

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "Usuario no encontrado" });
	});
});
