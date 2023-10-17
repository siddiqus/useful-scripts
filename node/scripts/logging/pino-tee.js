#!/usr/bin/env node

/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */

const path = require('path');
const { levels } = require('pino');
const tee = require('pino-tee');
const fs = require('fs');

const configs = require('../../logger-config').default;

const stream = tee(process.stdin);

const logsPath = path.resolve(__dirname, '../logs');

if (!fs.existsSync(logsPath)) {
  fs.mkdirSync(logsPath);
}

for (const [levelName, logFilename] of Object.entries(configs)) {
  const level = levels.values[levelName] || 30;
  stream.tee(
    fs.createWriteStream(path.join(logsPath, logFilename)),
    (line) => line.level === Number(level)
  );
}

stream.pipe(process.stdout);
