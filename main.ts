import { readFile, readdir } from "node:fs/promises";
import { parseArgs } from "@std/cli/parse-args";
import { Args } from "@std/cli/parse-args";
import path from "node:path";

export function parseArguments(args: string[]): Args {
  const strings = ["dir"];
  const aliases = {"dir":"d"};
  return parseArgs(args, { string: strings, alias: aliases });
}

async function main(): Promise<void> {
  const args = parseArguments(Deno.args);
  if (!args) throw new Error("No args");
  const { dir } = args;
  const suffixes = ['js', 'jsx', 'ts', 'tsx'];
  const pathRegex = /['"](.*?)['"]/g;

  const files = await readdir(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      await main();
    } else {
      suffixes.forEach(async (suffix) => {
        if (file.name.endsWith(suffix)) {
          const importPaths = new Map<string, number[]>();
          const contents = await readFile(fullPath, "utf-8");
          const lines = contents.split("\n");
          lines.forEach((line, index) => {
            if (line.startsWith("import")) {
              // console.log(`${file.name} line ${index}: ${line}`);
              const matchArray = line.match(pathRegex);
              if (!matchArray) return;
              const match = matchArray[0].replaceAll('"', "");
              console.log(match ? match : "no match");
              if (match) {
                const path = match[1];
                if (importPaths.has(path)) {
                  importPaths.get(path)?.push(index);
                } else {
                  importPaths.set(path, [index]);
                }
              }
            }
          });
        }
      });
    }
  }
}

main();