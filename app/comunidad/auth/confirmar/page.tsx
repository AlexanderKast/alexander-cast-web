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
    <div className="mx-auto max-w-sm py-10 text-center sm:py-16">
      <p className="mia-eyebrow">Master IA 360</p>
      <h1 className="mia-title mt-4">Todo listo</h1>
      <p className="mia-lead mx-auto mt-3">Toca el botón para entrar a tu comunidad.</p>
      <form action="/comunidad/auth/entrar" method="post" className="mt-8">
        <input type="hidden" name="token_hash" value={token_hash} />
        <button type="submit" className={botonCls + " mia-btn-block"}>
          Entrar
        </button>
      </form>
    </div>
  );
}
