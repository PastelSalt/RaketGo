import mysql, { type PoolOptions as MySqlPoolOptions, type ResultSetHeader } from "mysql2/promise";
import { Pool as PgPool, type PoolConfig as PgPoolConfig } from "pg";

type MySqlPool = ReturnType<typeof mysql.createPool>;
type DbDialect = "mysql" | "postgres";
export type ExecuteResult = Pick<ResultSetHeader, "affectedRows" | "insertId">;

const globalForDb = globalThis as unknown as {
  mysqlPool?: MySqlPool;
  pgPool?: PgPool;
};

const ENABLED_ENV_VALUES = new Set(["1", "true", "yes", "on", "required"]);
const DISABLED_ENV_VALUES = new Set(["0", "false", "no", "off"]);
const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const MYSQL_PROTOCOLS = new Set(["mysql:", "mariadb:"]);

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

function isPostgresUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    return POSTGRES_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isMysqlUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    return MYSQL_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

function getPostgresConnectionString(): string | undefined {
  return (
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    (isPostgresUrl(process.env.DATABASE_URL) ? process.env.DATABASE_URL : undefined)
  );
}

function resolveDbDialect(): DbDialect {
  if (getPostgresConnectionString() || process.env.POSTGRES_HOST) {
    return "postgres";
  }

  return "mysql";
}

function resolveMysqlSsl(): MySqlPoolOptions["ssl"] {
  if (!isEnabled(process.env.RAKETGO_DB_SSL)) {
    return undefined;
  }

  const rejectUnauthorized = !isDisabled(process.env.RAKETGO_DB_SSL_REJECT_UNAUTHORIZED);
  return { rejectUnauthorized };
}

function resolveMysqlPoolConfig(): MySqlPoolOptions {
  const baseConfig: MySqlPoolOptions = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: false,
    enableKeepAlive: true,
    ssl: resolveMysqlSsl()
  };

  const mysqlUrlCandidates = [
    process.env.RAKETGO_DATABASE_URL,
    process.env.MYSQL_URL,
    process.env.DATABASE_URL
  ];

  const databaseUrl = mysqlUrlCandidates.find((value) => isMysqlUrl(value));
  const hasUnsupportedDatabaseUrl = mysqlUrlCandidates.some(
    (value) => Boolean(value) && !isMysqlUrl(value) && !isPostgresUrl(value)
  );

  if (hasUnsupportedDatabaseUrl) {
    console.error(
      "DATABASE_URL must use postgres://, postgresql://, mysql://, or mariadb://. Falling back to RAKETGO_DB_* variables."
    );
  }

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
      console.error(
        "Invalid MySQL database URL. Check RAKETGO_DATABASE_URL, MYSQL_URL, or DATABASE_URL."
      );
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

function resolvePostgresPoolConfig(): PgPoolConfig {
  const connectionString = getPostgresConnectionString();
  const maxConnections = toNumberOrDefault(process.env.POSTGRES_MAX_CONNECTIONS, 10);
  const rejectUnauthorized = !isDisabled(
    process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED ?? process.env.RAKETGO_DB_SSL_REJECT_UNAUTHORIZED
  );
  const sslExplicitlyDisabled = isDisabled(process.env.POSTGRES_SSL);
  const sslExplicitlyEnabled =
    isEnabled(process.env.POSTGRES_SSL) || isEnabled(process.env.RAKETGO_DB_SSL);

  const sslRequiredFromUrl = (() => {
    if (!connectionString) {
      return false;
    }

    try {
      const parsed = new URL(connectionString);
      return parsed.searchParams.get("sslmode") === "require";
    } catch {
      return false;
    }
  })();

  // Hosted Postgres providers (including Supabase) generally require SSL.
  // Default to SSL unless explicitly disabled.
  const sslEnabled =
    !sslExplicitlyDisabled &&
    (sslRequiredFromUrl || sslExplicitlyEnabled || Boolean(connectionString) || Boolean(process.env.POSTGRES_HOST));

  if (connectionString) {
    return {
      connectionString,
      max: maxConnections,
      ssl: sslEnabled ? { rejectUnauthorized } : undefined
    };
  }

  return {
    host: process.env.POSTGRES_HOST ?? "localhost",
    port: toNumberOrDefault(process.env.POSTGRES_PORT, 5432),
    user: process.env.POSTGRES_USER ?? "postgres",
    password: process.env.POSTGRES_PASSWORD ?? "",
    database: process.env.POSTGRES_DATABASE ?? "postgres",
    max: maxConnections,
    ssl: sslEnabled ? { rejectUnauthorized } : undefined
  };
}

function convertQuestionParamsToPostgres(
  sql: string,
  params: unknown[]
): { text: string; values: unknown[] } {
  if (!params.length || !sql.includes("?")) {
    return { text: sql, values: params };
  }

  let index = 0;
  let inSingleQuote = false;
  let converted = "";

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];

    if (char === "'") {
      if (inSingleQuote && sql[i + 1] === "'") {
        converted += "''";
        i += 1;
        continue;
      }

      inSingleQuote = !inSingleQuote;
      converted += char;
      continue;
    }

    if (!inSingleQuote && char === "?") {
      index += 1;
      converted += `$${index}`;
      continue;
    }

    converted += char;
  }

  return { text: converted, values: params };
}

function getMySqlPool(): MySqlPool {
  if (!mysqlPool) {
    throw new Error("MySQL pool is not initialized.");
  }

  return mysqlPool;
}

function getPostgresPool(): PgPool {
  if (!pgPool) {
    throw new Error(
      "Postgres pool is not initialized. Set POSTGRES_URL or POSTGRES_PRISMA_URL for Supabase connection."
    );
  }

  return pgPool;
}

function isInsertStatement(sql: string): boolean {
  return /^\s*insert\b/i.test(sql);
}

function hasReturningClause(sql: string): boolean {
  return /\breturning\b/i.test(sql);
}

const dbDialect = resolveDbDialect();

const mysqlPool =
  dbDialect === "mysql"
    ? globalForDb.mysqlPool ?? mysql.createPool(resolveMysqlPoolConfig())
    : undefined;

const pgPool =
  dbDialect === "postgres"
    ? globalForDb.pgPool ?? new PgPool(resolvePostgresPoolConfig())
    : undefined;

if (process.env.NODE_ENV !== "production") {
  if (mysqlPool) {
    globalForDb.mysqlPool = mysqlPool;
  }
  if (pgPool) {
    globalForDb.pgPool = pgPool;
  }
}

export const pool = (mysqlPool ?? pgPool) as MySqlPool | PgPool;

export function getDatabaseDialect(): DbDialect {
  return dbDialect;
}

export async function queryRows<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T extends any[] ? T : T[]> {
  if (dbDialect === "postgres") {
    const { text, values } = convertQuestionParamsToPostgres(sql, params);
    const result = await getPostgresPool().query(text, values as any[]);
    return result.rows as T extends any[] ? T : T[];
  }

  const [rows] = await getMySqlPool().query(sql, params as any[]);
  return rows as T extends any[] ? T : T[];
}

export async function execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
  if (dbDialect === "postgres") {
    const { text, values } = convertQuestionParamsToPostgres(sql, params);

    if (isInsertStatement(text) && !hasReturningClause(text)) {
      const client = await getPostgresPool().connect();
      try {
        const result = await client.query(text, values as any[]);
        let insertId = 0;

        try {
          const lastValueResult = await client.query<{ id: number | string }>(
            "SELECT LASTVAL()::bigint AS id"
          );
          insertId = Number(lastValueResult.rows[0]?.id ?? 0);
        } catch {
          insertId = 0;
        }

        return {
          affectedRows: result.rowCount ?? 0,
          insertId
        };
      } finally {
        client.release();
      }
    }

    const result = await getPostgresPool().query(text, values as any[]);
    const firstRow = (result.rows[0] ?? {}) as Record<string, unknown>;
    const insertIdCandidate =
      firstRow.insertId ?? firstRow.insert_id ?? firstRow.id ?? Object.values(firstRow)[0];
    const insertId = Number.isFinite(Number(insertIdCandidate)) ? Number(insertIdCandidate) : 0;

    return {
      affectedRows: result.rowCount ?? 0,
      insertId
    };
  }

  const [result] = await getMySqlPool().execute<ResultSetHeader>(sql, params as any[]);
  return {
    affectedRows: result.affectedRows,
    insertId: result.insertId
  };
}
