const AppError = require('../errors/app-generic-error.js');
const pool = require('./pool.js');

const tryCatchLogPromise = async (fn) => {
  try {
    await fn();
  } catch (e) {
    console.log(e);
  }
};

const queryDBCatchError = async (query) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(query);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    console.log('This error occurred while querying the DB!\n', error);
    if (error.code === '23505') {
      // So, it is an unique_violation error
      const message =
        error.detail.split('=')[1] ||
        'The given value is already exist while it must be unique!';
      throw new AppError(message, 409);
    }
    if (client) {
      await tryCatchLogPromise(async () => await client.query('ROLLBACK'));
    }
    throw new AppError('Oops, something went wrong! Try again later.', 500);
  } finally {
    if (client) await tryCatchLogPromise(() => client.release());
  }
};

/**
 * @param {string} table
 * @param {string | string[] | null} columns
 * @param {any | any[] | null} values
 */
async function createRow(table, columns, values) {
  const preparedCols = Array.isArray(columns) ? columns : [columns];
  const preparedValues = Array.isArray(values) ? values : [values];
  const params = preparedValues.map((_, i) => `$${i + 1}`);
  const query = {
    text: `
        INSERT INTO ${table} (${preparedCols.join(',')})
              VALUES (${params.join(',')})
        `,
    values: [...preparedValues],
  };
  return await queryDBCatchError(query);
}

/**
 * orderBy example: `'col' || 'col DESC' || ['col1', 'col2'] || ['col1 ASC', 'col2 DESC']`
 *
 * @param {string} table
 * @param {string | string[] | null} orderBy
 * @param {boolean?} desc
 */
async function readAllRows(table, orderBy) {
  let orderByStr;
  if (orderBy) {
    orderByStr = 'ORDER BY ';
    orderByStr += Array.isArray(orderBy) ? orderBy.join(', ') : orderBy;
  }
  const query = { text: `SELECT * FROM ${table} ${orderByStr || ''}` };
  return (await queryDBCatchError(query)).rows;
}

/**
 * @param {string} table
 * @param {string | string[] | null} clauseKey
 * @param {any | any[] | null} clauseValue
 * @param {number?} rowsLimit
 */
async function readAllRowsByWhereClause(
  table,
  clauseKey,
  clauseValue,
  rowsLimit
) {
  let values = [];
  let text = 'SELECT * FROM ' + table;
  if (clauseKey && clauseValue) {
    const clauseKeys = Array.isArray(clauseKey) ? [...clauseKey] : [clauseKey];
    values = Array.isArray(clauseValue) ? [...clauseValue] : [clauseValue];
    const parameterizedClauses = clauseKeys.map((k, i) => ` ${k} = $${i + 1}`);
    text += ` WHERE ${parameterizedClauses.join(' AND ')}`;
  }
  text += rowsLimit ? ` LIMIT ${rowsLimit}` : '';
  return (await queryDBCatchError({ text, values })).rows;
}

/**
 * @param {string | string[] | null} clauseKey
 * @param {any | any[] | null} clauseValue
 * @param {number?} rowsLimit
 */
async function readPosts(clauseKey, clauseValue, rowsLimit) {
  const table = 'users JOIN posts ON users.user_id = posts.user_id';
  const args = [table, clauseKey, clauseValue, rowsLimit];
  return await readAllRowsByWhereClause(...args);
}

/**
 * @param {string} table
 * @param {string | string[] | null} clauseKey
 * @param {any | any[] | null} clauseValue
 */
async function readRowByWhereClause(table, clauseKey, clauseValue) {
  return (await readAllRowsByWhereClause(table, clauseKey, clauseValue, 1))[0];
}

/**
 * @param {string} table
 * @param {string} clauseKey
 * @param {number | string} clauseValue
 * @param {string | string[]} columns
 * @param {string | string[]} values
 */
async function updateRowsByWhereClause(
  table,
  clauseKey,
  clauseValue,
  columns,
  values
) {
  let paramCount = 1;
  const columnParamStrPairs = [];
  if (Array.isArray(columns)) {
    columns.forEach((c) => {
      columnParamStrPairs.push(`${c} = $${paramCount++}`);
    });
  } else {
    columnParamStrPairs.push(`${columns} = $${paramCount++}`);
  }
  const query = {
    text: `
         UPDATE ${table}
            SET ${columnParamStrPairs.join(', ')}
          WHERE ${clauseKey} = $${paramCount}
      `,
    values: Array.isArray(values)
      ? values.concat(clauseValue)
      : [values, clauseValue],
  };
  return await queryDBCatchError(query);
}

/**
 * @param {string} table
 * @param {string} clauseKey
 * @param {number | string} clauseValue
 */
async function deleteRowsByWhereClause(table, clauseKey, clauseValue) {
  const query = {
    text: `DELETE FROM ${table} WHERE ${clauseKey} = $1`,
    values: [clauseValue],
  };
  return await queryDBCatchError(query);
}

module.exports = {
  readPosts,
  createRow,
  readAllRows,
  readRowByWhereClause,
  readAllRowsByWhereClause,
  updateRowsByWhereClause,
  deleteRowsByWhereClause,
};
