/** URL pública del sitio, sin barra final. En desarrollo cae a localhost. */
export function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
