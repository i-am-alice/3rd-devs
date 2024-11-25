import { table } from 'table';
import chalk from 'chalk';

export function currentDateTime() {
  const now = new Date();
  return now.getFullYear() + '-' + 
         String(now.getMonth() + 1).padStart(2, '0') + '-' +
         String(now.getDate()).padStart(2, '0') + ' ' +
         String(now.getHours()).padStart(2, '0') + ':' +
         String(now.getMinutes()).padStart(2, '0');
}

export const formatDateTime = (date: Date, includeTime: boolean = true) => {
  const pad = (num: number) => num.toString().padStart(2, '0');
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return includeTime ? `${dateStr} ${pad(date.getHours())}:${pad(date.getMinutes())}` : dateStr;
};

export function getResult(content: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

export function displayResultsAsTable(results) {
  console.log(results)
  const tableData = [];
  const headers = [
    chalk.bold('Query'),
    chalk.bold('Variables'),
    chalk.bold('Result'),
  ];
  tableData.push(headers);

  results.forEach((result) => {
    let resultOutput = '';
    if (result.success) {
      resultOutput = chalk.green(`[PASS] ${result.response.output}`);
    } else {
      resultOutput = chalk.red(`[ERROR] ${result.error.split('Stack Trace')[0].trim()}\n\n-- ${result.response.output}`);
    }

    const row = [
      result.testCase.vars.query || '',
      JSON.stringify(Object.fromEntries(Object.entries(result.testCase.vars).filter(([key]) => key !== 'query')), null, 2) || '',
      resultOutput,
    ];
    tableData.push(row);
  });

  const config = {
    columns: {
      0: { width: 20 },  // Query
      1: { width: 65 },  // Variables
      2: { width: 95 },  // Result
    },
    columnDefault: {
      wrapWord: false
    },
  };

  console.log(table(tableData, config));

  // Add summary
  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;

  console.log(chalk.bold('\nSummary:'));
  console.log(chalk.green(`Passed: ${passedTests}`));
  console.log(chalk.red(`Failed: ${failedTests}`));
  console.log(chalk.blue(`Total: ${totalTests}`));
}
