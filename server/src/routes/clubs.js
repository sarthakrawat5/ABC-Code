import { Router } from "express";
import { assertClubOrganizer, requireOrganizer } from "../middleware/auth.js";
import { ApiError, fromSupabaseError } from "../errors.js";
import { eventSelect, formatClub, formatEvent } from "../formatters.js";
import { clubCreateSchema, eventWriteSchema, parse, slugSchema } from "../validation.js";

const router = Router();
const clubSelect = "id,slug,name,category,description,image_url,image_alt,created_by,created_at";

async function getClub(request, slug) {
  const { data, error } = await request.db.from("clubs").select(clubSelect).eq("slug", slug).maybeSingle();
  if (error) throw fromSupabaseError(error);
  if (!data) throw new ApiError(404, "Club not found.", "CLUB_NOT_FOUND");
  return data;
}

async function getMemberCounts(db) {
  const { data, error } = await db.from("club_member_counts").select("club_id,member_count");
  if (error) throw fromSupabaseError(error);
  return new Map((data || []).map(item => [item.club_id, item.member_count]));
}

router.get("/", async (request, response) => {
  const [{ data, error }, counts] = await Promise.all([
    request.db.from("clubs").select(clubSelect).order("name", { ascending: true }).limit(100),
    getMemberCounts(request.db)
  ]);
  if (error) throw fromSupabaseError(error);
  response.json({ clubs: data.map(club => formatClub(club, counts.get(club.id) || 0)) });
});

router.get("/:slug", async (request, response) => {
  const slug = parse(slugSchema, request.params.slug);
  const club = await getClub(request, slug);
  const [{ data: eventRows, error: eventError }, counts] = await Promise.all([
    request.db.from("events").select(eventSelect).eq("club_id", club.id).eq("status", "published").gte("ends_at", new Date().toISOString()).order("starts_at").limit(50),
    getMemberCounts(request.db)
  ]);
  if (eventError) throw fromSupabaseError(eventError);
  response.json({
    club: formatClub(club, counts.get(club.id) || 0),
    events: eventRows.map(formatEvent)
  });
});

router.get("/:slug/manage/events", requireAuth, async (request, response) => {
  const slug = parse(slugSchema, request.params.slug);
  const club = await getClub(request, slug);
  await assertClubOrganizer(request, club.id);
  const { data, error } = await request.db
    .from("events")
    .select(eventSelect)
    .eq("club_id", club.id)
    .order("starts_at", { ascending: true });
  if (error) throw fromSupabaseError(error);
  response.json({ events: data.map(formatEvent) });
});

router.post("/", requireAuth, requireOrganizer, async (request, response) => {
  const input = parse(clubCreateSchema, request.body);
  const { data: clubId, error } = await request.db.rpc("create_club", {
    p_slug: input.slug,
    p_name: input.name,
    p_description: input.description,
    p_category: input.category,
    p_image_url: input.image_url || null,
    p_image_alt: input.image_alt || null
  });
  if (error) throw fromSupabaseError(error);
  const club = await getClub(request, input.slug);
  response.status(201).json({ club: formatClub(club), id: clubId });
});

router.post("/:slug/membership", requireAuth, async (request, response) => {
  const slug = parse(slugSchema, request.params.slug);
  const club = await getClub(request, slug);
  const { data: membershipId, error } = await request.db.rpc("join_club", { p_club_id: club.id });
  if (error) throw fromSupabaseError(error);
  response.status(200).json({ membership_id: membershipId, club: formatClub(club) });
});

router.post("/:slug/events", requireAuth, async (request, response) => {
  const slug = parse(slugSchema, request.params.slug);
  const club = await getClub(request, slug);
  await assertClubOrganizer(request, club.id);
  const input = parse(eventWriteSchema, request.body);
  const { data, error } = await request.db
    .from("events")
    .insert({ ...input, club_id: club.id, created_by: request.user.id })
    .select(eventSelect)
    .single();
  if (error) throw fromSupabaseError(error);
  response.status(201).json({ event: formatEvent(data) });
});

export default router;
