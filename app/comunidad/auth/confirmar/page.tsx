import { redirect } from "next/navigation";
import { botonCls } from "@/components/comunidad/ui";
import { rutaInternaPermitida } from "@/lib/comunidad/acceso";
import { esTipoToken } from "@/lib/comunidad/correo";
import { pedidoIdValido } from "@/lib/comunidad/pagos";

/**
 * Paso intermedio con botón: abrir el enlace NO gasta el token. Los
 * escáneres de correo (Outlook, antivirus) abren los enlaces con GET y se
 * lo comerían; la verificación ocurre solo con el POST del botón.
 */
export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; reg?: string; next?: string }>;
}) {
  const { token_hash, type, reg, next } = await searchParams;
  if (!token_hash || token_hash.length > 200) redirect("/comunidad/login?error=1");

  const tipo = esTipoToken(type) ? type : "magiclink";
  const registro = pedidoIdValido(reg);
  const destino = rutaInternaPermitida(next);

  return (
    <div className="mx-auto max-w-sm py-10 text-center sm:py-16">
      <p className="mia-eyebrow">Master IA 360</p>
      <h1 className="mia-title mt-4">{registro ? "Confirma tu correo" : "Todo listo"}</h1>
      <p className="mia-lead mx-auto mt-3">
        {registro ? "Toca el botón para confirmar tu correo y terminar de crear tu cuenta." : "Toca el botón para entrar."}
      </p>
      <form action="/comunidad/auth/entrar" method="post" className="mt-8">
        <input type="hidden" name="token_hash" value={token_hash} />
        <input type="hidden" name="type" value={tipo} />
        {registro ? <input type="hidden" name="reg" value={registro} /> : null}
        {destino ? <input type="hidden" name="next" value={destino} /> : null}
        <button type="submit" className={botonCls + " mia-btn-block"}>
          {registro ? "Confirmar mi correo" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
