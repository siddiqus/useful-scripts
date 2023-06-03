const childProcess = require('child_process');

function getDiff() {
  const names = childProcess
    .execSync('git diff --name-only HEAD~2 HEAD')
    .toString()
    .split('\n')
    .filter((s) => s.includes('src/'));
  return names;
}

async function run() {
  const diffModules = Array.from(
    new Set(getDiff().map((d) => d.split('src/').pop().split('/')[0])),
  );
  const regexString = diffModules
    .map((d) => {
      return `src\\/${d}`;
    })
    .join('\\|');

  if (!diffModules.length) {
    console.log('Skipping tests, no modules changed since last commit');
    return;
  }

  return new Promise((resolve, reject) => {
    console.log('Running tests in changed modules:', diffModules);

    const test = childProcess.spawn('yarn', ['test', regexString], {
      stdio: 'inherit',
    });

    test.on('close', (code) => {
      if (code !== 0) {
        reject(`test process exited with code ${code}`);
      } else {
        resolve();
      }
    });
  });
}

run()
  .then(() => {
    console.log('done');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
