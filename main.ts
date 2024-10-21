import { readdir, readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from '@std/cli/parse-args';
import { Args } from '@std/cli/parse-args';
import path from 'node:path';
import chalk from '@nothing628/chalk';

type ImportMap = Map<string, number[]>;

export function parseArguments(args: string[]): Args {
    const strings = ['dir'];
    const booleans = ['fix'];
    const aliases = { dir: 'd', fix: 'f' };
    return parseArgs(args, { string: strings, boolean: booleans, alias: aliases });
}

async function main(): Promise<void> {
    const args = parseArguments(Deno.args);
    if (!args) throw new Error('No args');
    const { dir, fix } = args;
	if (!dir) throw new Error('No directory specified');
    const suffixes = ['js', 'jsx', 'ts', 'tsx'];
    const pathRegex = /['"](.*?)['"]/g;
    const ignoreDirs = new Set<string>(['.git', 'node_modules']);

    // async function processDirectory(currentDir: string) {
	// 	const stat = await Deno.stat(currentDir);
	// 	console.log(stat);
    //     const files = await readdir(currentDir, { withFileTypes: true });

    //     for (const file of files) {
    //         const fullPath = path.join(currentDir, file.name);

    //         if (file.isDirectory()) {
    //             if (!ignoreDirs.has(file.name)) {
    //                 await processDirectory(fullPath);
    //             } else {
    //                 console.log(`Skipping directory: ${file.name}`);
    //             }
    //         } else {
    //             suffixes.forEach(async (suffix) => {
    //                 if (file.name.endsWith(suffix)) {
    //                     const importPaths: ImportMap = new Map();
    //                     const contents = await readFile(fullPath, 'utf-8');
    //                     const lines = contents.split('\n');
    //                     lines.forEach((line, index) => {
    //                         if (line.startsWith('import')) {
    //                             const match = line.match(pathRegex)?.[0].replace(/['"]/g, '');
    //                             if (!match) return;
    //                             if (importPaths.has(match)) {
    //                                 importPaths.get(match)?.push(index);
    //                             } else {
    //                                 importPaths.set(match, [index]);
    //                             }
    //                         }
    //                     });
    //                     for (const [key, value] of importPaths.entries()) {
    //                         if (value.length > 1) {
    //                             console.log(chalk.blue(`${file.name}`) + ` has multiple imports of ` + chalk.hex('fb002c')(`"${key}"`) + ` on lines (${value.join(', ')})`);
    //                         }
    //                     }
    //                     if (fix) {
    //                         fixImports(lines, importPaths, fullPath);
    //                     }
    //                 }
    //             });
    //         }
    //     }
    // }

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

function fixImports(lines: string[], importPaths: ImportMap, fullPath: string) {
    for (const [modulePath, lineNumbers] of importPaths.entries()) {
        if (lineNumbers.length > 1) {
            const items: string[] = [];
            lineNumbers.forEach((lineNumber) => {
                const item = lines[lineNumber].match(/{([^}]*)}/g)?.[0].replace(/[{}\ ]/g, '');
                if (item) items.push(item);
            });
            const newLine = `import { ${items.join(', ')} } from '${modulePath}';`;

            //sort the line numbers
            lineNumbers.sort((a, b) => b - a);

            // Remove the lines
            for (const lineNum of lineNumbers) {
                if (lineNum >= 0 && lineNum < lines.length) {
                    lines.splice(lineNum, 1);
                }
            }

            // Insert the new line at the position of the first removed line
            const firstRemovedLine = lineNumbers[lineNumbers.length - 1];
            if (firstRemovedLine >= 0 && firstRemovedLine < lines.length) {
                lines.splice(firstRemovedLine, 0, newLine);
            } else {
                // If all removed lines were out of range, append the new line
                lines.push(newLine);
            }
            try {
                writeFile(fullPath, lines.join('\n'), 'utf-8');
                console.log(`Successfully removed lines` + chalk.red(` ${lineNumbers.join(', ')}`) + ` and inserted `+ chalk.green(`${newLine}`) + ` in ${chalk.blue(fullPath)}`);
            } catch (error) {
                console.error('Error:', error);
            }
        }
    }
}

main();
