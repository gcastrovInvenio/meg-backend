import type { Usuario } from "../../prisma/prisma/client";

export function usuarioPublico(usuario: Usuario) {
	return {
		id_usuario: usuario.id_usuario,
		nombre_completo: usuario.nombre_completo,
		correo: usuario.correo,
		telefono: usuario.telefono,
		correo_verificado: usuario.correo_verificado,
		fecha_registro: usuario.fecha_registro,
	};
}
