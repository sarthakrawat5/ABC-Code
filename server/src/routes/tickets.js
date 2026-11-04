import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { ApiError, fromSupabaseError } from "../errors.js";
import { eventSelect, formatEvent } from "../formatters.js";
import { createTicketQr } from "../ticket-qr.js";
import { parse, uuidSchema } from "../validation.js";

const router = Router();
router.use(requireAuth);

router.get("/:ticketId", async (request, response) => {
  const ticketId = parse(uuidSchema, request.params.ticketId);
  const { data: ticket, error: ticketError } = await request.db
    .from("tickets")
    .select("id,registration_id,ticket_code,status,issued_at")
    .eq("id", ticketId)
    .maybeSingle();
  if (ticketError) throw fromSupabaseError(ticketError);
  if (!ticket) throw new ApiError(404, "Ticket not found.", "TICKET_NOT_FOUND");

  const { data: registration, error: registrationError } = await request.db
    .from("event_registrations")
    .select("id,event_id,status")
    .eq("id", ticket.registration_id)
    .eq("user_id", request.user.id)
    .maybeSingle();
  if (registrationError) throw fromSupabaseError(registrationError);
  if (!registration) throw new ApiError(404, "Ticket not found.", "TICKET_NOT_FOUND");

  const { data: event, error: eventError } = await request.db
    .from("events")
    .select(eventSelect)
    .eq("id", registration.event_id)
    .maybeSingle();
  if (eventError) throw fromSupabaseError(eventError);
  response.json({ ticket: { ...ticket, registration, event: event ? formatEvent(event) : null, qr_code: await createTicketQr(ticket) } });
});

export default router;
