// assumes you are using NestJS, eslint, and have lodash installed
// example: npx ts-node nestjs-new-sequelize-entity.ts module=user entity=user dialect=mysql

import childProcess from 'child_process';
import fs from 'fs';
import { camelCase, capitalize, snakeCase } from 'lodash';
import path from 'path';

function _getModelFileContent(modelName: string, tableName: string) {
  return `import { Column, Model, Table } from 'sequelize-typescript';
import { DataTypes } from 'sequelize/types';

@Table({
  tableName: '${tableName}',
  underscored: true,
})
export class ${modelName} extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    type: DataTypes.INTEGER,
  })
  id: number;
}
`;
}

function _writeModelFile({ modelPath, modelName, tableName }) {
  if (!fs.existsSync(modelPath)) {
    fs.mkdirSync(modelPath, {
      recursive: true,
    });
  }
  fs.writeFileSync(
    path.join(modelPath, `${tableName.replace(/_/g, '-')}.entity.ts`),
    _getModelFileContent(modelName, tableName),
  );
}

function _updateModuleTs({ modulePath, moduleName, modelName }) {
  const moduleTsFilepath = path.resolve(modulePath, `${moduleName}.module.ts`);

  childProcess.execSync(`yarn lint ${moduleTsFilepath.toString()}`);

  const moduleTsContents = fs.readFileSync(moduleTsFilepath).toString();

  const lines = moduleTsContents.split('\n');

  const sequelizeModuleImportIndex = lines.findIndex((line) =>
    line.includes('SequelizeModule.forFeature(['),
  );

  // import the new module
  let endImportLineIndex = 0;
  while (lines[endImportLineIndex].trim() !== '') {
    if (lines[endImportLineIndex].startsWith('import ')) {
      endImportLineIndex++;
    }
  }

  if (sequelizeModuleImportIndex > 0) {
    lines[sequelizeModuleImportIndex] = lines[
      sequelizeModuleImportIndex
    ].replace(
      'SequelizeModule.forFeature([',
      `SequelizeModule.forFeature([${modelName},`,
    );
  } else {
    // logic to import SequelizeModule
    // eslint-disable-next-line quotes
    const sequelizeModuleImportLine = `import { SequelizeModule } from '@nestjs/sequelize';`;
    lines.splice(endImportLineIndex, 0, sequelizeModuleImportLine);
    endImportLineIndex += 1;

    // logic to insert SequelizeModule.forFeature([])
    const importIndex = lines.findIndex((line) => line.includes('imports: ['));

    const modelImportLine = `SequelizeModule.forFeature([${modelName}])`;

    if (importIndex > 0) {
      lines[importIndex] = lines[importIndex].replace(
        'imports: [',
        `imports: [${modelImportLine},`,
      );
    } else {
      // inject including imports
      const moduleDeclarationIndex = lines.findIndex((line) =>
        line.startsWith('@Module({'),
      );
      const fullImportsLine = `imports: [${modelImportLine}],`;
      lines.splice(moduleDeclarationIndex + 1, 0, fullImportsLine);
    }
  }

  const newImportLine = `import { ${modelName} } from './entities/${modelName}.entity';`;
  lines.splice(endImportLineIndex, 0, newImportLine);

  const newFile = lines.join('\n');
  fs.writeFileSync(moduleTsFilepath, newFile);

  childProcess.execSync(`yarn lint ${moduleTsFilepath.toString()}`);
}

function run() {
  console.log('🏃🏃🏃 Scaffolding Sequelize model for NestJS 🏃🏃🏃');
  const args = process.argv.slice(2).reduce((a, s) => {
    const [key, val] = s.split('=');
    a[key] = val;
    return a;
  }, {} as any);

  const helpText = `ℹ️ Setup new model by running *** 
  > npx ts-node nestjs-new-sequelize-entity.ts module=user entity=user dialect=[mysql|postgres]`;

  const { module, entity: modelName } = args;
  if (!modelName) {
    console.error(`⚠️ Error: 'model' param is missing\n${helpText}`);
    process.exit(1);
  }

  if (!module) {
    console.error(`⚠️ Error: 'module' param is missing\n${helpText}`);
    process.exit(1);
  }

  const modulePath = path.resolve('src', module);
  const moduleExists = fs.existsSync(modulePath);

  if (!moduleExists) {
    console.error(
      `⚠️ Error: module '${module}' does not exist in NestJS project`,
    );
    process.exit(1);
  }

  const dialect: 'mysql' | 'postgres' = args.dialect; // for this repo, making postgres the default

  if (!dialect) {
    console.error(`⚠️ Error: dialect param is missing\n${helpText}`);
    process.exit(1);
  }

  const tableName = snakeCase(modelName).toLowerCase();

  const normalizedModelName = capitalize(camelCase(modelName));

  console.log('----> 📁 Generating model file');
  const modelPath = path.resolve(modulePath, 'entities');
  _writeModelFile({ modelPath, tableName, modelName: normalizedModelName });

  console.log('----> 📁 Updating module');
  _updateModuleTs({
    modulePath,
    moduleName: module,
    modelName: normalizedModelName,
  });

  console.log('----> 📁 Linting');
  childProcess.execSync('yarn lint');

  console.log('----> 🎉 Done!');
}

run();
