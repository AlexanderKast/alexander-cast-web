import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { LegalShell } from "@/components/imt/ui/LegalShell";
import { site } from "@/content/site";

export const metadata: Metadata = buildMetadata({
  title: `Politica de Privacidad | ${site.name}`,
  description:
    "Politica de tratamiento de datos personales de alexandercast.com. Responsable, finalidades, derechos ARCO y canal de contacto.",
  path: "/legal/privacidad",
});

export default function PrivacidadPage() {
  return (
    <LegalShell current="/legal/privacidad">
      <h1>Politica de Privacidad</h1>
      <p>
        <strong>Ultima actualizacion:</strong>{" "}
        {new Date().toLocaleDateString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        El responsable del tratamiento de los datos personales recolectados a
        traves de este sitio es <strong>{site.name}</strong>, con domicilio en{" "}
        {site.ubicacion}, operando bajo las marcas del ecosistema{" "}
        {site.fundador.join(", ")}. Canal de contacto para asuntos de
        privacidad: <a href={`mailto:${site.contacto.principal}`}>{site.contacto.principal}</a>.
      </p>

      <h2>2. Datos recolectados</h2>
      <p>
        Recolectamos unicamente los datos que el usuario proporciona de forma
        voluntaria:
      </p>
      <ul>
        <li>Correo electronico (suscripcion, descargas, contacto).</li>
        <li>Nombre (cuando aplica a formularios de contacto o consultoria).</li>
        <li>Mensaje o contexto de la solicitud.</li>
        <li>
          Datos tecnicos agregados y anonimizados de uso del sitio (analitica).
        </li>
      </ul>

      <h2>3. Finalidades</h2>
      <ul>
        <li>Enviar los recursos, descargas y correos solicitados.</li>
        <li>
          Responder consultas de consultoria, prensa o contacto comercial.
        </li>
        <li>
          Enviar comunicaciones editoriales de la newsletter solo si el usuario
          se ha suscrito explicitamente.
        </li>
        <li>Mejorar el sitio mediante analitica agregada.</li>
      </ul>
      <p>
        No vendemos, alquilamos ni cedemos datos personales a terceros para
        fines comerciales. Usamos proveedores de infraestructura (Vercel,
        Supabase, Resend, Upstash) que procesan datos bajo contratos de
        tratamiento conformes.
      </p>

      <h2>4. Base legal</h2>
      <p>
        El consentimiento expreso del titular es la base principal para el
        tratamiento (Ley 1581 de 2012 y Decreto 1377 de 2013 de Colombia). El
        usuario puede retirar su consentimiento en cualquier momento escribiendo
        a <a href={`mailto:${site.contacto.principal}`}>{site.contacto.principal}</a>.
      </p>

      <h2>5. Derechos del titular (ARCO)</h2>
      <p>
        El titular tiene derecho a <strong>Acceder</strong>, <strong>Rectificar</strong>,{" "}
        <strong>Cancelar</strong> y <strong>Oponerse</strong> al tratamiento de sus datos,
        asi como a solicitar la supresion o portabilidad. Para ejercerlos escribe a{" "}
        <a href={`mailto:${site.contacto.principal}`}>{site.contacto.principal}</a> con el asunto
        <em>Solicitud ARCO</em>. Responderemos en un plazo maximo de 15 dias habiles.
      </p>

      <h2>6. Conservacion</h2>
      <p>
        Los datos se conservan mientras la finalidad siga vigente o hasta que el
        titular solicite su supresion. Los correos suscritos a la newsletter se
        mantienen hasta que el usuario se dar de baja desde el enlace incluido
        en cada envio.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Aplicamos controles tecnicos y organizativos razonables para proteger la
        informacion (TLS, cifrado en transito, control de acceso, principio de
        minimo privilegio). Ningun sistema es 100% invulnerable, pero seguimos
        buenas practicas estandar de la industria.
      </p>

      <h2>8. Cookies</h2>
      <p>
        El sitio utiliza cookies tecnicas y de analitica agregada. El usuario
        puede deshabilitarlas desde la configuracion de su navegador sin
        afectar la navegacion basica.
      </p>

      <h2>9. Cambios a esta politica</h2>
      <p>
        Esta politica puede actualizarse para reflejar cambios legales o
        operativos. La version vigente siempre estara disponible en esta URL con
        la fecha de ultima actualizacion.
      </p>

      <h2>10. Contacto</h2>
      <p>
        Para cualquier asunto relacionado con privacidad, escribe a{" "}
        <a href={`mailto:${site.contacto.principal}`}>{site.contacto.principal}</a>.
      </p>
    </LegalShell>
  );
}
