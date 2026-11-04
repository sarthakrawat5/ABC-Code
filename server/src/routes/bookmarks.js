import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { ApiError, fromSupabaseError } from "../errors.js";
import { slugSchema, parse } from "../validation.js";

const router = Router();
router.use(requireAuth);

router.put("/:slug/bookmark", async (request, response) => {
  const slug = parse(slugSchema, request.params.slug);
  const { data: event, error: eventError } = await request.db.from("events").select("id,status").eq("slug", slug).maybeSingle();
  if (eventError) throw fromSupabaseError(eventError);
  if (!event || event.status !== "published") throw new ApiError(404, "Event not found.", "EVENT_NOT_FOUND");

  const { error } = await request.db.from("bookmarks").upsert(
    { event_id: event.id, user_id: request.user.id },
    { onConflict: "event_id,user_id", ignoreDuplicates: true }
  );
  if (error) throw fromSupabaseError(error);
  response.status(204).end();
});

router.delete("/:slug/bookmark", async (request, response) => {
  const slug = parse(slugSchema, request.params.slug);
  const { data: event, error: eventError } = await request.db.from("events").select("id").eq("slug", slug).maybeSingle();
  if (eventError) throw fromSupabaseError(eventError);
  if (!event) throw new ApiError(404, "Event not found.", "EVENT_NOT_FOUND");

  const { error } = await request.db.from("bookmarks").delete().eq("event_id", event.id).eq("user_id", request.user.id);
  if (error) throw fromSupabaseError(error);
  response.status(204).end();
});

export default router;
