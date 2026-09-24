import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import { listBlogPosts, getBlogPost } from "@/lib/blog";
import { buildMetadata } from "@/lib/seo";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const posts = await listBlogPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};
  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    noindex: true,
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto w-full max-w-3xl px-4 pb-24 pt-32 sm:px-6 md:pt-40">
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 rounded-full text-sm text-imt-muted transition-colors hover:text-imt-text"
      >
        <ArrowLeft className="size-4" /> Volver al blog
      </Link>

      <header className="mt-10 space-y-4">
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
        <h1 className="text-balance text-4xl font-bold leading-tight md:text-5xl">
          {post.title}
        </h1>
        <p className="text-pretty text-lg text-imt-muted">{post.excerpt}</p>
      </header>

      <div className="prose prose-invert mt-12 max-w-none prose-headings:font-imt-display prose-a:text-imt-cyan prose-p:text-imt-muted prose-li:text-imt-muted">
        <MDXRemote
          source={post.content}
          options={{
            mdxOptions: {
              rehypePlugins: [
                rehypeSlug,
                [
                  rehypeAutolinkHeadings,
                  { behavior: "wrap", properties: { className: ["no-underline"] } },
                ],
                [
                  rehypePrettyCode,
                  { theme: "github-dark-dimmed", keepBackground: false },
                ],
              ],
            },
          }}
        />
      </div>
    </article>
  );
}
