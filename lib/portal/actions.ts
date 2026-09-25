'use server';

import { createSupabaseServer, createSupabaseServiceRole } from '@/lib/supabase/server';
import { z } from 'zod';
import { requireAuth, type Role } from '@/lib/auth';
import { puedeEditarProyectos, puedeGestionarConfiguracion } from '@/lib/proyectos/permisos';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type {
  PortalClient,
  Campaign,
  Project,
  Objective,
  PortalEvent,
  SocialPost,
  EditorialItem,
  AdAccount,
  Tool,
  PortalTask,
  ClientDashboardData,
  PortalFieldDef,
  EntityType,
  FieldType,
} from './types';

const sb = () => createSupabaseServiceRole();

const SIN_PERMISO = 'Sin permiso para esta acción.';
const ERROR_GUARDAR = 'No se pudo guardar el cambio. Intenta de nuevo.';
const DATOS_INVALIDOS = 'Datos inválidos.';

// Requires an active admin (requireAuth) whose role passes `check`.
// Returns the error payload to send back, or null when allowed.
async function denyUnless(check: (rol: Role) => boolean): Promise<{ error: string } | null> {
  const user = await requireAuth();
  return check(user.role) ? null : { error: SIN_PERMISO };
}

// Never leak raw Postgres errors to the client; log them server-side.
function dbError(action: string, error: { message: string }): { error: string } {
  console.error(`[portal] ${action}:`, error.message);
  return { error: ERROR_GUARDAR };
}

// Columns a caller can never set: identity, tenant and timestamps.
const PROTECTED_KEYS = new Set(['id', 'client_id', 'created_at', 'updated_at']);
function withoutProtectedKeys(input: object | null | undefined): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input ?? {}).filter(([key]) => !PROTECTED_KEYS.has(key)),
  );
}

// Verifica sesión activa (admin O cliente portal). Retorna el user.id.
// requireAuth() de lib/auth.ts requiere admin_users — no usar para reads del portal.
async function requireAnyAuth(): Promise<string> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/portal/login');
  return user.id;
}

// Verifica que el usuario es admin O es miembro editor activo del clientId específico.
// Usar en acciones de escritura que reciben clientId como parámetro (previene IDOR).
// Returns false when the user is an admin whose role cannot edit (e.g. tester)
// and is not an editor of this client; callers must then deny the action.
async function requireClientAccess(clientId: string): Promise<boolean> {
  const userId = await requireAnyAuth();
  const [adminRow, memberRow] = await Promise.all([
    sb().from('admin_users').select('id, role').eq('auth_user_id', userId).eq('is_active', true).maybeSingle(),
    sb().from('portal_client_users').select('id, rol')
      .eq('auth_user_id', userId).eq('client_id', clientId).eq('activo', true).maybeSingle(),
  ]);
  const isAdmin = !!adminRow.data;
  const isEditor = !!(memberRow.data && (memberRow.data as { rol: string }).rol === 'editor');
  if (!isAdmin && !isEditor) redirect('/portal/login');
  const adminCanEdit = isAdmin && puedeEditarProyectos((adminRow.data as { role: Role }).role);
  return adminCanEdit || isEditor;
}

// ── Clients ──────────────────────────────────────────────────

export async function getClients(): Promise<PortalClient[]> {
  await requireAuth();
  const { data } = await sb()
    .from('portal_clients')
    .select('*')
    .order('nombre');
  return (data ?? []) as PortalClient[];
}

export async function getClientById(id: string): Promise<PortalClient | null> {
  await requireAuth();
  const { data } = await sb()
    .from('portal_clients')
    .select('*')
    .eq('id', id)
    .single();
  return data as PortalClient | null;
}

export async function createClient(input: {
  nombre: string;
  slug: string;
  industria?: string;
  contacto_email?: string;
  contacto_nombre?: string;
  notas?: string;
}): Promise<{ id: string } | { error: string }> {
  const denied = await denyUnless(puedeGestionarConfiguracion);
  if (denied) return denied;
  const { data, error } = await sb()
    .from('portal_clients')
    .insert(withoutProtectedKeys(input))
    .select('id')
    .single();
  if (error) return dbError('createClient', error);
  revalidatePath('/admin/clientes');
  return { id: data.id as string };
}

export async function updateClient(
  id: string,
  input: Partial<Omit<PortalClient, 'id' | 'created_at' | 'updated_at'>>,
): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeGestionarConfiguracion);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_clients')
    .update({ ...withoutProtectedKeys(input), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return dbError('updateClient', error);
  revalidatePath('/admin/clientes');
  revalidatePath(`/admin/clientes/${id}`);
  return {};
}

export async function deleteClient(id: string): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeGestionarConfiguracion);
  if (denied) return denied;
  const { error } = await sb().from('portal_clients').delete().eq('id', id);
  if (error) return dbError('deleteClient', error);
  revalidatePath('/admin/clientes');
  return {};
}

// ── Dashboard data (all tables for one client) ────────────────
export async function getClientDashboardData(clientId: string): Promise<ClientDashboardData> {
  const userId = await requireAnyAuth();

  // Verificar que el usuario es admin O tiene acceso a este cliente específico.
  const [adminRow, memberRow] = await Promise.all([
    sb().from('admin_users').select('id').eq('auth_user_id', userId).eq('is_active', true).maybeSingle(),
    sb().from('portal_client_users').select('id').eq('auth_user_id', userId).eq('client_id', clientId).eq('activo', true).maybeSingle(),
  ]);
  if (!adminRow.data && !memberRow.data) redirect('/portal/login');

  const [client, campaigns, projects, objectives, events, social_posts, editorial, ad_accounts, tools, tasks, field_defs] =
    await Promise.all([
      sb().from('portal_clients').select('*').eq('id', clientId).single(),
      sb().from('portal_campaigns').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      sb().from('portal_projects').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      sb().from('portal_objectives').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      sb().from('portal_events').select('*').eq('client_id', clientId).order('fecha_evento', { ascending: true }),
      sb().from('portal_social_posts').select('*').eq('client_id', clientId).order('fecha_publicacion', { ascending: true }),
      sb().from('portal_editorial').select('*').eq('client_id', clientId).order('fecha', { ascending: true }),
      sb().from('portal_ad_accounts').select('*').eq('client_id', clientId).order('nombre'),
      sb().from('portal_tools').select('*').eq('client_id', clientId).order('nombre'),
      sb().from('portal_tasks').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      sb().from('portal_field_defs').select('*').eq('client_id', clientId).order('position'),
    ]);

  return {
    client: client.data as PortalClient,
    campaigns: (campaigns.data ?? []) as Campaign[],
    projects: (projects.data ?? []) as Project[],
    objectives: (objectives.data ?? []) as Objective[],
    events: (events.data ?? []) as PortalEvent[],
    social_posts: (social_posts.data ?? []) as SocialPost[],
    editorial: (editorial.data ?? []) as EditorialItem[],
    ad_accounts: (ad_accounts.data ?? []) as AdAccount[],
    tools: (tools.data ?? []) as Tool[],
    tasks: (tasks.data ?? []) as PortalTask[],
    field_defs: (field_defs.data ?? []) as PortalFieldDef[],
  };
}

// ── Campaigns ────────────────────────────────────────────────

export async function createCampaign(
  clientId: string,
  input: Partial<Omit<Campaign, 'id' | 'client_id' | 'created_at' | 'updated_at'>>,
): Promise<{ id: string } | { error: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { data, error } = await sb()
    .from('portal_campaigns')
    .insert({ ...withoutProtectedKeys(input), client_id: clientId })
    .select('id')
    .single();
  if (error) return dbError('createCampaign', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return { id: data.id as string };
}

export async function updateCampaign(
  id: string,
  clientId: string,
  input: Partial<Campaign>,
): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_campaigns')
    .update({ ...withoutProtectedKeys(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('client_id', clientId); // prevent cross-tenant mutation
  if (error) return dbError('updateCampaign', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

export async function deleteCampaign(id: string, clientId: string): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_campaigns')
    .delete()
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('deleteCampaign', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

// ── Projects ─────────────────────────────────────────────────

export async function createProject(
  clientId: string,
  input: Partial<Omit<Project, 'id' | 'client_id' | 'created_at' | 'updated_at'>>,
): Promise<{ id: string } | { error: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { data, error } = await sb()
    .from('portal_projects')
    .insert({ ...withoutProtectedKeys(input), client_id: clientId })
    .select('id')
    .single();
  if (error) return dbError('createProject', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return { id: data.id as string };
}

export async function updateProject(
  id: string,
  clientId: string,
  input: Partial<Project>,
): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_projects')
    .update({ ...withoutProtectedKeys(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('updateProject', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

export async function deleteProject(id: string, clientId: string): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_projects')
    .delete()
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('deleteProject', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

// ── Objectives ───────────────────────────────────────────────

export async function createObjective(
  clientId: string,
  input: Partial<Omit<Objective, 'id' | 'client_id' | 'created_at' | 'updated_at'>>,
): Promise<{ id: string } | { error: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { data, error } = await sb()
    .from('portal_objectives')
    .insert({ ...withoutProtectedKeys(input), client_id: clientId })
    .select('id')
    .single();
  if (error) return dbError('createObjective', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return { id: data.id as string };
}

export async function updateObjective(
  id: string,
  clientId: string,
  input: Partial<Objective>,
): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_objectives')
    .update({ ...withoutProtectedKeys(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('updateObjective', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

export async function deleteObjective(id: string, clientId: string): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_objectives')
    .delete()
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('deleteObjective', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

// ── Events ───────────────────────────────────────────────────

export async function createEvent(
  clientId: string,
  input: Partial<Omit<PortalEvent, 'id' | 'client_id' | 'created_at' | 'updated_at'>>,
): Promise<{ id: string } | { error: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { data, error } = await sb()
    .from('portal_events')
    .insert({ ...withoutProtectedKeys(input), client_id: clientId })
    .select('id')
    .single();
  if (error) return dbError('createEvent', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return { id: data.id as string };
}

export async function updateEvent(
  id: string,
  clientId: string,
  input: Partial<PortalEvent>,
): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_events')
    .update({ ...withoutProtectedKeys(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('updateEvent', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

export async function deleteEvent(id: string, clientId: string): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_events')
    .delete()
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('deleteEvent', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

// ── Social posts ─────────────────────────────────────────────

export async function createSocialPost(
  clientId: string,
  input: Partial<Omit<SocialPost, 'id' | 'client_id' | 'created_at' | 'updated_at'>>,
): Promise<{ id: string } | { error: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { data, error } = await sb()
    .from('portal_social_posts')
    .insert({ ...withoutProtectedKeys(input), client_id: clientId })
    .select('id')
    .single();
  if (error) return dbError('createSocialPost', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return { id: data.id as string };
}

export async function updateSocialPost(
  id: string,
  clientId: string,
  input: Partial<SocialPost>,
): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_social_posts')
    .update({ ...withoutProtectedKeys(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('updateSocialPost', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

export async function deleteSocialPost(id: string, clientId: string): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_social_posts')
    .delete()
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('deleteSocialPost', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

// ── Editorial ────────────────────────────────────────────────

export async function createEditorialItem(
  clientId: string,
  input: Partial<Omit<EditorialItem, 'id' | 'client_id' | 'created_at' | 'updated_at'>>,
): Promise<{ id: string } | { error: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { data, error } = await sb()
    .from('portal_editorial')
    .insert({ ...withoutProtectedKeys(input), client_id: clientId })
    .select('id')
    .single();
  if (error) return dbError('createEditorialItem', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return { id: data.id as string };
}

export async function updateEditorialItem(
  id: string,
  clientId: string,
  input: Partial<EditorialItem>,
): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_editorial')
    .update({ ...withoutProtectedKeys(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('updateEditorialItem', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

export async function deleteEditorialItem(id: string, clientId: string): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_editorial')
    .delete()
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('deleteEditorialItem', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

// ── Ad Accounts ──────────────────────────────────────────────

export async function createAdAccount(
  clientId: string,
  input: Partial<Omit<AdAccount, 'id' | 'client_id' | 'created_at' | 'updated_at'>>,
): Promise<{ id: string } | { error: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { data, error } = await sb()
    .from('portal_ad_accounts')
    .insert({ ...withoutProtectedKeys(input), client_id: clientId })
    .select('id')
    .single();
  if (error) return dbError('createAdAccount', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return { id: data.id as string };
}

export async function updateAdAccount(
  id: string,
  clientId: string,
  input: Partial<AdAccount>,
): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_ad_accounts')
    .update({ ...withoutProtectedKeys(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('updateAdAccount', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

export async function deleteAdAccount(id: string, clientId: string): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_ad_accounts')
    .delete()
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('deleteAdAccount', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

// ── Tools ────────────────────────────────────────────────────

export async function createTool(
  clientId: string,
  input: Partial<Omit<Tool, 'id' | 'client_id' | 'created_at' | 'updated_at'>>,
): Promise<{ id: string } | { error: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { data, error } = await sb()
    .from('portal_tools')
    .insert({ ...withoutProtectedKeys(input), client_id: clientId })
    .select('id')
    .single();
  if (error) return dbError('createTool', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return { id: data.id as string };
}

export async function updateTool(
  id: string,
  clientId: string,
  input: Partial<Tool>,
): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_tools')
    .update({ ...withoutProtectedKeys(input), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('updateTool', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

export async function deleteTool(id: string, clientId: string): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeEditarProyectos);
  if (denied) return denied;
  const { error } = await sb()
    .from('portal_tools')
    .delete()
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('deleteTool', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

// ── Portal client auth helpers ────────────────────────────────

const clientUserSchema = z
  .object({
    auth_user_id: z.string().min(1).max(100),
    client_id: z.string().min(1).max(100),
    email: z.string().max(320),
    nombre: z.string().max(200).optional(),
    rol: z.enum(['viewer', 'editor']).optional(),
  })
  .strict();

export async function createClientUser(input: {
  auth_user_id: string;
  client_id: string;
  email: string;
  nombre?: string;
  rol?: 'viewer' | 'editor';
}): Promise<{ error?: string }> {
  const denied = await denyUnless(puedeGestionarConfiguracion);
  if (denied) return denied;
  const parsed = clientUserSchema.safeParse(input);
  if (!parsed.success) return { error: DATOS_INVALIDOS };
  const { error } = await sb().from('portal_client_users').insert(parsed.data);
  if (error) return dbError('createClientUser', error);
  return {};
}

export async function getClientUsers(clientId: string) {
  await requireAuth();
  const { data } = await sb()
    .from('portal_client_users')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at');
  return data ?? [];
}

// ── Tasks ────────────────────────────────────────────────────

// Whitelist of task columns a caller may write (client_id/id/timestamps excluded).
const nullableText = (max: number) => z.string().max(max).nullable();
const taskInputSchema = z
  .object({
    titulo: z.string().max(300),
    descripcion: nullableText(10_000),
    tipo_entregable: nullableText(200),
    asignado_a: nullableText(200),
    estado: z.enum(['Pendiente', 'En progreso', 'En revisión', 'Aprobado', 'Entregado']),
    prioridad: z.enum(['Alta', 'Media', 'Baja']),
    fecha_limite: nullableText(40),
    fecha_entrega: nullableText(40),
    link_entrega: nullableText(2_000),
    notas: nullableText(10_000),
    entity_type: nullableText(40),
    entity_id: nullableText(100),
  })
  .partial()
  .strict();

export async function createTask(
  clientId: string,
  input: Partial<Omit<PortalTask, 'id' | 'client_id' | 'created_at' | 'updated_at'>>,
): Promise<{ id: string } | { error: string }> {
  if (!(await requireClientAccess(clientId))) return { error: SIN_PERMISO };
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) return { error: DATOS_INVALIDOS };
  const { data, error } = await sb()
    .from('portal_tasks')
    .insert({ ...parsed.data, client_id: clientId })
    .select('id')
    .single();
  if (error) return dbError('createTask', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return { id: data.id as string };
}

export async function updateTask(
  id: string,
  clientId: string,
  input: Partial<PortalTask>,
): Promise<{ error?: string }> {
  if (!(await requireClientAccess(clientId))) return { error: SIN_PERMISO };
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) return { error: DATOS_INVALIDOS };
  const { error } = await sb()
    .from('portal_tasks')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('updateTask', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

export async function deleteTask(id: string, clientId: string): Promise<{ error?: string }> {
  if (!(await requireClientAccess(clientId))) return { error: SIN_PERMISO };
  const { error } = await sb()
    .from('portal_tasks')
    .delete()
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('deleteTask', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

// ── Field Defs ───────────────────────────────────────────────

const FIELD_TYPES = ['text', 'number', 'date', 'select', 'multiselect', 'url', 'checkbox'] as const satisfies readonly FieldType[];
const ENTITY_TYPES = [
  'campaign', 'project', 'objective', 'event',
  'social_post', 'editorial', 'tool', 'ad_account',
] as const satisfies readonly EntityType[];

const fieldDefUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    field_type: z.enum(FIELD_TYPES),
    options: z.array(z.string().max(200)).max(100),
    position: z.number().int().min(0).max(100_000),
  })
  .partial()
  .strict();

const fieldDefCreateSchema = fieldDefUpdateSchema
  .required({ name: true, field_type: true })
  .extend({ entity_type: z.enum(ENTITY_TYPES) })
  .strict();

export async function createFieldDef(
  clientId: string,
  input: { name: string; entity_type: EntityType; field_type: FieldType; options?: string[]; position?: number },
): Promise<{ id: string } | { error: string }> {
  if (!(await requireClientAccess(clientId))) return { error: SIN_PERMISO };
  const parsed = fieldDefCreateSchema.safeParse(input);
  if (!parsed.success) return { error: DATOS_INVALIDOS };
  const { data, error } = await sb()
    .from('portal_field_defs')
    .insert({ ...parsed.data, client_id: clientId, options: parsed.data.options ?? [] })
    .select('id')
    .single();
  if (error) return dbError('createFieldDef', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return { id: data.id as string };
}

export async function updateFieldDef(
  id: string,
  clientId: string,
  input: Partial<Pick<PortalFieldDef, 'name' | 'field_type' | 'options' | 'position'>>,
): Promise<{ error?: string }> {
  if (!(await requireClientAccess(clientId))) return { error: SIN_PERMISO };
  const parsed = fieldDefUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: DATOS_INVALIDOS };
  const { error } = await sb()
    .from('portal_field_defs')
    .update(parsed.data)
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('updateFieldDef', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}

export async function deleteFieldDef(id: string, clientId: string): Promise<{ error?: string }> {
  if (!(await requireClientAccess(clientId))) return { error: SIN_PERMISO };
  const { error } = await sb()
    .from('portal_field_defs')
    .delete()
    .eq('id', id)
    .eq('client_id', clientId);
  if (error) return dbError('deleteFieldDef', error);
  revalidatePath(`/admin/clientes/${clientId}`);
  return {};
}
