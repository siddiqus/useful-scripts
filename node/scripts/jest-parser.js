const { execSync } = require('child_process');
const { parse } = require('jest-parser');
const { readFileSync, writeFileSync } = require('fs');
const path = require('path');

const e2eTests = execSync('yarn test:e2e --listTests')
  .toString()
  .trim()
  .split('\n')
  .map((s) => `test${s.split('test').pop()}`);
e2eTests.shift();
e2eTests.shift(); // shift twice to get rid of yarn run and jest command
e2eTests.pop(); // get rid of the yarn done message

function parseRecursive(jestJson, parent = '', specs = []) {
  const its = [...jestJson.it, ...jestJson.test];
  if (!jestJson.describe.length && !its.length) {
    return specs;
  }

  if (its.length) {
    // root level its
    specs.push(...its.map((it) => `${parent}__${it.title}`));
  }

  if (jestJson.describe.length) {
    for (const describe of jestJson.describe) {
      parseRecursive(describe, `${parent}__${describe.title}`, specs);
    }
  }

  return specs;
}

const its = e2eTests
  .map((testFile) => ({
    parsed: parse(testFile, readFileSync(testFile).toString()),
    testFile,
  }))
  .map((jestJson) => parseRecursive(jestJson.parsed, jestJson.testFile))
  .flat();

let csv = 'file\tsuite\ttest_case\n';
its.forEach((it) => {
  const splitup = it.split('__');

  const file = splitup.shift();
  const suite = splitup.shift();
  const testCase = splitup.join('__');
  csv += `${file}\t${suite}\t${testCase}\n`;
});

writeFileSync(path.resolve(__dirname, '..', 'reports', 'spec-list.tsv'), csv);
