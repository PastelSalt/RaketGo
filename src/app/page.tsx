import { getDatabaseDialect, queryRows } from "@/lib/db";

declare const process: {
  env: Record<string, string | undefined>;
};

type TableCheck = {
  table: string;
  ok: boolean;
  count: number | null;
  error: string | null;
};

const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const MYSQL_PROTOCOLS = new Set(["mysql:", "mariadb:"]);
const SECRET_ENV_PATTERN = /(SECRET|PASSWORD|PASS|TOKEN|KEY)/i;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
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

function maskSecret(value: string): string {
  if (!value) {
    return "";
  }

  if (value.length <= 8) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function maskDatabaseUrl(value: string): string {
  try {
    const parsed = new URL(value);

    if (parsed.username) {
      parsed.username = maskSecret(decodeURIComponent(parsed.username));
    }

    if (parsed.password) {
      parsed.password = "********";
    }

    return parsed.toString();
  } catch {
    return value;
  }
}

function maskEnvValue(name: string, value: string | undefined): string {
  if (!value) {
    return "(not set)";
  }

  if (name.endsWith("_URL")) {
    return maskDatabaseUrl(value);
  }

  if (SECRET_ENV_PATTERN.test(name)) {
    return maskSecret(value);
  }

  return value;
}

function parseConnectionUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, "")) || "(empty)";

    return {
      protocol: parsed.protocol.replace(":", ""),
      host: parsed.hostname || "(empty)",
      port: parsed.port || "(default)",
      username: parsed.username ? decodeURIComponent(parsed.username) : "(none)",
      hasPassword: Boolean(parsed.password),
      databaseName,
      sslMode: parsed.searchParams.get("sslmode") ?? "(none)",
      rawMasked: maskDatabaseUrl(value)
    };
  } catch {
    return null;
  }
}

function resolvePostgresConnectionString(): string | undefined {
  return (
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    (isPostgresUrl(process.env.DATABASE_URL) ? process.env.DATABASE_URL : undefined)
  );
}

function resolveMysqlConnectionString(): string | undefined {
  return [process.env.RAKETGO_DATABASE_URL, process.env.MYSQL_URL, process.env.DATABASE_URL].find((value) =>
    isMysqlUrl(value)
  );
}

export default async function HomePage() {
  const generatedAt = new Date().toISOString();
  const dialect = getDatabaseDialect();

  const envNames = [
    "NODE_ENV",
    "SESSION_SECRET",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_HOST",
    "POSTGRES_PORT",
    "POSTGRES_DATABASE",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_SSL",
    "POSTGRES_SSL_REJECT_UNAUTHORIZED",
    "DATABASE_URL",
    "RAKETGO_DATABASE_URL",
    "MYSQL_URL",
    "RAKETGO_DB_HOST",
    "RAKETGO_DB_PORT",
    "RAKETGO_DB_NAME",
    "RAKETGO_DB_USER",
    "RAKETGO_DB_PASS",
    "RAKETGO_DB_SSL",
    "RAKETGO_DB_SSL_REJECT_UNAUTHORIZED",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_JWT_SECRET"
  ] as const;

  const envSnapshot = envNames.map((name) => {
    const value = process.env[name];

    return {
      name,
      isSet: Boolean(value),
      displayValue: maskEnvValue(name, value)
    };
  });

  const postgresConnection = resolvePostgresConnectionString();
  const mysqlConnection = resolveMysqlConnectionString();
  const activeConnection = dialect === "postgres" ? postgresConnection : mysqlConnection;
  const activeConnectionDetails = parseConnectionUrl(activeConnection);

  let connectionOk = false;
  let connectionError: string | null = null;
  let connectionErrorStack: string | null = null;
  let latencyMs: number | null = null;
  let databaseTime: string | null = null;
  let serverVersion: string | null = null;
  let databaseName: string | null = null;
  let databaseUser: string | null = null;

  const connectStart = Date.now();

  try {
    const nowRows = await queryRows<{ now: string }>("SELECT NOW() AS now");
    const versionRows = await queryRows<{ version: string }>("SELECT version() AS version");

    connectionOk = true;
    latencyMs = Date.now() - connectStart;
    databaseTime = String(nowRows[0]?.now ?? "");
    serverVersion = String(versionRows[0]?.version ?? "");

    if (dialect === "postgres") {
      const identityRows = await queryRows<
        Array<{ database_name: string | null; db_user: string | null }>
      >("SELECT current_database() AS database_name, current_user AS db_user");
      databaseName = identityRows[0]?.database_name ?? null;
      databaseUser = identityRows[0]?.db_user ?? null;
    } else {
      const identityRows = await queryRows<
        Array<{ database_name: string | null; db_user: string | null }>
      >("SELECT DATABASE() AS database_name, CURRENT_USER() AS db_user");
      databaseName = identityRows[0]?.database_name ?? null;
      databaseUser = identityRows[0]?.db_user ?? null;
    }
  } catch (error) {
    connectionError = getErrorMessage(error);
    connectionErrorStack = error instanceof Error ? error.stack ?? null : null;
  }

  const tableNames = [
    "users",
    "job_posts",
    "skill_posts",
    "job_applications",
    "messages",
    "notifications",
    "auth_rate_limits",
    "user_interactions"
  ];

  let tableChecks: TableCheck[] = [];

  if (connectionOk) {
    tableChecks = await Promise.all(
      tableNames.map(async (table) => {
        try {
          const rows = await queryRows<Array<{ total: number }>>(
            `SELECT COUNT(*) AS total FROM ${table}`
          );

          return {
            table,
            ok: true,
            count: Number(rows[0]?.total ?? 0),
            error: null
          } as TableCheck;
        } catch (error) {
          return {
            table,
            ok: false,
            count: null,
            error: getErrorMessage(error)
          } as TableCheck;
        }
      })
    );
  } else {
    tableChecks = tableNames.map((table) => ({
      table,
      ok: false,
      count: null,
      error: "Skipped because primary connection check failed."
    }));
  }

  const healthyTableCount = tableChecks.filter((item) => item.ok).length;

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <section className="card">
        <h1 className="page-title" style={{ marginBottom: "0.4rem" }}>
          Database Diagnostics Dashboard
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          Homepage UI is temporarily replaced with live database diagnostics.
        </p>
        <p className="muted" style={{ marginTop: "0.5rem" }}>
          Generated at: {generatedAt}
        </p>
      </section>

      <section className="grid grid-2">
        <article className="card">
          <h2>Connection Summary</h2>
          <p>
            <strong>Dialect selected:</strong> {dialect}
          </p>
          <p>
            <strong>Status:</strong> {connectionOk ? "CONNECTED" : "FAILED"}
          </p>
          <p>
            <strong>Latency:</strong> {latencyMs ?? "n/a"} ms
          </p>
          <p>
            <strong>Database time:</strong> {databaseTime ?? "n/a"}
          </p>
          <p>
            <strong>Server version:</strong> {serverVersion ?? "n/a"}
          </p>
          <p>
            <strong>Database name:</strong> {databaseName ?? "n/a"}
          </p>
          <p>
            <strong>Database user:</strong> {databaseUser ?? "n/a"}
          </p>
          <p>
            <strong>Healthy tables:</strong> {healthyTableCount}/{tableChecks.length}
          </p>
          {connectionError ? (
            <p style={{ color: "#a33" }}>
              <strong>Connection error:</strong> {connectionError}
            </p>
          ) : null}
        </article>

        <article className="card">
          <h2>Resolved Connection</h2>
          <p>
            <strong>Resolved Postgres URL:</strong>
          </p>
          <p style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
            {postgresConnection ? maskDatabaseUrl(postgresConnection) : "(none)"}
          </p>
          <p>
            <strong>Resolved MySQL URL:</strong>
          </p>
          <p style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
            {mysqlConnection ? maskDatabaseUrl(mysqlConnection) : "(none)"}
          </p>
          <p>
            <strong>Active URL used by dialect:</strong>
          </p>
          <p style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
            {activeConnection ? maskDatabaseUrl(activeConnection) : "(none)"}
          </p>

          {activeConnectionDetails ? (
            <div className="grid" style={{ gap: "0.3rem", marginTop: "0.5rem" }}>
              <p style={{ margin: 0 }}>
                <strong>Protocol:</strong> {activeConnectionDetails.protocol}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Host:</strong> {activeConnectionDetails.host}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Port:</strong> {activeConnectionDetails.port}
              </p>
              <p style={{ margin: 0 }}>
                <strong>User:</strong> {activeConnectionDetails.username}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Password set:</strong> {activeConnectionDetails.hasPassword ? "yes" : "no"}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Database:</strong> {activeConnectionDetails.databaseName}
              </p>
              <p style={{ margin: 0 }}>
                <strong>sslmode:</strong> {activeConnectionDetails.sslMode}
              </p>
            </div>
          ) : null}
        </article>
      </section>

      <section className="card">
        <h2>Environment Variables (masked)</h2>
        <p className="muted">All key/password/secret values are partially redacted for safety.</p>
        <div className="grid" style={{ gap: "0.4rem" }}>
          {envSnapshot.map((entry) => (
            <div
              key={entry.name}
              style={{
                display: "grid",
                gridTemplateColumns: "340px 90px 1fr",
                gap: "0.6rem",
                alignItems: "start"
              }}
            >
              <span style={{ fontFamily: "monospace" }}>{entry.name}</span>
              <span className="muted">{entry.isSet ? "set" : "missing"}</span>
              <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                {entry.displayValue}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Table Reachability And Row Counts</h2>
        <div className="grid" style={{ gap: "0.5rem" }}>
          {tableChecks.map((item) => (
            <div key={item.table} className="card" style={{ boxShadow: "none", padding: "0.75rem" }}>
              <p style={{ margin: 0, fontFamily: "monospace" }}>
                {item.table}
              </p>
              {item.ok ? (
                <p style={{ margin: "0.35rem 0 0", color: "#157347" }}>
                  OK - row count: {item.count}
                </p>
              ) : (
                <p style={{ margin: "0.35rem 0 0", color: "#a33" }}>
                  ERROR - {item.error}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {connectionErrorStack ? (
        <section className="card">
          <h2>Connection Error Stack</h2>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: "0.8rem" }}>{connectionErrorStack}</pre>
        </section>
      ) : null}
    </div>
  );
}
