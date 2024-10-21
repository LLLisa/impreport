import { assertEquals, assertRejects }  from "@std/assert";
import { readFile } from 'node:fs/promises';
import { parseArguments, findDuplicateImps } from "./findDuplicateImps.ts";
import * as path from "node:path";

// Test parseArguments function
Deno.test("parseArguments with valid input", () => {
  const args = ["--dir", "./test", "--fix"];
  const result = parseArguments(args);
  assertEquals(result.dir, "./test");
  assertEquals(result.fix, true);
});

Deno.test("parseArguments with aliases", () => {
  const args = ["-d", "./test", "-f"];
  const result = parseArguments(args);
  assertEquals(result.dir, "./test");
  assertEquals(result.fix, true);
});

Deno.test("parseArguments with missing dir", () => {
  const args = ["--fix"];
  const result = parseArguments(args);
  assertEquals(result.dir, undefined);
  assertEquals(result.fix, true);
});

// Test findDuplicateImps function
Deno.test("findDuplicateImps with file input", async () => {
  const testDir = await Deno.makeTempDir();
  const testFile = path.join(testDir, "test.ts");
  await Deno.writeTextFile(testFile, 'import { a } from "mod";\nimport { b } from "mod";');

  await findDuplicateImps(["--dir", testFile]);

  // Clean up
  await Deno.remove(testDir, { recursive: true });
});

Deno.test("findDuplicateImps with directory input", async () => {
  const testDir = await Deno.makeTempDir();
  const testFile = path.join(testDir, "test.ts");
  await Deno.writeTextFile(testFile, 'import { a } from "mod";\nimport { b } from "mod";');

  await findDuplicateImps(["--dir", testDir]);

  // Clean up
  await Deno.remove(testDir, { recursive: true });
});

// Test findDuplicateImps function with fix option
Deno.test("findDuplicateImps with fix option", async () => {
  const testDir = await Deno.makeTempDir();
  const testFile = path.join(testDir, "test.ts");
  await Deno.writeTextFile(testFile, 'import { a } from "mod";\nimport { b } from "mod";');

  await findDuplicateImps(["--dir", testDir, "--fix"]);

  const newContent = await readFile(testFile, "utf-8" );
  assertEquals(newContent, "import { a, b } from 'mod';");

  // Clean up
  await Deno.remove(testDir, { recursive: true });
});

Deno.test("findDuplicateImps with invalid arguments", async () => {
  await assertRejects(
    async () => {
      await findDuplicateImps([]);
    },
    Error,
    "No directory specified"
  );
});