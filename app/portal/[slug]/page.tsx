import { notFound, redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';
import { createSupabaseServiceRole } from '@/lib/supabase/server';
import { getClientDashboardData } from '@/lib/portal/actions';
import { getClientBySlug } from '@/lib/portal/queries';
import { ClientDashboard } from '@/components/portal/ClientDashboard';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  return {
    title: client ? `${client.nombre} · Portal` : 'Portal',
    robots: { index: false },
  };
}

export default async function PortalClientPage({ params }: Props) {
  const { slug } = await params;

  // Auth check
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/portal/login');

  // Obtener cliente por slug
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  // Verificar que el usuario tiene acceso a este cliente
  const service = createSupabaseServiceRole();

  // Es admin del sistema? Admins ven todo
  const { data: adminRow } = await service
    .from('admin_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single();

  const isAdmin = !!adminRow;

  if (!isAdmin) {
    // Verificar que es un usuario del cliente
    const { data: clientUser } = await service
      .from('portal_client_users')
      .select('id, rol')
      .eq('auth_user_id', user.id)
      .eq('client_id', client.id)
      .eq('activo', true)
      .single();

    if (!clientUser) {
      redirect('/portal/login');
    }
  }

  const data = await getClientDashboardData(client.id);

  return <ClientDashboard data={data} canEdit={isAdmin} />;
}
