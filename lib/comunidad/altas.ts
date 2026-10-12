import { createSupabaseServiceRole } from "@/lib/supabase/server";

export interface AltaManual {
  nombre: string;
  email: string; // ya en minúsculas
  whatsapp?: string;
  ofertaId: string;
  /** Quién la hace (un admin ya verificado por el llamador) y por qué: queda auditado en el derecho. */
  adminId: string;
  motivo: string;
  tipo: "admin" | "cortesia";
}

/**
 * ALTA ADMINISTRATIVA: concede un derecho de acceso a una persona. NO es el registro público ni una venta:
 *  - requiere un admin (adminId) y un motivo; ambos quedan guardados en el derecho (auditoría);
 *  - «cortesia» es una concesión distinta de una venta (no hay pago detrás);
 *  - si la persona ya tiene perfil, NO se pisan sus datos ni se toca su rol.
 *
 * `email_confirm: true` es aceptable SOLO aquí: lo hace un admin que responde por la persona, y el acceso real
 * siempre exige abrir el enlace enviado a ese correo. El registro público no lo usa.
 */
export async function altaManual(input: AltaManual): Promise<{ userId: string; nuevo: boolean; derechoId: string }> {
  const admin = createSupabaseServiceRole();
  const whatsapp = input.whatsapp?.trim() || null;

  const buscarPerfil = () => admin.from("mia_perfiles").select("user_id").eq("email", input.email).maybeSingle();
  const { data: existente } = await buscarPerfil();
  let userId = existente?.user_id as string | undefined;
  let nuevo = false;

  if (!userId) {
    const creado = await admin.auth.admin.createUser({ email: input.email, email_confirm: true });
    if (creado.data?.user) {
      userId = creado.data.user.id;
    } else {
      // El correo ya tiene cuenta en auth (admin, portal, registro): se reutiliza sin cambiarla.
      const enlace = await admin.auth.admin.generateLink({ type: "magiclink", email: input.email });
      userId = enlace.data?.user?.id;
      if (!userId) throw new Error(creado.error?.message ?? "No se pudo crear el usuario.");
    }

    const { error } = await admin.from("mia_perfiles").insert({ user_id: userId, email: input.email, nombre: input.nombre, whatsapp });
    if (error) {
      // Carrera con un registro simultáneo del mismo correo: el perfil ya existe → se respeta, sin tocarlo.
      if (error.code !== "23505") throw new Error(`Perfil: ${error.message}`);
      const { data: ya } = await buscarPerfil();
      userId = (ya?.user_id as string | undefined) ?? userId;
    } else {
      nuevo = true;
    }
  }

  const { data: derechoId, error: errDerecho } = await admin.rpc("mia_conceder_derecho", {
    p_user: userId,
    p_oferta: input.ofertaId,
    p_pedido: null,
    p_origen: input.tipo,
    p_por: input.adminId,
    p_motivo: input.motivo,
  });
  if (errDerecho) throw new Error(`Derecho: ${errDerecho.message}`);

  return { userId, nuevo, derechoId: derechoId as string };
}
