// Which scene a gathered document belongs to. Kept apart from the module entry points
// (which start a module on import) so it can be tested.

/** The served root a laptop path lies under: C:\Users\x\Documents\a\b.pdf -> Documents. */
export function sceneOf(path: string): string {
  const m = /[\\/]Users[\\/][^\\/]+[\\/]([^\\/]+)/i.exec(path);
  return m ? m[1]! : "laptop";
}

/** A web page's scene: its host without `www.`. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || "web";
  } catch {
    return "web";
  }
}
