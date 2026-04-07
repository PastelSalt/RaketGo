import { z } from "zod";
import { isValidPhilippineMobile, normalizePhilippineMobile } from "@/lib/utils";

export const PHILIPPINES_REGIONS: Record<string, string> = {
  NCR: "National Capital Region",
  CAR: "Cordillera Administrative Region",
  "Region I": "Ilocos Region",
  "Region II": "Cagayan Valley",
  "Region III": "Central Luzon",
  "Region IV-A": "CALABARZON",
  "Region IV-B": "MIMAROPA",
  "Region V": "Bicol Region",
  "Region VI": "Western Visayas",
  "Region VII": "Central Visayas",
  "Region VIII": "Eastern Visayas",
  "Region IX": "Zamboanga Peninsula",
  "Region X": "Northern Mindanao",
  "Region XI": "Davao Region",
  "Region XII": "SOCCSKSARGEN",
  "Region XIII": "Caraga",
  BARMM: "Bangsamoro Autonomous Region in Muslim Mindanao"
};

export const loginSchema = z.object({
  mobile_number: z
    .string()
    .transform((value) => normalizePhilippineMobile(value))
    .refine((value) => isValidPhilippineMobile(value), "Invalid mobile number"),
  password: z.string().min(1, "Password is required")
});

export const signupSchema = z
  .object({
    mobile_number: z
      .string()
      .transform((value) => normalizePhilippineMobile(value))
      .refine((value) => isValidPhilippineMobile(value), "Invalid mobile number"),
    email: z.string().email("Invalid email address").or(z.literal("")),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Password must contain letters and numbers"),
    confirm_password: z.string(),
    user_type: z.enum(["worker", "employer"]),
    full_name: z.string().min(2).max(100),
    region: z.string().refine((value) => value in PHILIPPINES_REGIONS, "Invalid region"),
    province: z.string().min(2).max(100),
    city: z.string().min(2).max(100),
    skills: z.array(z.string().min(1).max(100)).default([])
  })
  .refine((value) => value.password === value.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"]
  });

export const jobPostSchema = z.object({
  job_title: z.string().min(3).max(200),
  job_description: z.string().min(20),
  location_region: z.string().refine((value) => value in PHILIPPINES_REGIONS, "Invalid region"),
  location_province: z.string().min(2).max(100),
  location_city: z.string().min(2).max(100),
  specific_address: z.string().max(500).optional().or(z.literal("")),
  pay_amount: z.coerce.number().positive(),
  pay_type: z.enum(["hourly", "daily", "fixed", "monthly"]),
  required_skills: z.string().max(1000).optional().or(z.literal("")),
  preferred_skills: z.string().max(1000).optional().or(z.literal("")),
  job_category: z.string().max(100).optional().or(z.literal("")),
  slots_available: z.coerce.number().int().positive().max(100)
});

export const messageSchema = z.object({
  receiver_id: z.coerce.number().int().positive(),
  message_content: z.string().min(1).max(2000)
});
