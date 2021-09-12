import sequelize, { QueryOptions } from 'sequelize';

// assuming sequelize is initialized

export const sequelizeSelect = async (sqlQuery: string, queryOptions?: QueryOptions): Promise<any[]> => {
  const opts = queryOptions || {};
  return await sequelize.query(sqlQuery, {
    ...opts,
    type: QueryTypes.SELECT
  });
};

async function fetchFromDbWithPaginated<T extends Record<string, any>>(opts: {
  identifier: string;
  limit?: number
  lastId?: number
  sleepInMs?: number
  results?: T[]
  getSqlStr: (lastId: number) => string
}): Promise<T[]> {
  const { identifier, getSqlStr, limit = 500, lastId = 0, sleepInMs = 0, results = [] } = opts
  const sqlStr = `${getSqlStr(lastId)} limit ${limit}`;

  const queryResults: T[] = await sequelizeSelect(sqlStr)

  if (lastId === 0) {
    console.log(new Date(), `fetched first ${limit}...`)
  } else {
    console.log(new Date(), `last ID: ${lastId}`, `fetched next ${limit}...`)
  }

  results.push(...queryResults);
  if (queryResults.length < limit) {
    return results;
  }

  if (sleepInMs) {
    await sleep(sleepInMs)
  }

  const newLastId = queryResults[queryResults.length - 1][identifier]

  return await fetchFromDbWithPaginated<T>({
    getSqlStr,
    identifier,
    lastId: newLastId,
    limit,
    results,
    sleepInMs
  })
}
