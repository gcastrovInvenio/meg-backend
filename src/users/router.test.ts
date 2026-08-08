import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword } from "../lib/password";
import { signAccessToken } from "../lib/tokens";
import { testEnv } from "../test/test-env";
import { type MockDb, makeApp, makeDb, makeUsuario } from "./test-utils";

vi.mock("../lib/password", () => ({
	hashPassword: vi.fn(),
	verifyPassword: vi.fn(),
}));

async function json<T>(res: Response): Promise<T> {
	return (await res.json()) as T;
}

function authHeaders(token: string) {
	return { headers: { Authorization: `Bearer ${token}` } };
}

describe("GET /users/me", () => {
	let db: MockDb;
	let app: ReturnType<typeof makeApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		db = makeDb();
		app = makeApp(db);
	});

	it("devuelve el perfil del usuario autenticado", async () => {
		const token = await signAccessToken(testEnv, 1);
		db.usuario.findUnique.mockResolvedValue(makeUsuario());

		const res = await app.request("/users/me", authHeaders(token), testEnv);

		expect(res.status).toBe(200);
		const body = await json<{
			usuario: { id_usuario: number; nombre_completo: string; correo: string };
		}>(res);
		expect(body.usuario).toMatchObject({
			id_usuario: 1,
			nombre_completo: "María García",
			correo: "maria@example.com",
		});
		expect(db.usuario.findUnique).toHaveBeenCalledWith({
			where: { id_usuario: 1 },
		});
	});

	it("responde 401 sin header de autorización", async () => {
		const res = await app.request("/users/me", {}, testEnv);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "No autenticado" });
	});

	it("responde 401 con un token inválido", async () => {
		const res = await app.request(
			"/users/me",
			{ headers: { Authorization: "Bearer token-falso" } },
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

		const res = await app.request("/users/me", authHeaders(token), testEnv);

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "Usuario no encontrado" });
	});
});

describe("PATCH /users/me", () => {
	let db: MockDb;
	let app: ReturnType<typeof makeApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		db = makeDb();
		app = makeApp(db);
	});

	it("actualiza los campos provistos y devuelve el perfil", async () => {
		const token = await signAccessToken(testEnv, 1);
		db.usuario.update.mockResolvedValue(
			makeUsuario({ nombre_completo: "Nuevo Nombre" }),
		);

		const res = await app.request(
			"/users/me",
			{
				method: "PATCH",
				...authHeaders(token),
				headers: {
					...authHeaders(token).headers,
					"content-type": "application/json",
				},
				body: JSON.stringify({ nombre_completo: "Nuevo Nombre" }),
			},
			testEnv,
		);

		expect(res.status).toBe(200);
		const body = await json<{ usuario: { nombre_completo: string } }>(res);
		expect(body.usuario.nombre_completo).toBe("Nuevo Nombre");
		expect(db.usuario.update).toHaveBeenCalledWith({
			where: { id_usuario: 1 },
			data: { nombre_completo: "Nuevo Nombre" },
		});
	});

	it("permite limpiar el teléfono con null", async () => {
		const token = await signAccessToken(testEnv, 1);
		db.usuario.update.mockResolvedValue(makeUsuario({ telefono: null }));

		const res = await app.request(
			"/users/me",
			{
				method: "PATCH",
				...authHeaders(token),
				headers: {
					...authHeaders(token).headers,
					"content-type": "application/json",
				},
				body: JSON.stringify({ telefono: null }),
			},
			testEnv,
		);

		expect(res.status).toBe(200);
		expect(db.usuario.update).toHaveBeenCalledWith({
			where: { id_usuario: 1 },
			data: { telefono: null },
		});
	});

	it("responde 400 si el cuerpo no incluye campos editables", async () => {
		const token = await signAccessToken(testEnv, 1);

		const res = await app.request(
			"/users/me",
			{
				method: "PATCH",
				...authHeaders(token),
				headers: {
					...authHeaders(token).headers,
					"content-type": "application/json",
				},
				body: JSON.stringify({}),
			},
			testEnv,
		);

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			error:
				"Debe enviar al menos un campo editable (nombre_completo o telefono)",
		});
		expect(db.usuario.update).not.toHaveBeenCalled();
	});

	it("responde 400 si nombre_completo queda vacío", async () => {
		const token = await signAccessToken(testEnv, 1);

		const res = await app.request(
			"/users/me",
			{
				method: "PATCH",
				...authHeaders(token),
				headers: {
					...authHeaders(token).headers,
					"content-type": "application/json",
				},
				body: JSON.stringify({ nombre_completo: "   " }),
			},
			testEnv,
		);

		expect(res.status).toBe(400);
		expect(db.usuario.update).not.toHaveBeenCalled();
	});
});

describe("POST /users/me/password", () => {
	let db: MockDb;
	let app: ReturnType<typeof makeApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		db = makeDb();
		app = makeApp(db);
	});

	it("cambia la contraseña y revoca todas las sesiones", async () => {
		const token = await signAccessToken(testEnv, 1);
		vi.mocked(verifyPassword).mockResolvedValue(true);
		vi.mocked(hashPassword).mockResolvedValue("hash-nuevo");
		db.usuario.findUnique.mockResolvedValue(makeUsuario());
		db.usuario.update.mockResolvedValue(
			makeUsuario({ contrasena_hash: "hash-nuevo" }),
		);

		const res = await app.request(
			"/users/me/password",
			{
				method: "POST",
				...authHeaders(token),
				headers: {
					...authHeaders(token).headers,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					contrasena_actual: "vieja123",
					contrasena_nueva: "nueva12345",
				}),
			},
			testEnv,
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ mensaje: "Contraseña actualizada" });
		expect(verifyPassword).toHaveBeenCalledWith(
			"vieja123",
			"pbkdf2_sha256$100000$hash-fake",
		);
		expect(hashPassword).toHaveBeenCalledWith("nueva12345");
		expect(db.usuario.update).toHaveBeenCalledWith({
			where: { id_usuario: 1 },
			data: { contrasena_hash: "hash-nuevo" },
		});
		expect(db.sesion.updateMany).toHaveBeenCalledWith({
			where: { id_usuario: 1, revocado: false },
			data: { revocado: true },
		});
	});

	it("responde 401 si la contraseña actual es incorrecta", async () => {
		const token = await signAccessToken(testEnv, 1);
		vi.mocked(verifyPassword).mockResolvedValue(false);
		db.usuario.findUnique.mockResolvedValue(makeUsuario());

		const res = await app.request(
			"/users/me/password",
			{
				method: "POST",
				...authHeaders(token),
				headers: {
					...authHeaders(token).headers,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					contrasena_actual: "incorrecta",
					contrasena_nueva: "nueva12345",
				}),
			},
			testEnv,
		);

		expect(res.status).toBe(401);
		expect(await res.json()).toEqual({ error: "Credenciales inválidas" });
		expect(db.usuario.update).not.toHaveBeenCalled();
		expect(db.sesion.updateMany).not.toHaveBeenCalled();
	});

	it("responde 400 si la nueva contraseña es corta", async () => {
		const token = await signAccessToken(testEnv, 1);

		const res = await app.request(
			"/users/me/password",
			{
				method: "POST",
				...authHeaders(token),
				headers: {
					...authHeaders(token).headers,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					contrasena_actual: "vieja123",
					contrasena_nueva: "1234567",
				}),
			},
			testEnv,
		);

		expect(res.status).toBe(400);
		expect(db.usuario.update).not.toHaveBeenCalled();
	});

	it("responde 404 si el usuario autenticado no existe", async () => {
		const token = await signAccessToken(testEnv, 999);
		db.usuario.findUnique.mockResolvedValue(null);

		const res = await app.request(
			"/users/me/password",
			{
				method: "POST",
				...authHeaders(token),
				headers: {
					...authHeaders(token).headers,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					contrasena_actual: "vieja123",
					contrasena_nueva: "nueva12345",
				}),
			},
			testEnv,
		);

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "Usuario no encontrado" });
	});
});

describe("POST /users/me/deactivate", () => {
	let db: MockDb;
	let app: ReturnType<typeof makeApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		db = makeDb();
		app = makeApp(db);
	});

	it("desactiva la cuenta y revoca todas las sesiones", async () => {
		const token = await signAccessToken(testEnv, 1);
		db.usuario.findUnique.mockResolvedValue(makeUsuario());
		db.usuario.update.mockResolvedValue(makeUsuario({ activo: false }));

		const res = await app.request(
			"/users/me/deactivate",
			{ method: "POST", ...authHeaders(token) },
			testEnv,
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ mensaje: "Cuenta desactivada" });
		expect(db.usuario.update).toHaveBeenCalledWith({
			where: { id_usuario: 1 },
			data: { activo: false },
		});
		expect(db.sesion.updateMany).toHaveBeenCalledWith({
			where: { id_usuario: 1, revocado: false },
			data: { revocado: true },
		});
	});

	it("responde 409 si la cuenta ya está desactivada", async () => {
		const token = await signAccessToken(testEnv, 1);
		db.usuario.findUnique.mockResolvedValue(makeUsuario({ activo: false }));

		const res = await app.request(
			"/users/me/deactivate",
			{ method: "POST", ...authHeaders(token) },
			testEnv,
		);

		expect(res.status).toBe(409);
		expect(await res.json()).toEqual({
			error: "La cuenta ya está desactivada",
		});
		expect(db.usuario.update).not.toHaveBeenCalled();
		expect(db.sesion.updateMany).not.toHaveBeenCalled();
	});

	it("responde 404 si el usuario autenticado no existe", async () => {
		const token = await signAccessToken(testEnv, 999);
		db.usuario.findUnique.mockResolvedValue(null);

		const res = await app.request(
			"/users/me/deactivate",
			{ method: "POST", ...authHeaders(token) },
			testEnv,
		);

		expect(res.status).toBe(404);
		expect(await res.json()).toEqual({ error: "Usuario no encontrado" });
	});
});
