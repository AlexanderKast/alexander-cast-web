import Link from "next/link";
import QRCode from "qrcode";
import { requireAdminComunidad } from "@/lib/comunidad/auth";
import { baseUrl } from "@/lib/comunidad/url";

export const dynamic = "force-dynamic";

/**
 * Cobro en el stand: el comprador escanea, llena SUS datos, acepta la
 * política de privacidad y paga desde su celular. Sin teclear nada del
 * lado del equipo y con el consentimiento dado por la propia persona.
 */
export default async function CobrarPage() {
  await requireAdminComunidad();
  const url = `${baseUrl()}/comunidad/unete?o=stand`;
  const qr = await QRCode.toDataURL(url, {
    margin: 1,
    width: 720,
    errorCorrectionLevel: "M",
    color: { dark: "#050705", light: "#ffffff" },
  });

  return (
    <div className="mx-auto max-w-md text-center">
      <Link href="/comunidad/admin/pagos" className="mia-back">
        ← Pagos
      </Link>
      <p className="mia-eyebrow mt-6">Stand · Feria Effix</p>
      <h1 className="mia-title mt-3">Escanea y reserva</h1>
      <p className="mia-lead mx-auto mt-3">
        Master IA 360. Eliges tu entrada, pagas desde tu celular en pesos y recibes el acceso por correo.
      </p>
      <div className="mia-card mx-auto mt-8 !p-4" style={{ width: "min(100%, 392px)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt={`Código QR para inscribirse: ${url}`} width={360} height={360} className="h-auto w-full" />
      </div>
      <p className="mia-muted mt-4 break-all text-xs">{url}</p>
    </div>
  );
}
