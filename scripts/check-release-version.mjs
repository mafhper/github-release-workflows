#!/usr/bin/env node
import { readFileSync } from "node:fs";

const SEMVER_CORE = /^\d+\.\d+\.\d+$/;

function fail(message) {
  console.error(`[check-release-version] ${message}`);
  process.exit(1);
}

function parseTomlVersion(text, sectionName, key) {
  let currentSection = "";
  const values = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const sectionMatch = line.match(/^\[([^\]]+)\]/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*"([^"]*)"/);
    if (kv) {
      values.set(`${currentSection}.${kv[1]}`, kv[2]);
    }
  }
  const value = values.get(`${sectionName}.${key}`);
  if (value === undefined) {
    fail(`não foi possível extrair "${sectionName}.${key}" do TOML (formato não reconhecido).`);
  }
  return value;
}

function resolveJsonField(obj, fieldPath) {
  return fieldPath.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), obj);
}

const [tagArg, sourceFile, ...descriptors] = process.argv.slice(2);

if (!tagArg || !sourceFile) {
  console.error("Uso: check-release-version.mjs <tag> <source.json> [format|path|field ...]");
  process.exit(1);
}

if (!tagArg.startsWith("v")) {
  fail(`tag inválida: "${tagArg}" (esperado vX.Y.Z ou vX.Y.Z-qualifier).`);
}

const tagVersion = tagArg.replace(/^v/, "");
const coreVersion = tagVersion.split(/[-+]/)[0];

if (!SEMVER_CORE.test(coreVersion)) {
  fail(`tag inválida: "${tagArg}" (versão precisa soar X.Y.Z).`);
}

function readSourceVersion() {
  try {
    const pkg = JSON.parse(readFileSync(sourceFile, "utf8"));
    if (typeof pkg.version !== "string") {
      fail(`"${sourceFile}" não possui o campo "version".`);
    }
    return pkg.version;
  } catch (error) {
    fail(`não foi possível ler "${sourceFile}": ${error.message}`);
  }
}

const mismatches = [];
const checked = [];

const sourceVersion = readSourceVersion();
checked.push(sourceFile);
if (sourceVersion !== coreVersion) {
  mismatches.push(`${sourceFile}: ${sourceVersion} !== ${coreVersion}`);
}

if (descriptors.length % 3 !== 0) {
  fail("os arquivos derivados devem vir em trios: format|path|field.");
}

for (let i = 0; i < descriptors.length; i += 3) {
  const [format, path, field] = descriptors.slice(i, i + 3);
  let actual;
  try {
    if (format === "json") {
      const doc = JSON.parse(readFileSync(path, "utf8"));
      actual = resolveJsonField(doc, field);
    } else if (format === "toml") {
      const text = readFileSync(path, "utf8");
      const [section, key] = field.split(".");
      actual = parseTomlVersion(text, section, key);
    } else {
      fail(`formato desconhecido: "${format}".`);
    }
  } catch (error) {
    fail(`não foi possível validar "${path}" (${format}): ${error.message}`);
  }
  checked.push(path);
  if (actual !== coreVersion) {
    mismatches.push(`${path} (${format}:${field}): ${actual} !== ${coreVersion}`);
  }
}

if (mismatches.length > 0) {
  console.error("Divergência de versão encontrada:");
  for (const m of mismatches) console.error(`  - ${m}`);
  process.exit(1);
}

console.log(`Versão ${coreVersion} validada em: ${checked.join(", ")}`);