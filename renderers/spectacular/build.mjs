// node renderers/spectacular/build.mjs [path-to-spectacular]
//
// Rebuilds web/public/vendor/spectacular/spectacular.js from a checkout of spectacular
// (branch `rebuild`) with that checkout's own vite and dependencies. The built file is
// committed, so the server never builds it. Default checkout: ~/Documents/vision/spectacular.
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const here = import.meta.dirname;
const root = resolve(process.argv[2] ?? process.env.SPECTACULAR ?? resolve(homedir(), "Documents/vision/spectacular"));
const vite = resolve(root, "node_modules/vite/bin/vite.js");
if (!existsSync(vite)) {
  console.error(`no spectacular checkout with installed dependencies at ${root} (run npm install there)`);
  process.exit(2);
}
execFileSync(process.execPath, [vite, "build", "--config", resolve(here, "vite.config.mjs")], {
  stdio: "inherit",
  env: { ...process.env, SPECTACULAR: root },
});
// vite also writes the worker as a separate file for the default worker path, which the
// desk never takes (show() passes the inline worker); only spectacular.js is shipped.
rmSync(resolve(here, "../../web/public/vendor/spectacular/assets"), { recursive: true, force: true });
