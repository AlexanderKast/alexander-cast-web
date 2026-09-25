// Server-only reads for the portal. Intentionally NOT a 'use server' module:
// functions here are plain server helpers, not client-callable server actions.
// (The `server-only` package is not installed, so it is not imported.)
import { createSupabaseServiceRole } from '@/lib/supabase/server';
import type { PortalClient } from './types';

// Solo columnas no-PII — safe para llamar desde generateMetadata (sin auth).
// Campos sensibles (contacto_email, notas, etc.) no se exponen aquí.
export async function getClientBySlug(slug: string): Promise<Pick<PortalClient, 'id' | 'nombre' | 'slug' | 'logo_url' | 'activo'> | null> {
  const { data } = await createSupabaseServiceRole()
    .from('portal_clients')
    .select('id, nombre, slug, logo_url, activo')
    .eq('slug', slug)
    .single();
  return data as Pick<PortalClient, 'id' | 'nombre' | 'slug' | 'logo_url' | 'activo'> | null;
}
