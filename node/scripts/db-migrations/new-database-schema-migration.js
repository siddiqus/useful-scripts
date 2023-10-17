#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const prompts = require('prompts');

const migrationsDir = path.resolve('schema-migrations');

if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir);
}

async function generateNewSchemaMigrationFiles() {
  const version = Date.now();

  const args = process.argv.slice(2).reduce((a, s) => {
    const [key, val] = s.split('=');
    a[key] = val;
    return a;
  }, {});

  const { newTable } = args;

  let inputTitle;
  if (newTable) {
    inputTitle = `create table ${newTable}`;
  } else {
    const input = await prompts([
      {
        type: 'text',
        name: 'title',
        message: 'What is the purpose of this schema migration:\n',
      },
    ]);
    inputTitle = input.title;
  }

  const types = ['do', 'undo'];

  const title = inputTitle.replace(/[^\w\d-_]/g, '-');

  types.forEach((type) => {
    const filepath = path.join(
      migrationsDir,
      `${version}.${type}.${title}.sql`,
    );
    fs.writeFileSync(filepath, '');
    console.log(`${type.toUpperCase().padStart(4, ' ')}: ${filepath}`);
  });
}

generateNewSchemaMigrationFiles()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
