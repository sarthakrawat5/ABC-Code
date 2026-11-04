import { Router } from "express";
import { z } from "zod";
import { assertClubOrganizer, requireAuth } from "../middleware/auth.js";
import { ApiError, fromSupabaseError } from "../errors.js";
import { eventSelect, formatEvent } from "../formatters.js";
import { parse, eventWriteSchema, slugSchema } from "../validation.js";

const router = Router();
const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(60)
}).strict();

router.get("/", async (request, response) => {
  const query = parse(listQuerySchema, request.query);
  let builder = request.db
    .from("events")
    .select(eventSelect)
    .eq("status", "published")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(query.limit);
  if (query.category) builder = builder.eq("category", query.category);
  if (query.q) builder = builder.ilike("title", `%${query.q.replace(/[%,()]/g, " ")}%`);

  const { data, error } = await builder;
  if (error) throw fromSupabaseError(error);
  response.json({ events: data.map(formatEvent) });
});

router.get("/:slug", async (request, response) => {
  const slug = parse(slugSchema, request.params.slug);
  const { data, error } = await request.db.from("events").select(eventSelect).eq("slug", slug).maybeSingle();
  if (error) throw fromSupabaseError(error);
  if (!data || data.status !== "published") throw new ApiError(404, "Event not found.", "EVENT_NOT_FOUND");
  response.json({ event: formatEvent(data) });
});

router.patch("/:slug", requireAuth, async (request, response) => {
  const slug = parse(slugSchema, request.params.slug);
  const input = parse(eventWriteSchema, request.body);
  const { data: current, error: lookupError } = await request.db
    .from("events")
    .select("id,club_id")
    .eq("slug", slug)
    .maybeSingle();
  if (lookupError) throw fromSupabaseError(lookupError);
  if (!current) throw new ApiError(404, "Event not found.", "EVENT_NOT_FOUND");
  await assertClubOrganizer(request, current.club_id);

  const { data, error } = await request.db
    .from("events")
    .update(input)
    .eq("id", current.id)
    .select(eventSelect)
    .single();
  if (error) throw fromSupabaseError(error);
  response.json({ event: formatEvent(data) });
});

router.delete("/:slug", requireAuth, async (request, response) => {
  const slug = parse(slugSchema, request.params.slug);
  const { data: current, error: lookupError } = await request.db
    .from("events")
    .select("id,club_id")
    .eq("slug", slug)
    .maybeSingle();
  if (lookupError) throw fromSupabaseError(lookupError);
  if (!current) throw new ApiError(404, "Event not found.", "EVENT_NOT_FOUND");
  await assertClubOrganizer(request, current.club_id);

  const { error } = await request.db.from("events").update({ status: "cancelled" }).eq("id", current.id);
  if (error) throw fromSupabaseError(error);
  response.status(204).end();
});

export default router;
