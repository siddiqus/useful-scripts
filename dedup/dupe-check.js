const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const coveragePathIgnorePatterns =
  require('../jest.config').coveragePathIgnorePatterns || [];

function getArgs() {
  const args = process.argv.slice(2).reduce((a, s) => {
    const [key, val] = s.split('=');
    a[key] = val;
    return a;
  }, {});

  if (!args.baseRef) {
    console.error(
      // eslint-disable-next-line quotes
      `!!! Please provide baseRef param. e.g. baseRef=staging`,
    );
    process.exit(1);
  }
  return {
    baseRef: args.baseRef,
  };
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

function getCurrentCommitHash() {
  const command = 'git rev-parse HEAD';
  const branch = execSync(command);
  return branch.toString().trim();
}

function getDiffList(baseRef) {
  const currentCommitHash = getCurrentCommitHash();

  const command = `git diff --name-only origin/${baseRef} ${currentCommitHash}`;
  let diffs = execSync(command).toString();

  let diffList = diffs
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  diffList = diffList
    .filter(
      (s) =>
        s.startsWith('src/') &&
        (s.includes('.ts') || s.includes('.js')) &&
        !s.includes('.e2e') &&
        !s.includes('.config.'),
    )
    .map((s) => {
      if (s.includes('.spec.') || s.includes('.test.')) {
        return s.replace(/\.(spec|test)/, ''); // this is to ensure we catch files that have change in test files but not in the main file
      }
      return s;
    });

  diffList = filterIgnored(diffList);

  diffList = [...new Set(diffList)];

  return diffList;
}

function run() {
  const { baseRef } = getArgs();

  const diffList = getDiffList(baseRef);

  if (!diffList.length) {
    return;
  }

  const pattern = diffList.join(',');

  const command = `yarn jscpd -s --pattern "{${pattern}}"`;

  execSync(command, {
    cwd: path.resolve(__dirname, '..'),
  }).toString();

  const markDownPath = path.resolve(
    __dirname,
    '..',
    'reports',
    'jscpd-report.md',
  );
  const markDown = fs
    .readFileSync(markDownPath)
    .toString()
    .split('\n')
    .slice(3)
    .join('\n');
  fs.writeFileSync(markDownPath, markDown);
}

run();
