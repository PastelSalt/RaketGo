import mysql, { type ResultSetHeader } from "mysql2/promise";

const globalForDb = globalThis as unknown as {
  pool?: ReturnType<typeof mysql.createPool>;
};

const pool =
  globalForDb.pool ??
  mysql.createPool({
    host: process.env.RAKETGO_DB_HOST ?? "localhost",
    port: Number(process.env.RAKETGO_DB_PORT ?? 3306),
    user: process.env.RAKETGO_DB_USER ?? "root",
    password: process.env.RAKETGO_DB_PASS ?? "",
    database: process.env.RAKETGO_DB_NAME ?? "raketgo",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: false
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export { pool };

export async function queryRows<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T extends any[] ? T : T[]> {
  const [rows] = await pool.query(sql, params as any[]);
  return rows as T extends any[] ? T : T[];
}

export async function execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params as any[]);
  return result;
}
