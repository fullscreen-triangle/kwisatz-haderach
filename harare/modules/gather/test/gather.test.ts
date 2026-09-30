import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { credentialShaped, freshCorpus, safe, writeDoc } from "../src/corpus.js";
import { decodeEntities, decodePage, htmlToText, titleOf } from "../src/html.js";
import { domainOf, sceneOf } from "../src/names.js";

const PAGE = `<!doctype html><html><head><title>Zahnarzt Greifswald &amp; Umgebung</title>
<style>.x{color:red}</style><script>track("zahnarzt")</script></head>
<body><nav><a href="/">Home</a> <a href="/impressum">Impressum</a></nav>
<h1>Praxis Dr.&nbsp;Muster</h1><p>Wir behandeln Kinder&#8203;und Erwachsene.<br>Termine: 03834&nbsp;123</p>
<!-- a comment with zahnarzt -->
<ul><li>Prophylaxe</li><li>Implantate</li></ul><footer>© 2026</footer></body></html>`;

test("html becomes lines of text without scripts, styles, nav, footer or comments", () => {
  const t = htmlToText(PAGE);
  assert.equal(titleOf(PAGE), "Zahnarzt Greifswald & Umgebung");
  assert.ok(t.includes("Praxis Dr. Muster"));
  assert.ok(t.includes("Termine: 03834 123"));
  assert.deepEqual(t.split("\n").filter((l) => l === "Prophylaxe" || l === "Implantate"), ["Prophylaxe", "Implantate"]);
  for (const gone of ["track(", "color:red", "Impressum", "a comment", "© 2026"]) assert.ok(!t.includes(gone), gone);
  assert.ok(!/\n\n\n/.test(t));
  assert.equal(decodeEntities("&auml;&#x41;&#66;&bogus;"), "äAB&bogus;");
});

test("scenes: laptop roots and web domains", () => {
  assert.equal(sceneOf("C:\\Users\\kunda\\Documents\\greifswald\\Mietvertrag.pdf"), "Documents");
  assert.equal(sceneOf("/home/x/notes.md"), "laptop");
  assert.equal(domainOf("https://www.zahnarztgreifswald.de/praxis"), "zahnarztgreifswald.de");
  assert.equal(domainOf("not a url"), "web");
});

test("a corpus is pinned for spraypaint, and documents land in their scene", () => {
  process.env["HARARE_CORPORA"] = mkdtempSync(join(tmpdir(), "gather-"));
  const dir = freshCorpus("run 1/x", "web", 3);
  assert.ok(existsSync(join(dir, ".spraypaint")));
  const rel = writeDoc(dir, "zahnarzt greifswald.de", "01-abc.md", ["# T", "", "Web page: https://x"], "body");
  assert.equal(rel, "zahnarzt-greifswald.de/01-abc.md");
  assert.equal(readFileSync(join(dir, rel), "utf8"), "# T\n\nWeb page: https://x\n\nbody\n");
  assert.equal(safe("../../etc"), "etc");
  assert.equal(safe(""), "x");
});

test("credential-shaped queries are recognised", () => {
  for (const q of ["github token", "the api key for vercel", "Passwort Uni", "my secrets"]) assert.ok(credentialShaped(q), q);
  for (const q of ["Am Ryck Mietvertrag", "tokenizer design", "secretary general"]) assert.ok(!credentialShaped(q), q);
});

test("a page is decoded in its declared charset", () => {
  const latin1 = Buffer.from("<meta charset=\"iso-8859-1\"><p>Zahnärzte in Greifswald</p>", "latin1");
  assert.match(decodePage(latin1, "text/html"), /Zahnärzte/);
  assert.match(decodePage(latin1, "text/html; charset=ISO-8859-1"), /Zahnärzte/);
  assert.match(decodePage(Buffer.from("<p>Zahnärzte</p>", "utf8"), "text/html"), /Zahnärzte/);
  assert.match(decodePage(Buffer.from("<p>x</p>"), "text/html; charset=no-such-thing"), /x/);
});
