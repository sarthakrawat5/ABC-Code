import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { ApiError, fromSupabaseError } from "../errors.js";
import { parse, slugSchema } from "../validation.js";

const router = Router();
router.use(requireAuth);

router.post("/:slug/registrations", async (request, response) => {
  const slug = parse(slugSchema, request.params.slug);
  const { data: event, error: eventError } = await request.db
    .from("events")
    .select("id,status")
    .eq("slug", slug)
    .maybeSingle();
  if (eventError) throw fromSupabaseError(eventError);
  if (!event || event.status !== "published") throw new ApiError(404, "Event not found.", "EVENT_NOT_FOUND");

  const { data, error } = await request.db.rpc("register_for_event", { p_event_id: event.id });
  if (error) throw fromSupabaseError(error);
  const ticket = Array.isArray(data) ? data[0] : data;
  response.status(201).json({
    registration: { id: ticket.registration_id, event_id: event.id, status: "confirmed" },
    ticket: { id: ticket.ticket_id, ticket_code: ticket.ticket_code, status: "valid" }
  });
});

export default router;
