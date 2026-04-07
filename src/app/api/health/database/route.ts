import { NextResponse } from "next/server";
import { getDatabaseDialect, queryRows } from "@/lib/db";

export async function GET() {
  const dialect = getDatabaseDialect();

  try {
    const rows = await queryRows<Array<{ now: string }>>("SELECT NOW() AS now");

    return NextResponse.json({
      ok: true,
      dialect,
      databaseTime: rows[0]?.now ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    console.error("Database health check failed.", error);

    return NextResponse.json(
      {
        ok: false,
        dialect,
        error: message
      },
      { status: 500 }
    );
  }
}
