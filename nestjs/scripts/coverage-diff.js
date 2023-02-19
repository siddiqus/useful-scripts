/* eslint-disable security-node/non-literal-reg-expr */
const { execSync } = require('child_process');
const { keyBy } = require('lodash');

const coveragePathIgnorePatterns =
  require('../jest.config').coveragePathIgnorePatterns;

function getCurrentCommitHash() {
  const command = 'git rev-parse HEAD';
  const branch = execSync(command);
  return branch.toString().trim();
}

function getDiffList(baseRef) {
  const currentCommitHash = getCurrentCommitHash();

  const command = `git diff --name-only origin/${baseRef} ${currentCommitHash}`;
  const diffs = execSync(command).toString();

  return diffs
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function filterIgnored(fileNames) {
  const coverageIgnore = coveragePathIgnorePatterns.map((c) => {
    if (c.charAt(0) === '/' || c.charAt(0) === '!') {
      c = c.substring(1, c.length);
    }
    return `(${c
      .replace(/\*/g, '')
      .replace(/\//g, '\\/')
      .replace(/\./g, '\\.')})`;
  });

  return fileNames.filter(
    (name) => !new RegExp(`.*${coverageIgnore.join('|')}.*`, 'gm').test(name),
  );
}

function parseLine(line) {
  const [name, statement, branch, funcs, lines] = line
    .split('|')
    .map((s) => s.trim());

  if (!name) {
    return null;
  }

  return {
    name,
    statements: `${statement}%`,
    branches: `${branch}%`,
    functions: `${funcs}%`,
    lines: `${lines}%`,
  };
}

function getCoverage() {
  try {
    const result = execSync('yarn test --coverage').toString().split('\n');

    const allFilesAnchor = result.findIndex((s) => s.includes('All files'));

    let currentFolder = '';

    const coverageInfo = [];

    const allFilesCoverage = parseLine(result[allFilesAnchor]);

    for (let index = allFilesAnchor + 1; index < result.length; index++) {
      const line = result[index];

      if (
        line.includes('-------') ||
        line.includes('Done in') ||
        line.includes('jest-stare')
      ) {
        continue;
      }

      const lineInfo = parseLine(line);

      if (!lineInfo) {
        continue;
      }

      const isFolder = !(line.includes('.ts') && line.includes('.js'));
      if (isFolder) {
        currentFolder = lineInfo.name;
        continue;
      }

      lineInfo.name = `src/${currentFolder}/${lineInfo.name}`;
      coverageInfo.push(lineInfo);
    }

    return {
      files: coverageInfo,
      all: allFilesCoverage,
    };
  } catch (error) {
    console.error('failed:', error.toString());
    process.exit(1);
  }
}

function printCsv(data) {
  const headers = ['name', 'statements', 'branches', 'functions', 'lines'];

  let csvString = headers.join(',') + '\n';

  for (const d of data) {
    csvString = headers.map((h) => d[h]).join(',') + '\n';
  }

  console.log(csvString);
}

function printMarkdownTable(data) {
  function _markdownTableRow(data) {
    return `|${data.join('|')}|\n`;
  }

  const headers = ['name', 'statements', 'branches', 'functions', 'lines'];

  let markdownTable = _markdownTableRow(headers);
  markdownTable += _markdownTableRow(headers.map((_h) => ':---')); // left aligned

  const allData = data.shift();
  markdownTable += _markdownTableRow(headers.map((h) => allData[h]));

  const restOfTheData = data.sort((a, b) => a.name.localeCompare(b.name));
  restOfTheData.forEach((row) => {
    markdownTable += _markdownTableRow(headers.map((h) => row[h]));
  });

  console.log(markdownTable);
}

function getCoverageForDiffFiles(baseRef) {
  const diffList = getDiffList(baseRef).filter(
    (s) =>
      (s.includes('.ts') || s.includes('.js')) &&
      !s.includes('.spec.') &&
      !s.includes('.test.') &&
      !s.includes('.e2e'),
  );

  const coverage = getCoverage();
  const coverageByFilename = keyBy(coverage.files, 'name');

  const diffListWithoutJestIgnore = filterIgnored(diffList);
  let diffFilesCoverage = diffListWithoutJestIgnore.map((name) => {
    const coverageInfo = coverageByFilename[name];
    return coverageInfo
      ? coverageInfo
      : {
          name: name,
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0,
        };
  });

  diffFilesCoverage = diffFilesCoverage.map((d) => {
    return {
      ...d,
      name: d.name.split('src/').pop(), // remove src from base path
    };
  });

  diffFilesCoverage.unshift(coverage.all);
  return diffFilesCoverage;
}

function printData(format, data) {
  if (format === 'markdown') {
    printMarkdownTable(data);
  }

  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
  }

  if (format === 'csv') {
    console.log(printCsv(data));
  }
}

function getArgs() {
  const args = process.argv.slice(2).reduce((a, s) => {
    const [key, val] = s.split('=');
    a[key] = val;
    return a;
  }, {});

  if (!['markdown', 'csv', 'json'].includes(args.format)) {
    console.error(
      // eslint-disable-next-line quotes
      `!!! Please provide coverage format, one of ['markdown', 'csv', 'json']. e.g. format=markdown`,
    );
    process.exit(1);
  }

  if (!args.baseRef) {
    console.error(
      // eslint-disable-next-line quotes
      `!!! Please provide baseRef param. e.g. fromSha and toSha. e.g. baseRef=staging`,
    );
    process.exit(1);
  }
  return {
    format: args.format,
    baseRef: args.baseRef,
  };
}

function run() {
  const { format, baseRef } = getArgs();

  const diffFilesCoverage = getCoverageForDiffFiles(baseRef);

  printData(format, diffFilesCoverage);
}

run();
