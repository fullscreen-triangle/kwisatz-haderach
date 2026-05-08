/**
 * Global Jest setup. Runs once per test file, after Jest is initialised but
 * before the test code itself. Use this for things every test should see —
 * e.g., quieter console during runs, deterministic random seeds.
 */

// Suppress logger noise in tests unless a test opts back in.
const originalLog = console.log;
const originalInfo = console.info;
const originalWarn = console.warn;

beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalLog;
  console.info = originalInfo;
  console.warn = originalWarn;
});

// Re-export nothing intentionally — this file is loaded for side effects only.
export {};
