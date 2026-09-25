import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimitResult = {
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
};

let redis: Redis | null = null;
let formLimiterInstance: Ratelimit | null = null;
let emailLimiterInstance: Ratelimit | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

function getFormLimiter(): Ratelimit | null {
  if (formLimiterInstance) return formLimiterInstance;
  const r = getRedis();
  if (!r) return null;
  formLimiterInstance = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    analytics: true,
    prefix: "rl:form",
  });
  return formLimiterInstance;
}

function getEmailLimiter(): Ratelimit | null {
  if (emailLimiterInstance) return emailLimiterInstance;
  const r = getRedis();
  if (!r) return null;
  emailLimiterInstance = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    analytics: true,
    prefix: "rl:email",
  });
  return emailLimiterInstance;
}

/* ============================================================
   Respaldo en memoria.
   Sin Upstash configurado esto antes dejaba pasar TODO en silencio:
   los formularios quedaban sin limite y nadie se enteraba. Ahora se
   limita por proceso. No es tan bueno como Redis (cada instancia
   serverless tiene su memoria), pero corta las rafagas y deja aviso
   en los logs.
   ============================================================ */
const ventanasEnMemoria = new Map<string, number[]>();
let yaAvisamos = false;

function limitarEnMemoria(clave: string, maximo: number, ventanaMs: number): LimitResult {
  if (!yaAvisamos) {
    yaAvisamos = true;
    console.warn(
      "[rate-limit] Sin UPSTASH_REDIS_REST_URL/TOKEN: se usa el respaldo en memoria, " +
        "que no se comparte entre instancias. Configura Upstash para un limite real.",
    );
  }

  const ahora = Date.now();
  const previos = (ventanasEnMemoria.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);

  if (previos.length >= maximo) {
    ventanasEnMemoria.set(clave, previos);
    return { success: false, limit: maximo, remaining: 0, reset: previos[0] + ventanaMs };
  }

  previos.push(ahora);
  ventanasEnMemoria.set(clave, previos);

  // Limpieza barata: evita que el mapa crezca sin fin en un proceso largo.
  if (ventanasEnMemoria.size > 5000) {
    for (const [k, marcas] of ventanasEnMemoria) {
      if (marcas.every((t) => ahora - t >= ventanaMs)) ventanasEnMemoria.delete(k);
    }
  }

  return {
    success: true,
    limit: maximo,
    remaining: maximo - previos.length,
    reset: ahora + ventanaMs,
  };
}

/**
 * Rate limit por IP para formularios. 5 reqs / 10 min.
 * Sin Redis usa el respaldo en memoria en vez de permitir todo.
 */
export async function formLimiter(ip: string): Promise<LimitResult> {
  const limiter = getFormLimiter();
  if (!limiter) return limitarEnMemoria(`form:${ip}`, 5, 10 * 60 * 1000);
  const res = await limiter.limit(ip);
  return {
    success: res.success,
    limit: res.limit,
    remaining: res.remaining,
    reset: res.reset,
  };
}

/**
 * Rate limit por email para prevenir spam de envios. 3 reqs / 1 h.
 * Sin Redis usa el respaldo en memoria en vez de permitir todo.
 */
export async function emailLimiter(email: string): Promise<LimitResult> {
  const limiter = getEmailLimiter();
  if (!limiter) return limitarEnMemoria(`email:${email.toLowerCase()}`, 3, 60 * 60 * 1000);
  const res = await limiter.limit(email.toLowerCase());
  return {
    success: res.success,
    limit: res.limit,
    remaining: res.remaining,
    reset: res.reset,
  };
}

/**
 * Client IP used as the rate-limit key.
 *
 * Order: `x-vercel-forwarded-for` (set by the Vercel edge, not spoofable),
 * then `x-real-ip`, then the FIRST entry of `x-forwarded-for`.
 * `cf-connecting-ip` is intentionally ignored: without Cloudflare in front,
 * the client can set it freely and get a fresh bucket on every request.
 */
export function clientIp(
  headers: Pick<Headers, "get">,
  fallback = "unknown",
): string {
  const first = (value: string | null): string | null =>
    value?.split(",")[0]?.trim() || null;
  return (
    first(headers.get("x-vercel-forwarded-for")) ??
    first(headers.get("x-real-ip")) ??
    first(headers.get("x-forwarded-for")) ??
    fallback
  );
}
