import mysql, { type PoolOptions, type ResultSetHeader } from "mysql2/promise";

const globalForDb = globalThis as unknown as {
  pool?: ReturnType<typeof mysql.createPool>;
};

const ENABLED_ENV_VALUES = new Set(["1", "true", "yes", "on", "required"]);
const DISABLED_ENV_VALUES = new Set(["0", "false", "no", "off"]);

function toNumberOrDefault(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isEnabled(value: string | undefined): boolean {
  return ENABLED_ENV_VALUES.has((value ?? "").trim().toLowerCase());
}

function isDisabled(value: string | undefined): boolean {
  return DISABLED_ENV_VALUES.has((value ?? "").trim().toLowerCase());
}

function resolveSsl(): PoolOptions["ssl"] {
  if (!isEnabled(process.env.RAKETGO_DB_SSL)) {
    return undefined;
  }

  const rejectUnauthorized = !isDisabled(process.env.RAKETGO_DB_SSL_REJECT_UNAUTHORIZED);
  return { rejectUnauthorized };
}

function resolvePoolConfig(): PoolOptions {
  const baseConfig: PoolOptions = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: false,
    enableKeepAlive: true,
    ssl: resolveSsl()
  };

  const databaseUrl =
    process.env.RAKETGO_DATABASE_URL ?? process.env.DATABASE_URL ?? process.env.MYSQL_URL;

  if (databaseUrl) {
    try {
      const parsed = new URL(databaseUrl);
      return {
        ...baseConfig,
        host: parsed.hostname,
        port: toNumberOrDefault(parsed.port || undefined, 3306),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: decodeURIComponent(parsed.pathname.replace(/^\//, ""))
      };
    } catch {
      console.error("Invalid database URL. Check RAKETGO_DATABASE_URL or DATABASE_URL.");
    }
  }

  return {
    ...baseConfig,
    host: process.env.RAKETGO_DB_HOST ?? "localhost",
    port: toNumberOrDefault(process.env.RAKETGO_DB_PORT, 3306),
    user: process.env.RAKETGO_DB_USER ?? "root",
    password: process.env.RAKETGO_DB_PASS ?? "",
    database: process.env.RAKETGO_DB_NAME ?? "raketgo"
  };
}

const pool =
  globalForDb.pool ??
  mysql.createPool(resolvePoolConfig());

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
