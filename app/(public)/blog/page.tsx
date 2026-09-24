import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listBlogPosts } from "@/lib/blog";
import { buildMetadata } from "@/lib/seo";
import { Eyebrow } from "@/components/imt/ui/Eyebrow";

export const metadata: Metadata = buildMetadata({
  title: "Blog",
  description:
    "Articulos sobre Dios, Estrategia e IA. Procesos reales de un emprendedor construyendo en publico.",
  path: "/blog",
  noindex: true,
});

export default async function BlogIndexPage() {
  const posts = await listBlogPosts();

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-24 pt-32 sm:px-6 md:pt-40">
      <Eyebrow>Blog</Eyebrow>
      <h1 className="mt-4 text-4xl font-bold md:text-5xl">Insights</h1>
      <p className="mt-4 text-imt-muted">La version larga de lo que comparto en newsletter. Sin relleno.</p>

      {posts.length === 0 ? (
        <p className="mt-10 text-imt-muted">Pronto publicare el primer articulo.</p>
      ) : (
        <ul className="mt-12 space-y-5">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block rounded-3xl border border-imt-border bg-imt-surface p-6 transition-colors hover:border-imt-cyan"
              >
                <div className="flex flex-wrap items-center gap-3 font-imt-mono text-xs uppercase tracking-[0.14em] text-imt-muted">
                  <time dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <span aria-hidden>·</span>
                  <span className="text-imt-cyan">{post.pilar}</span>
                  <span aria-hidden>·</span>
                  <span>{post.readingMinutes} min</span>
                </div>
                <h2 className="mt-3 text-2xl font-bold transition-colors group-hover:text-imt-cyan">{post.title}</h2>
                <p className="mt-2 text-pretty text-imt-muted">{post.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-imt-cyan">
                  Leer
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
