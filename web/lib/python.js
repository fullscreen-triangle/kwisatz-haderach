// The Python that runs the repo's tools (tools/*): $PYTHON if set, else the node's venv
// (/srv/agent-smith/.venv on server-2, which has the backend's packages), else `python3` on
// Linux/macOS and `python` on Windows. server-2 has no bare `python`, so a hard-coded
// 'python' made every panel that runs a tool fail there.
import fs from 'fs';
import path from 'path';

export const REPO_ROOT = path.join(process.cwd(), '..');

export function python() {
  if (process.env.PYTHON) return process.env.PYTHON;
  const venv = process.platform === 'win32'
    ? path.join(REPO_ROOT, '.venv', 'Scripts', 'python.exe')
    : path.join(REPO_ROOT, '.venv', 'bin', 'python');
  if (fs.existsSync(venv)) return venv;
  return process.platform === 'win32' ? 'python' : 'python3';
}
