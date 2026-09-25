"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ResultadoAccion } from "@/app/actions/proyectos";
import { requireAuth } from "@/lib/auth";
import { puedeEditarProyectos } from "@/lib/proyectos/permisos";
import { ESTADOS_TAREA, TIPOS_LINK, type EstadoTarea } from "@/lib/proyectos/types";
import { createSupabaseServiceRole } from "@/lib/supabase/server";

const SIN_PERMISO = "No tenés permiso para esta acción.";

function revalidar(proyectoId: string) {
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

const esquemaLink = z.object({
  proyectoId: z.string().uuid(),
  tipo: z.enum(TIPOS_LINK),
  label: z.string().trim().min(1, "Poné un nombre al link.").max(120),
  url: z
    .string()
    .trim()
    .url("La URL no es válida.")
    // Blocks javascript:/data: URLs that would run when the link is opened.
    .refine((u) => /^https?:\/\//i.test(u), "Solo enlaces http(s)"),
});

export async function crearLink(formData: FormData): Promise<ResultadoAccion> {
  const usuario = await requireAuth();
  if (!puedeEditarProyectos(usuario.role)) return { ok: false, error: SIN_PERMISO };

  const parsed = esquemaLink.safeParse({
    proyectoId: formData.get("proyectoId") ?? "",
    tipo: formData.get("tipo") ?? "otro",
    label: formData.get("label") ?? "",
    url: formData.get("url") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = createSupabaseServiceRole();
  const { error } = await supabase.from("int_proyecto_links").insert({
    proyecto_id: parsed.data.proyectoId,
    tipo: parsed.data.tipo,
    label: parsed.data.label,
    url: parsed.data.url,
  });

  if (error) {
    console.error("[detalle] crearLink:", error.message);
    return { ok: false, error: "No pude guardar el link." };
  }

  revalidar(parsed.data.proyectoId);
  return { ok: true };
}

export async function borrarLink(
  linkId: string,
  proyectoId: string,
): Promise<ResultadoAccion> {
  const usuario = await requireAuth();
  if (!puedeEditarProyectos(usuario.role)) return { ok: false, error: SIN_PERMISO };

  const supabase = createSupabaseServiceRole();
  const { error } = await supabase.from("int_proyecto_links").delete().eq("id", linkId);

  if (error) {
    console.error("[detalle] borrarLink:", error.message);
    return { ok: false, error: "No pude borrar el link." };
  }

  revalidar(proyectoId);
  return { ok: true };
}

const esquemaTarea = z.object({
  proyectoId: z.string().uuid(),
  titulo: z.string().trim().min(1, "Escribí qué hay que hacer.").max(200),
  descripcion: z.string().trim().max(2000).optional().or(z.literal("")),
  asignadoA: z.string().uuid().optional().or(z.literal("")),
});

export async function crearTarea(formData: FormData): Promise<ResultadoAccion> {
  const usuario = await requireAuth();
  if (!puedeEditarProyectos(usuario.role)) return { ok: false, error: SIN_PERMISO };

  const parsed = esquemaTarea.safeParse({
    proyectoId: formData.get("proyectoId") ?? "",
    titulo: formData.get("titulo") ?? "",
    descripcion: formData.get("descripcion") ?? "",
    asignadoA: formData.get("asignadoA") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = createSupabaseServiceRole();

  const { data: ultimas } = await supabase
    .from("int_proyecto_tareas")
    .select("orden")
    .eq("proyecto_id", parsed.data.proyectoId)
    .order("orden", { ascending: false })
    .limit(1);

  const { error } = await supabase.from("int_proyecto_tareas").insert({
    proyecto_id: parsed.data.proyectoId,
    titulo: parsed.data.titulo,
    descripcion: parsed.data.descripcion || null,
    asignado_a: parsed.data.asignadoA || null,
    orden: ((ultimas?.[0]?.orden as number | undefined) ?? 0) + 1,
  });

  if (error) {
    console.error("[detalle] crearTarea:", error.message);
    return { ok: false, error: "No pude crear la tarea." };
  }

  revalidar(parsed.data.proyectoId);
  return { ok: true };
}

export async function cambiarEstadoTarea(
  tareaId: string,
  proyectoId: string,
  estado: EstadoTarea,
): Promise<ResultadoAccion> {
  const usuario = await requireAuth();
  if (!puedeEditarProyectos(usuario.role)) return { ok: false, error: SIN_PERMISO };
  if (!ESTADOS_TAREA.includes(estado)) return { ok: false, error: "Estado inválido." };

  const supabase = createSupabaseServiceRole();
  const { error } = await supabase
    .from("int_proyecto_tareas")
    .update({ estado })
    .eq("id", tareaId);

  if (error) {
    console.error("[detalle] cambiarEstadoTarea:", error.message);
    return { ok: false, error: "No pude actualizar la tarea." };
  }

  revalidar(proyectoId);
  return { ok: true };
}

const esquemaNota = z.object({
  proyectoId: z.string().uuid(),
  tipo: z.enum(["bug", "nota"]),
  texto: z.string().trim().min(1, "Escribí algo.").max(4000),
});

/** Lo único que un tester puede escribir. */
export async function crearNota(formData: FormData): Promise<ResultadoAccion> {
  const usuario = await requireAuth();

  const parsed = esquemaNota.safeParse({
    proyectoId: formData.get("proyectoId") ?? "",
    tipo: formData.get("tipo") ?? "nota",
    texto: formData.get("texto") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = createSupabaseServiceRole();
  const { error } = await supabase.from("int_proyecto_notas").insert({
    proyecto_id: parsed.data.proyectoId,
    autor_id: usuario.id,
    tipo: parsed.data.tipo,
    texto: parsed.data.texto,
  });

  if (error) {
    console.error("[detalle] crearNota:", error.message);
    return { ok: false, error: "No pude guardar la nota." };
  }

  revalidar(parsed.data.proyectoId);
  return { ok: true };
}

export async function alternarNota(
  notaId: string,
  proyectoId: string,
  resuelto: boolean,
): Promise<ResultadoAccion> {
  const usuario = await requireAuth();
  if (!puedeEditarProyectos(usuario.role)) return { ok: false, error: SIN_PERMISO };

  const supabase = createSupabaseServiceRole();
  const { error } = await supabase
    .from("int_proyecto_notas")
    .update({ resuelto })
    .eq("id", notaId);

  if (error) {
    console.error("[detalle] alternarNota:", error.message);
    return { ok: false, error: "No pude actualizar la nota." };
  }

  revalidar(proyectoId);
  return { ok: true };
}
