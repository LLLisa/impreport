import { writeFile } from 'node:fs/promises';
import chalk from '@nothing628/chalk';

export type ImportMap = Map<string, number[]>;

export function fixImports(lines: string[], importPaths: ImportMap, fullPath: string) {
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


