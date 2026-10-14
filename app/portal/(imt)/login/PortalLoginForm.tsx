'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { botonCls, inputCls } from '@/components/comunidad/ui';

/**
 * Acceso con contraseña: solo para clientes antiguos del portal de agencia que ya la tienen.
 * El cliente se crea al enviar el formulario, no al cargar el modulo: creandolo arriba, el
 * prerender de /portal/login rompia el build entero en cualquier entorno sin las variables de
 * Supabase (clon nuevo, preview, CI). Ahora la falta de configuracion da un mensaje, no un build caido.
 */
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createBrowserClient(url, anonKey);
}

export function PortalLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const supabase = getSupabase();
      if (!supabase) {
        setError('El acceso no está configurado. Avísale al equipo.');
        return;
      }
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
        return;
      }
      router.push('/portal');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mia-label">Correo</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="tu@empresa.com"
          required
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="mia-label">Contraseña</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className={inputCls}
        />
      </label>

      {error ? (
        <p role="alert" className="mia-alert mia-alert-error">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={isPending || !email || !password} className={botonCls + ' mia-btn-block'}>
        {isPending ? 'Entrando…' : 'Entrar con contraseña'}
      </button>
    </form>
  );
}
