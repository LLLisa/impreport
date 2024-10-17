import { readFile, readdir } from 'node:fs/promises';
import { parseArgs } from '@std/cli/parse-args';
import { Args } from '@std/cli/parse-args';
import path from 'node:path';

type ImportMap = Map<string, number[]>;

export function parseArguments(args: string[]): Args {
    const strings = ['dir'];
    const aliases = { dir: 'd' };
    return parseArgs(args, { string: strings, alias: aliases });
}

async function main(): Promise<void> {
    const args = parseArguments(Deno.args);
    if (!args) throw new Error('No args');
    const { dir } = args;
    const suffixes = ['js', 'jsx', 'ts', 'tsx'];
    const pathRegex = /['"](.*?)['"]/g;
    const ignoreDirs = new Set<string>(['.git', 'node_modules']);

    async function processDirectory(currentDir: string) {
        const files = await readdir(currentDir, { withFileTypes: true });

        for (const file of files) {
            const fullPath = path.join(currentDir, file.name);

            if (file.isDirectory()) {
                if (!ignoreDirs.has(file.name)) {
                    await processDirectory(fullPath);
                } else {
                    console.log(`Skipping directory: ${file.name}`);
                }
            } else {
                suffixes.forEach(async (suffix) => {
                    if (file.name.endsWith(suffix)) {
                        const importPaths: ImportMap = new Map();
                        const contents = await readFile(fullPath, 'utf-8');
                        const lines = contents.split('\n');
                        lines.forEach((line, index) => {
                            if (line.startsWith('import')) {
                                const match = line.match(pathRegex)?.[0].replaceAll('"', '');
                                if (!match) return;
                                if (importPaths.has(match)) {
                                    importPaths.get(match)?.push(index);
                                } else {
                                    importPaths.set(match, [index]);
                                }
                            }
                        });
                        for (const [key, value] of importPaths.entries()) {
							if (value.length > 1) {
								console.log(`${file.name} has multiple imports of ${key} on lines (${value.join(', ')})`);
							}
                        }
                    }
                });
            }
        }
    }
    await processDirectory(dir);
}

main();
