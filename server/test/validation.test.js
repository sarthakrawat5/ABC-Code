import test from "node:test";
import assert from "node:assert/strict";
import { clubCreateSchema, eventWriteSchema, profileUpdateSchema, slugSchema } from "../src/validation.js";
import { fromSupabaseError } from "../src/errors.js";
import { formatEvent } from "../src/formatters.js";

const validEvent = {
  slug: "winter-listening-room",
  title: "Winter Listening Room",
  category: "Music",
  description: "An intimate evening of new jazz and soul records with a live local trio.",
  starts_at: "2026-12-10T20:00:00-05:00",
  ends_at: "2026-12-10T22:30:00-05:00",
  registration_deadline: "2026-12-10T17:00:00-05:00",
  venue_name: "Public Records",
  neighborhood: "Gowanus, Brooklyn",
  address: "233 Butler Street, Brooklyn, NY",
  capacity: 90,
  price_cents: 1200
};

test("event writes accept valid schedule, capacity, and time ranges", () => {
  const result = eventWriteSchema.safeParse({
    ...validEvent,
    schedule: [{ time: "8:00 PM", title: "Doors", description: "Doors open and records begin." }],
    highlights: ["Live trio"]
  });
  assert.equal(result.success, true);
  assert.equal(result.data.timezone, "America/New_York");
  assert.equal(result.data.status, "draft");
});

test("event writes reject invalid capacity and deadlines after start", () => {
  assert.equal(eventWriteSchema.safeParse({ ...validEvent, capacity: 0 }).success, false);
  assert.equal(eventWriteSchema.safeParse({ ...validEvent, registration_deadline: "2026-12-11T00:00:00Z" }).success, false);
});

test("event writes reject unknown fields, including client-owned counters", () => {
  assert.equal(eventWriteSchema.safeParse({ ...validEvent, registered_count: 0 }).success, false);
});

test("profile updates cannot change roles or submit an empty patch", () => {
  assert.equal(profileUpdateSchema.safeParse({ display_name: "Sam Lee" }).success, true);
  assert.equal(profileUpdateSchema.safeParse({ role: "admin" }).success, false);
  assert.equal(profileUpdateSchema.safeParse({}).success, false);
});

test("club creation defaults the category and validates its public slug", () => {
  const result = clubCreateSchema.safeParse({
    slug: "winter-makers",
    name: "Winter Makers",
    description: "A neighborhood group for people who like building things together."
  });
  assert.equal(result.success, true);
  assert.equal(result.data.category, "Community");
  assert.equal(slugSchema.safeParse("../admin").success, false);
});

test("database registration errors map to safe client messages", () => {
  const error = fromSupabaseError({ message: "EVENT_FULL" });
  assert.equal(error.status, 409);
  assert.match(error.message, /capacity/);
});

test("database event rows preserve the frontend event details contract", () => {
  const event = formatEvent({
    id: "event-id",
    slug: "winter-listening-room",
    club_id: "club-id",
    title: "Winter Listening Room",
    category: "Music",
    description: validEvent.description,
    starts_at: validEvent.starts_at,
    ends_at: validEvent.ends_at,
    timezone: "America/New_York",
    venue_name: "Public Records",
    neighborhood: "Gowanus, Brooklyn",
    address: "233 Butler Street, Brooklyn, NY",
    price_cents: 1200,
    currency: "USD",
    capacity: 90,
    registered_count: 21,
    registration_deadline: validEvent.registration_deadline,
    status: "published",
    image_url: "photo-123",
    image_alt: "An intimate music venue",
    highlights: ["Live set"],
    schedule: [],
    clubs: { id: "club-id", slug: "public-records", name: "Public Records Friends" }
  });
  assert.equal(event.slug, "winter-listening-room");
  assert.equal(event.price, "$12.00");
  assert.equal(event.registeredCount, 21);
  assert.equal(event.organiser, "Public Records Friends");
  assert.equal(event.endTime, "10:30 PM");
});
