import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import auth from "./auth/router";
import { createPrisma } from "./lib/db";
import type { AppEnv, AppVariables } from "./types";
import uploads from "./uploads/router";
import users from "./users/router";

type AppEnvType = { Bindings: AppEnv; Variables: AppVariables };

const app = new OpenAPIHono<AppEnvType>();

app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
	type: "http",
	scheme: "bearer",
	bearerFormat: "JWT",
});

app.use("*", async (c, next) => {
	c.set("db", createPrisma(c.env.DB));
	await next();
});

const pingRoute = createRoute({
	method: "get",
	path: "/ping",
	tags: ["Health"],
	summary: "Verificar conexión",
	description:
		"Devuelve un texto simple para confirmar que el servicio está activo.",
	responses: {
		200: {
			description: "Servicio activo",
			content: { "text/plain": { schema: z.string() } },
		},
	},
});

app.openapi(pingRoute, (c) => c.text("Connected!", 200));

app.route("/", auth);
app.route("/", users);
app.route("/", uploads);

app.doc("/doc", {
	openapi: "3.0.3",
	info: {
		title: "MEG API",
		version: "1.0.0",
		description:
			"API del proyecto MEG. Documentación generada automáticamente con OpenAPI (Swagger). " +
			"Los endpoints de autenticación usan tokens JWT; las rutas protegidas requieren el header " +
			"`Authorization: Bearer <accessToken>`.",
	},
});

app.get("/docs", swaggerUI({ url: "/doc" }));

app.onError((err, c) => {
	console.error("Error no manejado:", err);
	return c.json({ error: "Error interno del servidor" }, 500);
});

export default app;
