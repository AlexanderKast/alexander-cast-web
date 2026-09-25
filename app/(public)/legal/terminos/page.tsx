import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { LegalShell } from "@/components/imt/ui/LegalShell";
import { site } from "@/content/site";

export const metadata: Metadata = buildMetadata({
  title: `Terminos y Condiciones | ${site.name}`,
  description:
    "Terminos y condiciones de uso de alexandercast.com: servicios ofrecidos, limitacion de responsabilidad y ley aplicable.",
  path: "/legal/terminos",
});

export default function TerminosPage() {
  return (
    <LegalShell current="/legal/terminos">
      <h1>Terminos y Condiciones</h1>
      <p>
        <strong>Ultima actualizacion:</strong>{" "}
        {new Date().toLocaleDateString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      <h2>1. Aceptacion</h2>
      <p>
        Al acceder y utilizar {site.url}, el usuario acepta estos terminos en su
        totalidad. Si no esta de acuerdo, debe abstenerse de usar el sitio.
      </p>

      <h2>2. Servicios ofrecidos</h2>
      <p>
        Este sitio es la marca personal de <strong>{site.name}</strong>. A traves de el se ofrece:
      </p>
      <ul>
        <li>Contenido editorial gratuito (articulos, videos, recursos).</li>
        <li>Descargas gratuitas previa suscripcion al correo.</li>
        <li>
          Informacion y formularios de aplicacion para servicios premium de
          consultoria, mentoring y workshops.
        </li>
        <li>
          Enlaces a los proyectos del ecosistema: {site.fundador.join(", ")}.
        </li>
      </ul>
      <p>
        Los servicios pagos se rigen ademas por contratos individuales que se
        firman previo al inicio de cada engagement. Este sitio no constituye por
        si solo un contrato de prestacion de servicios.
      </p>

      <h2>3. Uso permitido</h2>
      <p>
        El contenido es de uso personal. Se permite citar fragmentos con
        atribucion clara y enlace a la fuente original. No se permite:
      </p>
      <ul>
        <li>Reproducir contenido completo sin autorizacion escrita.</li>
        <li>
          Entrenar modelos de IA con el contenido del sitio sin permiso (ver
          tambien el archivo robots.txt).
        </li>
        <li>
          Usar los recursos descargables para reventa, reempaquetado o creacion
          de productos derivados.
        </li>
      </ul>

      <h2>4. Propiedad intelectual</h2>
      <p>
        Todos los textos, marcas, logos, diseno y codigo son propiedad de
        Alexander Cast o de las empresas del ecosistema, salvo mencion expresa.
      </p>

      <h2>5. Limitacion de responsabilidad</h2>
      <p>
        El contenido se ofrece <em>tal cual</em>, con fines educativos e informativos.
        No constituye asesoria legal, financiera, medica o psicologica. El
        usuario asume toda la responsabilidad por las decisiones que tome con
        base en la informacion del sitio. Alexander Cast no sera responsable por
        danos directos, indirectos, lucro cesante o consecuentes derivados del
        uso del sitio o sus recursos.
      </p>

      <h2>6. Enlaces externos</h2>
      <p>
        El sitio puede incluir enlaces a recursos de terceros. No nos hacemos
        responsables por el contenido, politicas ni disponibilidad de esos
        sitios externos.
      </p>

      <h2>7. Modificaciones</h2>
      <p>
        Nos reservamos el derecho a modificar estos terminos, el contenido y los
        servicios en cualquier momento. Los cambios materiales se reflejaran con
        la fecha de ultima actualizacion.
      </p>

      <h2>8. Ley aplicable y jurisdiccion</h2>
      <p>
        Estos terminos se rigen por las leyes de la <strong>Republica de Colombia</strong>.
        Cualquier controversia se resolvera ante los jueces y tribunales
        competentes de la ciudad de <strong>Bogota D.C., Colombia</strong>, salvo pacto
        especifico distinto en un contrato individual.
      </p>

      <h2>9. Contacto</h2>
      <p>
        Consultas sobre estos terminos:{" "}
        <a href={`mailto:${site.contacto.principal}`}>{site.contacto.principal}</a>.
      </p>
    </LegalShell>
  );
}
