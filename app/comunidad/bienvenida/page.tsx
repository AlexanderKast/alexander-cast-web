import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMiembroSinPrivacidad } from "@/lib/comunidad/auth";
import { aceptarPrivacidad } from "../actions";
import { botonCls } from "@/components/comunidad/ui";

/** Aceptar el tratamiento de datos. Aplica a cualquier cuenta (con o sin compras) que todavía no lo haya aceptado. */
export default async function BienvenidaPage() {
  const m = await requireMiembroSinPrivacidad();
  if (m.privacidadAceptada) redirect("/comunidad");

  return (
    <div className="mx-auto max-w-xl">
      <p className="mia-eyebrow">Bienvenida</p>
      <h1 className="mia-title mt-4">Hola, {m.nombre.split(" ")[0]}</h1>
      <p className="mia-lead mt-4">
        Antes de entrar necesitamos tu autorización para tratar tus datos personales.
      </p>

      <section className="mia-card-soft mt-8 space-y-3 text-sm leading-relaxed">
        <h2 className="text-base font-semibold">Tratamiento de datos personales</h2>
        <p>
          Alexander Cast, responsable del tratamiento, recoge tu nombre, correo, WhatsApp y la información que nos
          compartas para: darte acceso a la plataforma y a los programas que adquieras, gestionar tu participación y
          comunicarnos contigo sobre tu cuenta y tus programas.
        </p>
        <p>
          Tus datos no se venden. Lo que publiques en una comunidad lo verán los demás participantes de ese programa.
        </p>
        <p>
          Como titular tienes derecho a conocer, actualizar, rectificar y suprimir tus datos y a revocar esta
          autorización (Ley 1581 de 2012). Para ejercerlos escríbenos desde el formulario de contacto del sitio.
        </p>
        <p>
          Lee la{" "}
          <Link href="/legal/privacidad" target="_blank" className="mia-link">
            política de privacidad completa
          </Link>
          .
        </p>
      </section>

      <form action={aceptarPrivacidad} className="mt-6">
        <button type="submit" className={botonCls + " mia-btn-block"}>
          Acepto y quiero continuar
        </button>
      </form>
    </div>
  );
}
