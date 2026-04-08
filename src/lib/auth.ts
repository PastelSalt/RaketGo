import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SessionUser, UserType } from "@/lib/types";

export const SESSION_COOKIE_NAME = "raketgo_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const DEV_FALLBACK_SESSION_SECRET = "raketgo-dev-session-secret-not-for-production-use";

let hasWarnedAboutDevFallback = false;

function getSessionSecret(): Uint8Array {
  const secret = (process.env.SESSION_SECRET ?? "").trim();
  if (secret.length >= 32) {
    return new TextEncoder().encode(secret);
  }

  if (process.env.NODE_ENV !== "production") {
    if (!hasWarnedAboutDevFallback) {
      hasWarnedAboutDevFallback = true;
      console.warn(
        "SESSION_SECRET is missing or too short. Using a development-only fallback secret."
      );
    }

    return new TextEncoder().encode(DEV_FALLBACK_SESSION_SECRET);
  }

  throw new Error("SESSION_SECRET must be set and at least 32 characters long.");
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    uid: user.userId,
    role: user.userType,
    name: user.fullName,
    mobile: user.mobileNumber
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    const userId = Number(payload.uid);
    const role = payload.role;
    const fullName = String(payload.name ?? "");
    const mobileNumber = String(payload.mobile ?? "");

    if (!Number.isFinite(userId)) {
      return null;
    }

    if (role !== "worker" && role !== "employer" && role !== "admin") {
      return null;
    }

    return {
      userId,
      userType: role,
      fullName,
      mobileNumber
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    maxAge: SESSION_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export function roleHomePath(role: UserType): string {
  if (role === "admin") {
    return "/admin/dashboard";
  }
  return "/dashboard";
}
