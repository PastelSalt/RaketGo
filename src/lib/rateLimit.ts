import { execute, queryRows } from "@/lib/db";
import { buildRateLimitKey } from "@/lib/utils";

type RateLimitRow = {
  attempts: number;
  window_started_at: string;
  locked_until: string | null;
};

let checkedTable = false;
let rateLimitTableExists = false;

async function hasRateLimitTable(): Promise<boolean> {
  if (checkedTable) {
    return rateLimitTableExists;
  }

  checkedTable = true;
  const rows = await queryRows<Array<{ table_exists: boolean | number }>>(
    "SELECT CASE WHEN COUNT(*) > 0 THEN TRUE ELSE FALSE END AS table_exists FROM information_schema.tables WHERE table_name = 'auth_rate_limits'"
  );
  rateLimitTableExists = Boolean(rows[0]?.table_exists);
  return rateLimitTableExists;
}

export async function isRateLimitExceeded(
  scope: string,
  identifier: string,
  ipAddress: string,
  maxAttempts = 6,
  windowSeconds = 900
): Promise<{ exceeded: boolean; retryAfterSeconds: number }> {
  if (!(await hasRateLimitTable())) {
    return { exceeded: false, retryAfterSeconds: 0 };
  }

  const key = buildRateLimitKey(scope, identifier, ipAddress);
  const rows = await queryRows<RateLimitRow[]>(
    "SELECT attempts, window_started_at, locked_until FROM auth_rate_limits WHERE throttle_key = ?",
    [key]
  );

  if (!rows[0]) {
    return { exceeded: false, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  const windowStarted = new Date(rows[0].window_started_at).getTime();
  const lockedUntil = rows[0].locked_until ? new Date(rows[0].locked_until).getTime() : 0;

  if (lockedUntil > now) {
    return {
      exceeded: true,
      retryAfterSeconds: Math.max(1, Math.ceil((lockedUntil - now) / 1000))
    };
  }

  if (windowStarted + windowSeconds * 1000 < now) {
    await execute(
      "UPDATE auth_rate_limits SET attempts = 0, window_started_at = NOW(), locked_until = NULL WHERE throttle_key = ?",
      [key]
    );
    return { exceeded: false, retryAfterSeconds: 0 };
  }

  return {
    exceeded: Number(rows[0].attempts) >= maxAttempts,
    retryAfterSeconds: 0
  };
}

export async function registerRateLimitFailure(
  scope: string,
  identifier: string,
  ipAddress: string,
  maxAttempts = 6,
  windowSeconds = 900,
  lockSeconds = 900
): Promise<void> {
  if (!(await hasRateLimitTable())) {
    return;
  }

  const key = buildRateLimitKey(scope, identifier, ipAddress);
  const rows = await queryRows<{ attempts: number; window_started_at: string }>(
    "SELECT attempts, window_started_at FROM auth_rate_limits WHERE throttle_key = ?",
    [key]
  );

  if (!rows[0]) {
    await execute(
      "INSERT INTO auth_rate_limits (throttle_key, scope, attempts, window_started_at, last_attempt_at, locked_until) VALUES (?, ?, 1, NOW(), NOW(), NULL)",
      [key, scope]
    );
    return;
  }

  const now = Date.now();
  const windowStarted = new Date(rows[0].window_started_at).getTime();
  const windowExpired = windowStarted + windowSeconds * 1000 < now;
  const attempts = windowExpired ? 1 : Number(rows[0].attempts) + 1;
  const shouldLock = attempts >= maxAttempts;
  const lockUntil = new Date(now + lockSeconds * 1000).toISOString();

  if (shouldLock) {
    if (windowExpired) {
      await execute(
        "UPDATE auth_rate_limits SET attempts = ?, window_started_at = NOW(), last_attempt_at = NOW(), locked_until = ? WHERE throttle_key = ?",
        [attempts, lockUntil, key]
      );
    } else {
      await execute(
        "UPDATE auth_rate_limits SET attempts = ?, last_attempt_at = NOW(), locked_until = ? WHERE throttle_key = ?",
        [attempts, lockUntil, key]
      );
    }

    return;
  }

  if (windowExpired) {
    await execute(
      "UPDATE auth_rate_limits SET attempts = ?, window_started_at = NOW(), last_attempt_at = NOW(), locked_until = NULL WHERE throttle_key = ?",
      [attempts, key]
    );
    return;
  }

  await execute(
    "UPDATE auth_rate_limits SET attempts = ?, last_attempt_at = NOW(), locked_until = NULL WHERE throttle_key = ?",
    [attempts, key]
  );
}

export async function clearRateLimit(scope: string, identifier: string, ipAddress: string): Promise<void> {
  if (!(await hasRateLimitTable())) {
    return;
  }
  const key = buildRateLimitKey(scope, identifier, ipAddress);
  await execute("DELETE FROM auth_rate_limits WHERE throttle_key = ?", [key]);
}
