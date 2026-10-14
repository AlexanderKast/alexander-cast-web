import { redirect } from "next/navigation";
import { botonCls } from "@/components/comunidad/ui";
import { esTipoToken, esTokenHash } from "@/lib/imt/portal-utils";

/**
 * Paso intermedio con botón: abrir el enlace NO gasta el token. Los escáneres de correo
 * (Outlook, antivirus) abren los enlaces con GET y se lo comerían; la verificación ocurre
 * solo con el POST del botón.
 */
export default async function EntrarPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; type?: string }>;
}) {
  const { t, type } = await searchParams;
  if (!esTokenHash(t)) redirect("/portal/login?error=1");
  const tipo = esTipoToken(type) ? type : "magiclink";

  return (
    <div className="mx-auto max-w-sm py-10 text-center sm:py-16">
      <p className="mia-eyebrow">Portal de clientes</p>
      <h1 className="mia-title mt-4">Todo listo</h1>
      <p className="mia-lead mx-auto mt-3">Toca el botón para entrar a tu portal.</p>
      <form action="/portal/entrar/confirmar" method="post" className="mt-8">
        <input type="hidden" name="token_hash" value={t} />
        <input type="hidden" name="type" value={tipo} />
        <button type="submit" className={botonCls + " mia-btn-block"}>
          Entrar
        </button>
      </form>
    </div>
  );
}
