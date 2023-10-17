/* eslint-disable @typescript-eslint/no-unused-vars */
import childProcess from 'child_process';
import fs from 'fs';
import { snakeCase } from 'lodash';
import path from 'path';

const MIGRATION_PATH = 'schema-migrations';

function _getModelFileContent(modelName: string, tableName: string) {
  return `import { Column, Model, Table } from 'sequelize-typescript';
import { DataTypes } from 'sequelize';

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

function _getCreateTableMigrationForMysql(tableName: string) {
  return `CREATE TABLE IF NOT EXISTS \`${tableName}\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`)
);`;
}

function _getCreateTableMigrationForPostgres(tableName: string) {
  return `begin;

CREATE TABLE IF NOT EXISTS "${tableName}" (
  id SERIAL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

DROP TRIGGER IF EXISTS ${tableName}_update_timestamp
  ON ${tableName};

CREATE TRIGGER ${tableName}_update_timestamp BEFORE INSERT OR UPDATE ON ${tableName}
  FOR EACH ROW EXECUTE FUNCTION custom_on_update_timestamp_trigger();

commit;
`;
}

function _updateMigrations(tableName: string, dialect: 'mysql' | 'postgres') {
  const dirs = fs.readdirSync(MIGRATION_PATH);

  const migrationName = `create-table-${tableName}`;
  const doMigrationFile = dirs.find((d) => d.includes(`do.${migrationName}`));
  const undoMigrationFile = dirs.find((d) =>
    d.includes(`undo.${migrationName}`),
  );

  if (!doMigrationFile || !undoMigrationFile) {
    throw new Error('Could not find migration files');
  }

  let newTableSql;
  let deleteTableSql;

  if (dialect === 'postgres') {
    newTableSql = _getCreateTableMigrationForPostgres(tableName);

    deleteTableSql = `DROP TABLE IF EXISTS "${tableName}";`;
  } else {
    newTableSql = _getCreateTableMigrationForMysql(tableName);

    deleteTableSql = `DROP TABLE IF EXISTS \`${tableName}\`;`;
  }

  fs.writeFileSync(path.join(MIGRATION_PATH, doMigrationFile), newTableSql);
  fs.writeFileSync(
    path.join(MIGRATION_PATH, undoMigrationFile),
    deleteTableSql,
  );
}

function _writeModelFile({
  modelPath,
  modelName,
  tableName,
}: {
  modelPath: string;
  modelName: string;
  tableName: string;
}) {
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

function _updateModuleTs({
  modulePath,
  moduleName,
  modelName,
  tableName,
}: {
  modulePath: string;
  moduleName: string;
  modelName: string;
  tableName: string;
}) {
  const moduleTsFilepath = path.resolve(modulePath, `${moduleName}.module.ts`);

  childProcess.execSync(`yarn lintFix ${moduleTsFilepath.toString()}`);

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
      let moduleDeclarationLine = lines[moduleDeclarationIndex];

      moduleDeclarationLine = moduleDeclarationLine.replace(
        '({',
        `({\n${fullImportsLine}\n`,
      );

      lines[moduleDeclarationIndex] = moduleDeclarationLine;
    }
  }

  const newImportLine = `import { ${modelName} } from './entities/${tableName.replace(
    /_/g,
    '-',
  )}.entity';`;
  lines.splice(endImportLineIndex, 0, newImportLine);

  const newFile = lines.join('\n');
  fs.writeFileSync(moduleTsFilepath, newFile);
}

function run() {
  console.log('🏃🏃🏃 Scaffolding db model 🏃🏃🏃');
  const args = process.argv.slice(2).reduce((a, s) => {
    const [key, val] = s.split('=');
    a[key] = val;
    return a;
  }, {} as any);

  const helpText = `ℹ️ Setup new model by running *** 
  > npm run mg:newscaff module=customer entity=CustomerSummary`;

  const { module, entity: modelName } = args;
  if (!modelName) {
    console.error(`⚠️ Error: 'entity' param is missing\n${helpText}`);
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

  const dialect: 'mysql' | 'postgres' = args.dialect || 'postgres'; // for this repo, making postgres the default

  if (!dialect) {
    console.error(`⚠️ Error: dialect param is missing\n${helpText}`);
    process.exit(1);
  }

  const tableName = snakeCase(modelName).toLowerCase();
  console.log(tableName);
  console.log('----> 📁 Generating migration files');
  childProcess.execSync(`yarn run mg:new newTable=${tableName}`);

  _updateMigrations(tableName, dialect);

  console.log('----> 📁 Generating model file');
  const modelPath = path.resolve(modulePath, 'entities');
  _writeModelFile({ modelPath, tableName, modelName });

  console.log('----> 📁 Updating module');
  _updateModuleTs({
    modulePath,
    moduleName: module,
    modelName,
    tableName,
  });

  console.log('----> 📁 Linting');
  childProcess.execSync('yarn lint');

  console.log('----> 🎉 Done!');
}

run();
