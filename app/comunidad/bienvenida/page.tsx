import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMiembro } from "@/lib/comunidad/auth";
import { aceptarPrivacidad } from "../actions";
import { botonCls } from "@/components/comunidad/ui";

export default async function BienvenidaPage() {
  const m = await requireMiembro();
  if (m.privacidadAceptada) redirect("/comunidad");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-semibold">Hola, {m.nombre.split(" ")[0]}</h1>
      <p className="mt-2 text-muted-foreground">
        Antes de entrar necesitamos tu autorización para tratar tus datos personales.
      </p>

      <section className="mt-8 space-y-3 rounded-2xl border border-line-strong bg-surface-1 p-5 text-sm leading-relaxed">
        <h2 className="text-base font-semibold">Tratamiento de datos personales</h2>
        <p>
          Alexander Cast, responsable del tratamiento, recoge tu nombre, correo, WhatsApp y la
          información de tu negocio para: darte acceso a la plataforma Master IA 360, gestionar tu
          participación en el programa y la comunidad, y comunicarnos contigo sobre las clases.
        </p>
        <p>
          Tus datos no se venden. La ficha de tu negocio solo la ve el equipo del programa; lo que
          publiques en la comunidad lo verán los demás alumnos de tu cohorte.
        </p>
        <p>
          Como titular tienes derecho a conocer, actualizar, rectificar y suprimir tus datos y a
          revocar esta autorización (Ley 1581 de 2012). Para ejercerlos escríbenos desde el
          formulario de contacto del sitio.
        </p>
        <p>
          Lee la{" "}
          <Link href="/legal/privacidad" target="_blank" className="text-gold underline">
            política de privacidad completa
          </Link>
          .
        </p>
      </section>

      <form action={aceptarPrivacidad} className="mt-6">
        <button type="submit" className={botonCls + " w-full"}>
          Acepto y quiero continuar
        </button>
      </form>
    </div>
  );
}
