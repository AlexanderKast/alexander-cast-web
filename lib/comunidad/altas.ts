import { createSupabaseServiceRole } from "@/lib/supabase/server";
import type { Entrada } from "./validators";

export interface AltaInput {
  nombre: string;
  email: string; // ya en minúsculas
  whatsapp?: string;
  entrada: Entrada;
  cohorteId: string;
  /**
   * Si la persona ya tiene perfil, ¿se pisan su nombre y WhatsApp con estos datos?
   * SOLO para altas hechas por un admin (autoridad sobre los datos). Un pago
   * invitado NO puede cambiar el perfil de una cuenta existente solo por
   * conocer su correo: ahí va false (el valor por defecto).
   */
  actualizarPerfil?: boolean;
}

/**
 * Da de alta (o actualiza) a un alumno: usuario de auth + perfil + inscripción.
 * Idempotente por correo y por (usuario, cohorte). Nunca cambia el rol de nadie
 * (un admin que compra o se inscribe sigue siendo admin).
 *
 * Esta función CREA INSCRIPCIÓN (acceso pagado): es para el aprovisionamiento
 * tras un pago verificado y para altas de un admin. NO es el registro público
 * gratuito (ver registro.ts).
 *
 * `email_confirm: true` es aceptable aquí porque el acceso real siempre exige
 * abrir el enlace que se envía a ese correo; el registro público, en cambio,
 * no marca el correo como verificado hasta que se comprueba.
 */
export async function altaAlumno(input: AltaInput): Promise<{ userId: string; nuevo: boolean }> {
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
      // El correo ya tiene cuenta en auth (admin, portal, registro sin inscripción…): se reutiliza.
      const enlace = await admin.auth.admin.generateLink({ type: "magiclink", email: input.email });
      userId = enlace.data?.user?.id;
      if (!userId) {
        throw new Error(creado.error?.message ?? "No se pudo crear el usuario.");
      }
    }

    const { error } = await admin.from("mia_perfiles").insert({
      user_id: userId,
      email: input.email,
      nombre: input.nombre,
      whatsapp,
    });
    if (error) {
      // Carrera con un registro simultáneo del mismo correo: el perfil ya existe → se reutiliza, sin tocarlo.
      if (error.code !== "23505") throw new Error(`Perfil: ${error.message}`);
      const { data: ya } = await buscarPerfil();
      userId = (ya?.user_id as string | undefined) ?? userId;
    } else {
      nuevo = true;
    }
  } else if (input.actualizarPerfil) {
    const { error } = await admin
      .from("mia_perfiles")
      .update({ nombre: input.nombre, ...(whatsapp ? { whatsapp } : {}) })
      .eq("user_id", userId);
    if (error) throw new Error(`Perfil: ${error.message}`);
  }

  // Si la inscripción estaba revocada y se vuelve a dar de alta, se reactiva.
  const { error: errInsc } = await admin
    .from("mia_inscripciones")
    .upsert(
      { user_id: userId, cohorte_id: input.cohorteId, entrada: input.entrada, estado: "activa" },
      { onConflict: "user_id,cohorte_id" },
    );
  if (errInsc) throw new Error(`Inscripción: ${errInsc.message}`);

  return { userId, nuevo };
}
