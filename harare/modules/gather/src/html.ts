// HTML to readable text, without a parser dependency. Good enough for a lexical judge:
// spraypaint needs the words and their lines, not the layout.

const DROP = /<(script|style|noscript|svg|template|iframe|head|nav|footer|form)\b[\s\S]*?<\/\1\s*>/gi;
const BLOCK_END = /<\/(p|div|li|ul|ol|h[1-6]|tr|table|section|article|blockquote|pre|dd|dt|header|main|aside)\s*>|<br\s*\/?>|<hr\s*\/?>/gi;

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…",
  auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", eacute: "é", egrave: "è",
  laquo: "«", raquo: "»", bdquo: "„", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", copy: "©", euro: "€",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return NAMED[e] ?? m;
  });
}

export function titleOf(html: string): string {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? decodeEntities(m[1]!.replace(/\s+/g, " ").trim()) : "";
}

export function htmlToText(html: string): string {
  const text = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(DROP, " ")
    .replace(BLOCK_END, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(text)
    .split("\n")
    .map((l) => l.replace(/[ \t\r\f\v ]+/g, " ").trim())
    .filter((l, i, a) => l || (i > 0 && a[i - 1]))           // keep single blank lines, drop runs
    .join("\n")
    .trim();
}

/** Decode a page's bytes in its declared charset: the Content-Type header first, then a
 *  <meta charset> / http-equiv in the first 4 KB, else UTF-8. German directory sites still
 *  serve ISO-8859-1, which read as UTF-8 turns every umlaut into U+FFFD. */
export function decodePage(bytes: Uint8Array, contentType: string): string {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 4096));
  const label = (/charset\s*=\s*["']?([\w:.-]+)/i.exec(contentType) ?? /<meta[^>]+charset\s*=\s*["']?([\w:.-]+)/i.exec(head))?.[1];
  try {
    return new TextDecoder(label ?? "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);         // an unknown label
  }
}
