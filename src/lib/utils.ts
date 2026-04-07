import { createHash } from "crypto";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeInput(value: unknown): string {
  return String(value ?? "").replace(/\0/g, "").trim();
}

export function sanitizeMultilineInput(value: unknown): string {
  return sanitizeInput(value).replace(/\r\n?|\n/g, "\n");
}

export function normalizePhilippineMobile(mobile: string): string {
  const compact = mobile.replace(/\s+/g, "").trim();
  if (compact.startsWith("+63")) {
    return `0${compact.slice(3)}`;
  }
  return compact;
}

export function isValidPhilippineMobile(mobile: string): boolean {
  return /^09\d{9}$/.test(normalizePhilippineMobile(mobile));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2
  }).format(value);
}

export function timeAgo(dateValue: string | Date): string {
  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) {
    return "Unknown";
  }

  const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSeconds < 60) {
    return "Just now";
  }
  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  if (diffSeconds < 604800) {
    const days = Math.floor(diffSeconds / 86400);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(timestamp);
}

export function getClientIpFromRequestHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const realIp = headers.get("x-real-ip") ?? "";
  const candidate = forwarded.split(",")[0]?.trim() || realIp.trim();
  if (!candidate) {
    return "0.0.0.0";
  }
  return candidate;
}

export function buildRateLimitKey(scope: string, identifier: string, ipAddress: string): string {
  return createHash("sha256")
    .update(`${scope.toLowerCase()}|${identifier.toLowerCase()}|${ipAddress}`)
    .digest("hex");
}

export function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
