import { redirect } from "next/navigation";
import { botonCls } from "@/components/comunidad/ui";

/**
 * Paso intermedio con botón: abrir el enlace NO gasta el token. Los
 * escáneres de correo (Outlook, antivirus) abren los enlaces con GET y se
 * lo comerían; la verificación ocurre solo con el POST del botón.
 */
export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string }>;
}) {
  const { token_hash } = await searchParams;
  if (!token_hash || token_hash.length > 200) redirect("/comunidad/login?error=1");

  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <h1 className="font-display text-3xl font-semibold">Todo listo</h1>
      <p className="mt-2 text-sm text-muted-foreground">Toca el botón para entrar a tu comunidad.</p>
      <form action="/comunidad/auth/entrar" method="post" className="mt-8">
        <input type="hidden" name="token_hash" value={token_hash} />
        <button type="submit" className={botonCls + " w-full"}>
          Entrar
        </button>
      </form>
    </div>
  );
}
