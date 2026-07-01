import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";

/**
 * Admin Content Studio (Feature 8) — AI-drafts catalog/guide content + SEO meta
 * from a short brief, so the content moat scales. ADMIN-only. Returns a draft
 * the editor reviews and edits before saving — never auto-publishes.
 *
 * Not credit-billed (internal ops tool). Uses Groq (existing provider).
 */

const MODEL = "llama-3.3-70b-versatile";

interface Draft {
  title: string;
  excerpt: string;
  description: string; // markdown
  metaDescription: string;
  tags: string[];
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const topic = typeof body?.topic === "string" ? body.topic.trim().slice(0, 200) : "";
    const region = typeof body?.region === "string" ? body.region.trim().slice(0, 60) : "";
    const kind = body?.kind === "guide" ? "guide" : "destination";
    if (!topic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    const systemPrompt = `You are a senior Bali travel copywriter for the Voyra / Bali Travel Now brand.
Write accurate, engaging, SEO-aware content for a ${kind === "guide" ? "long-form travel guide" : "bookable destination listing"}.
${region ? `Region: ${region}.` : ""}

Return ONLY JSON:
{
  "title": string,               // compelling, <70 chars
  "excerpt": string,             // 1-2 sentence hook, <160 chars
  "description": string,         // ${kind === "guide" ? "300-500 word markdown article with ## headings" : "120-200 word markdown listing description"}
  "metaDescription": string,     // SEO meta, <155 chars
  "tags": string[]               // 3-6 lowercase tags
}

RULES
- Keep Balinese/Indonesian proper nouns intact (Ubud, Nyepi, Tegallalang, Uluwatu).
- Be truthful and specific; do not invent prices, opening hours, or fake awards.
- Practical, warm, non-cliché tone.`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Write ${kind} content about: ${topic}` },
      ],
    });

    let draft: Draft;
    try {
      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      draft = {
        title: typeof parsed.title === "string" ? parsed.title : topic,
        excerpt: typeof parsed.excerpt === "string" ? parsed.excerpt : "",
        description: typeof parsed.description === "string" ? parsed.description : "",
        metaDescription: typeof parsed.metaDescription === "string" ? parsed.metaDescription : "",
        tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: unknown) => typeof t === "string").slice(0, 6) : [],
      };
    } catch {
      return NextResponse.json({ error: "Draft generation failed" }, { status: 502 });
    }

    return NextResponse.json({ draft });
  } catch (error) {
    console.error("[admin/ai/content-draft]", error instanceof Error ? error.message : "Unknown");
    return NextResponse.json({ error: "Content studio unavailable" }, { status: 500 });
  }
}
