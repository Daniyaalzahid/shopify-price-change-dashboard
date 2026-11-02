import mysql, {
  type Pool,
  type PoolConnection,
  type RowDataPacket,
  type ResultSetHeader,
} from "mysql2/promise";
let pool: Pool | undefined;
export function db() {
  if (!pool) {
    const { DB_HOST, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
    if (!DB_HOST || !DB_NAME || !DB_USER || DB_PASSWORD === undefined)
      throw new Error("DATABASE_NOT_CONFIGURED");
    pool = mysql.createPool({
      host: DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD,
      connectionLimit: 5,
      waitForConnections: true,
      queueLimit: 30,
      connectTimeout: 10000,
      timezone: "Z",
      multipleStatements: false,
      ssl:
        process.env.DB_SSL === "true"
          ? { rejectUnauthorized: true }
          : undefined,
    });
  }
  return pool;
}
export type Executor = Pool | PoolConnection;
export async function rows<T>(
  sql: string,
  params: (string | number | boolean | null)[] = [],
  connection: Executor = db(),
): Promise<T[]> {
  const [data] = await connection.execute<RowDataPacket[]>(sql, params);
  return data as T[];
}
export async function write(
  sql: string,
  params: (string | number | boolean | null)[] = [],
  connection: Executor = db(),
) {
  const [result] = await connection.execute<ResultSetHeader>(sql, params);
  return result;
}
export async function transaction<T>(fn: (c: PoolConnection) => Promise<T>) {
  const c = await db().getConnection();
  try {
    await c.beginTransaction();
    const result = await fn(c);
    await c.commit();
    return result;
  } catch (e) {
    await c.rollback();
    throw e;
  } finally {
    c.release();
  }
}
export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
