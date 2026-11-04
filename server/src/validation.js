import { z } from "zod";
import { ApiError } from "./errors.js";

export function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, "Check the submitted fields.", "VALIDATION_ERROR", result.error.issues);
  }
  return result.data;
}

export const slugSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const uuidSchema = z.string().uuid();

export const profileUpdateSchema = z.object({
  display_name: z.string().trim().min(1).max(80).optional(),
  avatar_url: z.string().url().max(2048).nullable().optional()
}).strict().refine(value => Object.keys(value).length > 0);

export const clubCreateSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(50).default('Community'),
  description: z.string().trim().min(20).max(3000),
  image_url: z.string().trim().max(2048).optional().nullable(),
  image_alt: z.string().trim().max(240).optional().nullable()
}).strict();

const scheduleItemSchema = z.object({
  time: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500)
}).strict();

export const eventWriteSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(2).max(140),
  category: z.string().trim().min(2).max(50),
  description: z.string().trim().min(20).max(5000),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }),
  timezone: z.string().trim().min(3).max(80).default("America/New_York"),
  venue_name: z.string().trim().min(2).max(160),
  neighborhood: z.string().trim().min(2).max(160),
  address: z.string().trim().min(5).max(300),
  price_cents: z.number().int().min(0).max(10000000).default(0),
  currency: z.string().trim().length(3).default("USD"),
  capacity: z.number().int().min(1).max(100000),
  registration_deadline: z.string().datetime({ offset: true }),
  status: z.enum(["draft", "published", "cancelled"]).default("draft"),
  image_url: z.string().trim().max(2048).optional().nullable(),
  image_alt: z.string().trim().max(240).optional().nullable(),
  highlights: z.array(z.string().trim().min(1).max(240)).max(12).default([]),
  schedule: z.array(scheduleItemSchema).max(30).default([])
}).strict().refine(value => new Date(value.ends_at) > new Date(value.starts_at), {
  message: "The end time must be after the start time.", path: ["ends_at"]
}).refine(value => new Date(value.registration_deadline) <= new Date(value.starts_at), {
  message: "The registration deadline must be no later than the event start.", path: ["registration_deadline"]
}).refine(value => {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value.timezone }); return true; }
  catch { return false; }
}, {
  message: "Use a valid IANA timezone.", path: ["timezone"]
});
