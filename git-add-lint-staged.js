const childProcess = require('child_process');

const gitChanges = childProcess.execSync('git status').toString();
const gitChangesLines = gitChanges.split('\n');
const indexOfCommited = gitChangesLines.indexOf('Changes to be committed:');
const indexOfStages = gitChangesLines.indexOf('Changes not staged for commit:');

for (let lineIndex = indexOfCommited; lineIndex < indexOfStages; lineIndex++) {
  const line = gitChangesLines[lineIndex];

  if (/deleted|modified|new file/.test(line)) {
    const fileName = line.split(' ').pop().trim();
    childProcess.execSync(`git add ${fileName}`);
  }
}
