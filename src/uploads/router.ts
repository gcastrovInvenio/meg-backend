import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { requireAuth } from "../auth/middleware";
import { extensionForMime, getR2Key } from "../lib/r2";
import {
	ErrorSchema,
	UploadQuerySchema,
	UploadRequestSchema,
	UploadResponseSchema,
} from "../openapi/schemas";
import type { AppEnv, AppVariables } from "../types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const VALID_CATEGORIES = ["profile", "cedula", "cedula-juridica"];
const DEFAULT_CATEGORY = "other";

type UploadsEnv = { Bindings: AppEnv; Variables: AppVariables };
type UploadsContext = Context<UploadsEnv>;

const uploads = new OpenAPIHono<UploadsEnv>({
	defaultHook: (result, c) => {
		if (!result.success) {
			const message = result.error.issues[0]?.message ?? "Datos inválidos";
			return c.json({ error: message }, 400);
		}
	},
}).basePath("/uploads");

function fail<S extends ContentfulStatusCode>(
	c: UploadsContext,
	status: S,
	error: string,
) {
	return c.json({ error }, status);
}

const uploadRoute = createRoute({
	method: "post",
	path: "/",
	tags: ["Uploads"],
	summary: "Subir una imagen",
	description:
		"Sube un archivo de imagen (JPEG, PNG o WebP, máximo 10MB) al bucket R2. " +
		"El query param `category` determina la carpeta destino (profile, cedula, cedula-juridica). " +
		"Devuelve la clave del objeto para guardarla en los campos de la base de datos.",
	security: [{ Bearer: [] }],
	request: {
		query: UploadQuerySchema,
		body: {
			content: {
				"multipart/form-data": { schema: UploadRequestSchema },
			},
			description: "Archivo de imagen",
			required: true,
		},
	},
	responses: {
		201: {
			description: "Imagen subida",
			content: { "application/json": { schema: UploadResponseSchema } },
		},
		400: {
			description: "Falta el archivo o categoría no válida",
			content: { "application/json": { schema: ErrorSchema } },
		},
		401: {
			description: "No autenticado o token inválido",
			content: { "application/json": { schema: ErrorSchema } },
		},
		413: {
			description: "El archivo excede el tamaño máximo de 10MB",
			content: { "application/json": { schema: ErrorSchema } },
		},
		415: {
			description: "Tipo de archivo no permitido",
			content: { "application/json": { schema: ErrorSchema } },
		},
	},
});

uploads.openapi({ ...uploadRoute, middleware: requireAuth }, async (c) => {
	const category = c.req.valid("query").category ?? DEFAULT_CATEGORY;
	if (!VALID_CATEGORIES.includes(category)) {
		return fail(
			c,
			400,
			"Categoría no válida. Use: profile, cedula, cedula-juridica",
		);
	}

	const body = await c.req.parseBody();
	const file = body.file;
	if (!file || typeof file === "string") {
		return fail(c, 400, "Se requiere un archivo");
	}
	if (file.size > MAX_FILE_SIZE) {
		return fail(c, 413, "El archivo excede el tamaño máximo de 10MB");
	}

	const extension = extensionForMime(file.type);
	if (!extension) {
		return fail(c, 415, "Tipo de archivo no permitido. Use JPEG, PNG o WebP");
	}

	const key = getR2Key(category, extension);
	await c.env.IMAGES.put(key, file.stream(), {
		httpMetadata: { contentType: file.type },
	});
	return c.json({ key }, 201);
});

uploads.all("*", async (c) => {
	if (c.req.method !== "GET") return c.notFound();
	const key = c.req.path.replace("/uploads/", "");
	const object = await c.env.IMAGES.get(key);
	if (!object) {
		return fail(c, 404, "Archivo no encontrado");
	}
	const contentType =
		object.httpMetadata?.contentType ?? "application/octet-stream";
	return new Response(object.body, {
		headers: {
			"Content-Type": contentType,
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
});

export default uploads;
