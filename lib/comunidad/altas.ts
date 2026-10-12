import { createSupabaseServiceRole } from "@/lib/supabase/server";
import type { Entrada } from "./validators";

export interface AltaInput {
  nombre: string;
  email: string; // ya en minúsculas
  whatsapp?: string;
  entrada: Entrada;
  cohorteId: string;
}

/**
 * Da de alta (o actualiza) a un alumno: usuario de auth + perfil + inscripción.
 * Idempotente por correo y por (usuario, cohorte): repetir el alta no duplica
 * ni cambia el rol de nadie (un admin que se inscribe sigue siendo admin).
 * Solo para servidor, tras comprobar que quien llama es admin.
 */
export async function altaAlumno(input: AltaInput): Promise<{ userId: string; nuevo: boolean }> {
  const admin = createSupabaseServiceRole();
  const whatsapp = input.whatsapp?.trim() || null;

  const { data: existente } = await admin
    .from("mia_perfiles")
    .select("user_id")
    .eq("email", input.email)
    .maybeSingle();

  let userId = existente?.user_id as string | undefined;
  let nuevo = false;

  if (!userId) {
    const creado = await admin.auth.admin.createUser({ email: input.email, email_confirm: true });
    if (creado.data?.user) {
      userId = creado.data.user.id;
    } else {
      // El correo ya tiene cuenta en auth (admin, portal de clientes…): se reutiliza.
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
    if (error) throw new Error(`Perfil: ${error.message}`);
    nuevo = true;
  } else {
    const { error } = await admin
      .from("mia_perfiles")
      .update({ nombre: input.nombre, ...(whatsapp ? { whatsapp } : {}) })
      .eq("user_id", userId);
    if (error) throw new Error(`Perfil: ${error.message}`);
  }

  const { error: errInsc } = await admin
    .from("mia_inscripciones")
    .upsert(
      { user_id: userId, cohorte_id: input.cohorteId, entrada: input.entrada },
      { onConflict: "user_id,cohorte_id" },
    );
  if (errInsc) throw new Error(`Inscripción: ${errInsc.message}`);

  return { userId, nuevo };
}
