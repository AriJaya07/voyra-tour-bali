"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugifyHeading } from "@/lib/guides/toc";

interface Props {
  body: string;
}

/**
 * Markdown body renderer with stable heading IDs (matches lib/guides/toc.ts)
 * so the sticky TOC anchors line up with rendered DOM.
 */
export default function GuideMarkdown({ body }: Props) {
  return (
    <article className="prose prose-gray prose-headings:scroll-mt-24 max-w-none prose-a:text-[#0071CE] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-blockquote:border-l-[#0071CE] prose-strong:text-gray-900">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children, ...rest }) => {
            const text = childrenToText(children);
            return (
              <h2 id={slugifyHeading(text)} {...rest}>
                {children}
              </h2>
            );
          },
          h3: ({ children, ...rest }) => {
            const text = childrenToText(children);
            return (
              <h3 id={slugifyHeading(text)} {...rest}>
                {children}
              </h3>
            );
          },
          a: ({ href, children, ...rest }) => {
            const isExternal = href?.startsWith("http");
            return (
              <a
                href={href}
                {...rest}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </article>
  );
}

function childrenToText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(childrenToText).join("");
  if (children && typeof children === "object" && "props" in children) {
    const node = children as { props: { children?: React.ReactNode } };
    return childrenToText(node.props.children);
  }
  return "";
}
