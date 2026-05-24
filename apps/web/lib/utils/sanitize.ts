/**
 * HTML sanitisation utilities for rendering user-generated Tiptap content.
 *
 * Uses `isomorphic-dompurify` which resolves to the real DOMPurify on the
 * client and a jsdom-backed shim on the server, making it safe for both
 * Next.js Server Components (SSR) and Client Components.
 *
 * Design decisions:
 * - Sanitise at **render time**, not at ingestion. Sanitising Tiptap HTML on
 *   save would corrupt syntax-highlighting `class` attributes and break
 *   round-tripping in the editor.
 * - SVG is intentionally excluded from ALLOWED_TAGS to block <svg onload=…>.
 * - ALLOW_DATA_ATTR: false blocks data-* attribute injection.
 * - `class` is in ALLOWED_ATTR so Tiptap's lowlight `language-*` classes and
 *   prose utility classes survive.
 */

import DOMPurify from "isomorphic-dompurify";
import type { Config } from "dompurify";

// Conservative allowlist that covers every tag Tiptap's StarterKit and the
// extensions used by this app (Headings, CodeBlock/lowlight, Image, Link,
// BulletList, OrderedList, Blockquote, Strike, etc.) can produce.
const ALLOWED_TAGS = [
  // Block elements
  "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote",
  "pre", "code",
  // Inline formatting
  "strong", "em", "s", "u",
  // Links
  "a",
  // Images (from Supabase Storage; src is further constrained by CSP)
  "img",
];

// Only attributes that the above tags legitimately need.
// `class` is required for Tiptap's syntax-highlighting and prose classes.
// Event handlers (on*), style, formaction, etc. are implicitly blocked because
// they are not listed here.
const ALLOWED_ATTR = [
  "href", "target", "rel",          // <a>
  "src", "alt", "width", "height",  // <img>
  "class",                           // prose + lowlight syntax classes
];

const PURIFY_CONFIG: Config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  // Block data-* attributes — prevents attribute-based injection patterns.
  ALLOW_DATA_ATTR: false,
  // html profile: allows standard HTML elements only; blocks SVG and MathML
  // namespaces entirely (closes <svg onload=…> and <math> vectors).
  USE_PROFILES: { html: true },
};

/**
 * Sanitize an HTML string produced by Tiptap before rendering it with
 * `dangerouslySetInnerHTML`. Safe for both server-side (SSR / RSC) and
 * client-side rendering.
 *
 * @param dirty - Raw HTML string from the database (Tiptap output)
 * @returns Sanitized HTML string safe to assign to `__html`
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  // DOMPurify v3 returns `TrustedHTML | string` when the Trusted Types API is
  // available; in our app we do not configure a Trusted Types policy so the
  // value is always a plain string at runtime. The cast is safe here.
  return DOMPurify.sanitize(dirty, PURIFY_CONFIG) as string;
}

/**
 * Convenience wrapper that returns the `{ __html }` object shape React
 * requires for `dangerouslySetInnerHTML`.
 *
 * Usage:
 *   <div dangerouslySetInnerHTML={sanitizedHtml(content)} />
 *
 * The distinct name (vs. the prop name) makes sanitization visible at every
 * call site so reviewers can see at a glance that the content is clean.
 */
export function sanitizedHtml(dirty: string): { __html: string } {
  return { __html: sanitizeHtml(dirty) };
}
