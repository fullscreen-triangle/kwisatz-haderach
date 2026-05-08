/**
 * Test-time mock for the `vscode` module.
 *
 * The real VSCode API is only available when the extension is loaded inside
 * the editor's extension host. Jest runs in plain Node, so any source file
 * that imports `vscode` would fail at module-resolution time. This mock
 * provides the minimal subset our Logger and utility classes touch:
 * `OutputChannel`, `window.createOutputChannel`, and a stub `ExtensionContext`.
 *
 * Anything not yet stubbed throws a `MockNotImplemented` error so that a
 * failing test points at exactly which API surface needs to grow here.
 */

class MockNotImplemented extends Error {
  constructor(api: string) {
    super(
      `vscode.${api} is not implemented in the test mock. ` +
        `Add it to tests/__mocks__/vscode.ts if a test needs it.`
    );
    this.name = 'MockNotImplemented';
  }
}

export interface OutputChannel {
  name: string;
  append(value: string): void;
  appendLine(value: string): void;
  clear(): void;
  show(preserveFocus?: boolean): void;
  hide(): void;
  dispose(): void;
}

class StubOutputChannel implements OutputChannel {
  name: string;
  private buffer: string[] = [];

  constructor(name: string) {
    this.name = name;
  }

  append(value: string): void {
    this.buffer.push(value);
  }

  appendLine(value: string): void {
    this.buffer.push(value + '\n');
  }

  clear(): void {
    this.buffer = [];
  }

  show(_preserveFocus?: boolean): void {
    /* no-op in tests */
  }

  hide(): void {
    /* no-op in tests */
  }

  dispose(): void {
    this.buffer = [];
  }

  /** Test-only helper: read what was logged. Not part of the real API. */
  __getBuffer(): string[] {
    return [...this.buffer];
  }
}

export const window = {
  createOutputChannel: (name: string): OutputChannel => new StubOutputChannel(name),
  showInformationMessage: (_message: string): Promise<string | undefined> =>
    Promise.resolve(undefined),
  showWarningMessage: (_message: string): Promise<string | undefined> =>
    Promise.resolve(undefined),
  showErrorMessage: (_message: string): Promise<string | undefined> =>
    Promise.resolve(undefined)
};

export const workspace = {
  getConfiguration: (_section?: string) => ({
    get: <T>(_key: string, defaultValue?: T): T | undefined => defaultValue,
    has: (_key: string) => false,
    update: () => Promise.resolve()
  }),
  workspaceFolders: undefined as unknown as { uri: { fsPath: string } }[] | undefined
};

export const commands = {
  registerCommand: (_command: string, _callback: (...args: unknown[]) => unknown) => ({
    dispose: () => {
      /* no-op */
    }
  }),
  executeCommand: (_command: string, ..._rest: unknown[]) => Promise.resolve()
};

export const Uri = {
  file: (path: string) => ({ fsPath: path, scheme: 'file', path }),
  parse: (path: string) => ({ fsPath: path, scheme: 'file', path })
};

export interface ExtensionContext {
  subscriptions: Array<{ dispose: () => void }>;
  extensionPath: string;
  globalState: { get<T>(key: string): T | undefined; update(key: string, value: unknown): Thenable<void> };
  workspaceState: { get<T>(key: string): T | undefined; update(key: string, value: unknown): Thenable<void> };
}

export const ExtensionMode = {
  Production: 1,
  Development: 2,
  Test: 3
} as const;

// Anything else is a hard error so we notice missing surface area immediately.
export const env = new Proxy(
  {},
  {
    get(_target, prop) {
      throw new MockNotImplemented(`env.${String(prop)}`);
    }
  }
);

export default {
  window,
  workspace,
  commands,
  Uri,
  ExtensionMode
};
