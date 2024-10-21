import { readdir, readFile } from 'node:fs/promises';
import { parseArgs } from '@std/cli/parse-args';
import { Args } from '@std/cli/parse-args';
import path from 'node:path';
import chalk from '@nothing628/chalk';
import { fixImports, ImportMap } from './fixImps.ts';


export function parseArguments(args: string[]): Args {
    const strings = ['dir'];
    const booleans = ['fix'];
    const aliases = { dir: 'd', fix: 'f' };
    return parseArgs(args, { string: strings, boolean: booleans, alias: aliases });
}

export async function findDuplicateImps(args: string[]): Promise<void> {
    const parsedArgs = parseArguments(args);
    if (!args) throw new Error('No args');
    const { dir, fix } = parsedArgs;
	if (!dir) throw new Error('No directory specified');
    const suffixes = ['js', 'jsx', 'ts', 'tsx'];
    const pathRegex = /['"](.*?)['"]/g;
    const ignoreDirs = new Set<string>(['.git', 'node_modules']);

	async function processDirectory(input: string) {
		const fullPath = path.resolve(input);
		const stat = await Deno.stat(fullPath);
	
		if (stat.isFile) {
			await processFile(fullPath);
		} else if (stat.isDirectory) {
			const files = await readdir(fullPath, { withFileTypes: true });
	
			for (const file of files) {
				const filePath = path.join(fullPath, file.name);
	
				if (file.isDirectory()) {
					if (!ignoreDirs.has(file.name)) {
						await processDirectory(filePath);
					} else {
						console.log(`Skipping directory: ${file.name}`);
					}
				} else {
					await processFile(filePath);
				}
			}
		} else {
			console.log(`Skipping: ${fullPath} (neither file nor directory)`);
		}
	}

	async function processFile(filePath: string) {
		const fileName = path.basename(filePath);
		if (suffixes.some(suffix => fileName.endsWith(suffix))) {
			const importPaths: ImportMap = new Map();
			const contents = await readFile(filePath, 'utf-8');
			const lines = contents.split('\n');
			
      // Find all import statements and their line numbers
      lines.forEach((line, index) => {
				if (line.startsWith('import')) {
					const match = line.match(pathRegex)?.[0].replace(/['"]/g, '');
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
					console.log(chalk.blue(`${fileName}`) + ` has multiple imports of ` + chalk.hex('fb002c')(`"${key}"`) + ` on lines (${value.join(', ')})`);
				}
			}
			if (fix) {
				fixImports(lines, importPaths, filePath);
			}
		}
	}

    await processDirectory(dir);
}

