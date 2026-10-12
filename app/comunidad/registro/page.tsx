import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { destinoDeMiembro, getMiembro } from "@/lib/comunidad/auth";
import { obtenerProductoPublicado } from "@/lib/comunidad/catalogo";
import { slugValido } from "@/lib/comunidad/acceso";
import { sanearUtm, UTM_CAMPOS } from "@/lib/comunidad/consentimiento";
import { FormRegistro } from "@/components/comunidad/FormRegistro";

export const metadata: Metadata = {
  title: "Crea tu cuenta · Master IA 360",
  robots: { index: false, follow: false },
};

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Quien ya tiene cuenta no vuelve a registrarse: va a donde le corresponde (sin bucles).
  const miembro = await getMiembro();
  if (miembro) redirect(destinoDeMiembro(miembro));

  const sp = await searchParams;
  const error = sp.error;

  // Programa de interés: dato de navegación. Solo se muestra si existe y está publicado; no decide precio ni acceso.
  const slug = slugValido(sp.programa) ? sp.programa : null;
  const producto = slug ? await obtenerProductoPublicado(slug).catch(() => null) : null;

  const utm: Record<string, string> = {};
  for (const c of UTM_CAMPOS.slice(0, 3)) {
    const v = sanearUtm(sp[c]);
    if (v) utm[c] = v;
  }

  const volver = producto ? `/comunidad/unete` : null;

  return (
    <div className="relative isolate mx-auto max-w-md py-6 sm:py-12">
      <div aria-hidden="true" className="mia-dots pointer-events-none absolute inset-x-0 -top-10 -z-10 h-64" />
      <p className="mia-eyebrow">Plataforma de programas</p>
      <h1 className="mia-title mt-4">Crea tu cuenta</h1>
      <p className="mia-lead mt-4">
        Explora los programas, compra el que necesitas y encuentra tus contenidos en un solo lugar.
      </p>
      {error ? (
        <p role="alert" className="mia-alert mia-alert-error mt-6">
          Ese enlace ya se usó o venció. Vuelve a llenar tus datos y te enviamos uno nuevo.
        </p>
      ) : null}
      <div className="mia-card mt-8">
        <FormRegistro
          nombrePrograma={producto?.nombre ?? null}
          intencion={{
            programa: producto?.slug ?? null,
            oferta: slugValido(sp.oferta) ? sp.oferta : null,
            asesor: Boolean(producto) && sp.asesor === "1",
            origen: sp.o === "stand" ? "stand" : "web",
            utm,
          }}
        />
      </div>
      <p className="mia-muted mt-5 text-center text-sm">
        <Link href="/comunidad/login" className="mia-link">
          Iniciar sesión
        </Link>
        {volver ? (
          <>
            {" · "}
            <Link href={volver} className="mia-link">
              Volver al programa
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
