import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';
import { createSupabaseServiceRole } from '@/lib/supabase/server';

export default async function PortalIndexPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/portal/login');
  }

  // Buscar el cliente asociado a este usuario
  const service = createSupabaseServiceRole();
  const { data: vinculos } = await service
    .from('portal_client_users')
    .select('client_id, portal_clients(slug, tipo)')
    .eq('auth_user_id', user.id)
    .eq('activo', true);

  type Cliente = { slug: string; tipo: string };
  const clientes = ((vinculos ?? []) as unknown as { portal_clients: Cliente | Cliente[] | null }[])
    .map((v) => (Array.isArray(v.portal_clients) ? v.portal_clients[0] : v.portal_clients))
    .filter((c): c is Cliente => Boolean(c));

  // Clientes de IA Master Tech: su panel de plan y pagos, con el branding de la comunidad.
  if (clientes.some((c) => c.tipo === 'imt')) {
    redirect('/portal/mi-plan');
  }

  const clientUser = clientes[0];

  if (!clientUser) {
    // Usuario autenticado pero sin cliente asignado
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div>
          <p className="text-white/50 text-sm">
            Tu cuenta aún no tiene un tablero asignado.
          </p>
          <p className="text-white/30 text-xs mt-2">
            Contacta a Alexander en{' '}
            <a href="mailto:founder@kreoon.com" className="text-[#D4AF37]/60 hover:text-[#D4AF37]">
              founder@kreoon.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  const slug = clientUser.slug;
  if (slug) {
    redirect(`/portal/${slug}`);
  }

  redirect('/portal/login');
}
