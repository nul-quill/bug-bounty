import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const lockPath = fileURLToPath(new URL("../../../../package-lock.json", import.meta.url));
const manifestPath = fileURLToPath(new URL("../../package.json", import.meta.url));

const MINIMUMS = {
  express: [4, 22, 3],
  "body-parser": [1, 20, 8],
  "proxy-addr": [2, 0, 8],
  qs: [6, 16, 0]
};

function toParts(version) {
  return version.split(".").map((part) => Number(part));
}

function isAtLeast(version, minimum) {
  const parts = toParts(version);

  return parts.every((part, index) => part >= minimum[index]);
}

function lockedVersions() {
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  const found = {};

  for (const [key, entry] of Object.entries(lock.packages)) {
    const name = key.replace(/^.*node_modules\//, "");

    if (name in MINIMUMS && !found[name]) {
      found[name] = entry.version;
    }
  }

  return found;
}

test("api manifest requires an express release with patched parser deps", () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  assert.equal(manifest.dependencies.express, "^4.22.3");
});

test("locked dependency graph is past the parser advisory ranges", () => {
  const locked = lockedVersions();

  for (const [name, minimum] of Object.entries(MINIMUMS)) {
    assert.ok(locked[name], `${name} must be present in the lockfile`);
    assert.ok(
      isAtLeast(locked[name], minimum),
      `${name}@${locked[name]} must be >= ${minimum.join(".")}`
    );
  }
});
