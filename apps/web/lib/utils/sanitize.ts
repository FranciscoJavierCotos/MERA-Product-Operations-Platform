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

// DOMPurify has an internal DATA_URI_TAGS list (img, audio, video, …) that
// exempts those tags from the ALLOWED_URI_REGEXP check, letting `data:` URIs
// through even when they are not explicitly allowed. There is no config option
// to override this list, so we use an afterSanitizeAttributes hook instead.
//
// The guard prevents the hook from being registered more than once if the
// module is evaluated multiple times (e.g. Vitest re-imports, HMR).
let _hooksInstalled = false;
function ensureHooks(): void {
  if (_hooksInstalled) return;
  _hooksInstalled = true;

  const DATA_URI_RE = /^data:/i;

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    const el = node as Element;
    if (typeof el.getAttribute !== "function") return;

    // Strip data: URIs from src (img) and href (a) — our images come from
    // Supabase Storage (https://), never from embedded data URIs.
    for (const attr of ["src", "href"]) {
      const val = el.getAttribute(attr);
      if (val && DATA_URI_RE.test(val)) {
        el.removeAttribute(attr);
      }
    }
  });
}

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
  // NOTE: DO NOT add USE_PROFILES here. When USE_PROFILES is set, DOMPurify
  // resets ALLOWED_TAGS and ALLOWED_ATTR to the profile's full HTML list,
  // completely overriding our restrictive allowlists and re-admitting tags
  // like <details>, style= attributes, and data: URIs. Our explicit
  // ALLOWED_TAGS already blocks SVG/MathML (they are simply not listed).
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
  ensureHooks();
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
