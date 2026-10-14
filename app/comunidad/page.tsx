import Link from "next/link";
import { derechoDe, requireMiembro } from "@/lib/comunidad/auth";
import { PRODUCTO_PRINCIPAL, SESION_ARRANQUE } from "@/lib/comunidad/oferta";
import { botonCls, botonSecundarioCls } from "@/components/comunidad/ui";

/**
 * Inicio privado: lo ve cualquier cuenta verificada, tenga o no compras (por eso no hay un guard de pago aquí:
 * mandar a quien aún no compró a la landing creaba un bucle). Cada contenido pagado pide SU derecho.
 */
export default async function ComunidadHome() {
  const m = await requireMiembro();
  const primerNombre = m.nombre.split(" ")[0];
  const master = derechoDe(m, PRODUCTO_PRINCIPAL);

  return (
    <div className="space-y-10">
      <section className="mia-card-dark">
        <p className="mia-eyebrow">Tu plataforma</p>
        <h1 className="mia-title mt-4">Hola, {primerNombre}</h1>
        <p className="mia-lead mt-4">
          Explora los programas, compra el que necesitas y encuentra tus contenidos en un solo lugar.
        </p>
      </section>

      {master?.derechos.includes("sesion_arranque") ? (
        <section className="mia-card-dark flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mia-eyebrow">Incluida en tu entrada</p>
            <h2 className="mt-2 text-xl font-bold">{SESION_ARRANQUE.titulo}</h2>
            <p className="mia-muted mt-1 text-sm">Antes de la clase 1 de Master IA 360.</p>
          </div>
          <Link href="/comunidad/bono" className={botonCls + " shrink-0"}>
            Ver la sesión
          </Link>
        </section>
      ) : null}

      <section aria-labelledby="accesos">
        <p id="accesos" className="mia-eyebrow">
          Tu espacio
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <article className="mia-card flex flex-col">
            <h2 className="text-lg font-semibold">Mis programas</h2>
            <p className="mia-muted mt-2 flex-1 text-sm leading-relaxed">
              {m.derechos.length
                ? `Tienes ${m.derechos.length} ${m.derechos.length === 1 ? "programa activo" : "programas activos"}.`
                : "Todavía no has adquirido un programa."}
            </p>
            <Link href="/comunidad/mis-programas" className={(m.derechos.length ? botonCls : botonSecundarioCls) + " mt-5"}>
              Abrir
            </Link>
          </article>

          <article className="mia-card flex flex-col">
            <h2 className="text-lg font-semibold">Explorar programas</h2>
            <p className="mia-muted mt-2 flex-1 text-sm leading-relaxed">
              Mira el catálogo, compara las entradas y compra cuando quieras.
            </p>
            <Link href="/comunidad/programas" className={(m.derechos.length ? botonSecundarioCls : botonCls) + " mt-5"}>
              Ver programas
            </Link>
          </article>

          <article className="mia-card flex flex-col">
            <h2 className="text-lg font-semibold">Mi cuenta</h2>
            <p className="mia-muted mt-2 flex-1 text-sm leading-relaxed">Tus datos, tus pedidos y tus solicitudes de asesoría.</p>
            <Link href="/comunidad/mi-cuenta" className={botonSecundarioCls + " mt-5"}>
              Abrir
            </Link>
          </article>
        </div>
      </section>

      {master ? (
        <section className="mia-card-soft max-w-xl">
          <span className="mia-chip mia-chip-ok">Master IA 360</span>
          <h2 className="mt-3 text-lg font-semibold">Ficha de tu negocio</h2>
          <p className="mia-muted mt-1 text-sm">Cuéntanos qué vendes, a quién y qué te gustaría tener.</p>
          <Link href="/comunidad/ficha" className={botonCls + " mia-btn-sm mt-4"}>
            Ir a la ficha
          </Link>
        </section>
      ) : null}
    </div>
  );
}
