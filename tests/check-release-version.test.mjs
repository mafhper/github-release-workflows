import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "scripts", "check-release-version.mjs");
const FIX = (name) => join(ROOT, "tests", "fixtures", name);

function run(args, cwd = ROOT) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf8",
    cwd,
  });
}

test("tag bate com package.json", () => {
  const res = run(["v1.0.0", "tests/fixtures/web/package.json"]);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /Versão 1\.0\.0 validada/);
});

test("tag com prerelease é aceita (v1.2.0-beta.1 vs 1.2.0)", () => {
  const res = run(["v1.2.0-beta.1", "tests/fixtures/web/package.json"]);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /divergência/i);
});

test("tag sem v é rejeitada", () => {
  const res = run(["1.0.0", "tests/fixtures/web/package.json"]);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /tag inválida/);
});

test("tag não semver é rejeitada", () => {
  const res = run(["vabc", "tests/fixtures/web/package.json"]);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /tag inválida/);
});

test("json derivado: manifest.json com versão correta passa", () => {
  const res = run([
    "v1.0.0",
    "tests/fixtures/extension/package.json",
    "json", "tests/fixtures/extension/manifest.json", "version",
  ]);
  assert.equal(res.status, 0, res.stderr);
});

test("json derivado divergente falha", () => {
  writeFixtureVersion("1.2.3");
  try {
    const res = run([
      "v1.0.0",
      "tests/fixtures/extension/package.json",
      "json", "tests/fixtures/extension/manifest.json", "version",
    ]);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /manifest\.json/);
  } finally {
    writeFixtureVersion("1.0.0");
  }
});

test("toml derivado: Cargo.toml package.version", () => {
  const res = run([
    "v1.0.0",
    "tests/fixtures/tauri/package.json",
    "toml", "tests/fixtures/tauri/desktop/src-tauri/Cargo.toml", "package.version",
    "json", "tests/fixtures/tauri/desktop/src-tauri/tauri.conf.json", "version",
  ]);
  assert.equal(res.status, 0, res.stderr);
});

test("toml com campo ausente falha", () => {
  const res = run([
    "v1.0.0",
    "tests/fixtures/tauri/package.json",
    "toml", "tests/fixtures/tauri/desktop/src-tauri/Cargo.toml", "missing.version",
  ]);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /não foi possível extrair/);
});

function writeFixtureVersion(version) {
  writeFileSync(
    join(ROOT, "tests", "fixtures", "extension", "manifest.json"),
    JSON.stringify({ name: "kaes-keide-inspector", version, manifest_version: 3 }, null, 2),
    "utf8",
  );
}