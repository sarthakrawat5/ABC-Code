import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { ApiError, fromSupabaseError } from "../errors.js";
import { eventSelect, formatClub, formatEvent } from "../formatters.js";
import { createTicketQr } from "../ticket-qr.js";
import { parse, profileUpdateSchema } from "../validation.js";

const router = Router();
const profileSelect = "id,email,display_name,avatar_url,role";
router.use(requireAuth);

function formatUser(profile) {
  return { id: profile.id, email: profile.email, name: profile.display_name, avatar: profile.avatar_url, role: profile.role };
}

async function getEventsByIds(db, ids) {
  if (!ids.length) return new Map();
  const { data, error } = await db.from("events").select(eventSelect).in("id", ids);
  if (error) throw fromSupabaseError(error);
  return new Map(data.map(row => [row.id, formatEvent(row)]));
}

router.get("/me", async (request, response) => {
  response.json({ user: formatUser(request.profile) });
});

router.patch("/me", async (request, response) => {
  const input = parse(profileUpdateSchema, request.body);
  const { data, error } = await request.db
    .from("profiles")
    .update(input)
    .eq("id", request.user.id)
    .select(profileSelect)
    .single();
  if (error) throw fromSupabaseError(error);
  request.profile = data;
  response.json({ user: formatUser(data) });
});

router.get("/me/bookmarks", async (request, response) => {
  const { data: rows, error } = await request.db
    .from("bookmarks")
    .select("event_id,created_at")
    .eq("user_id", request.user.id)
    .order("created_at", { ascending: false });
  if (error) throw fromSupabaseError(error);
  const eventById = await getEventsByIds(request.db, rows.map(row => row.event_id));
  response.json({ bookmarks: rows.flatMap(row => eventById.has(row.event_id) ? [{ event_id: row.event_id, created_at: row.created_at, event: eventById.get(row.event_id) }] : []) });
});

router.get("/me/registrations", async (request, response) => {
  const { data: rows, error } = await request.db
    .from("event_registrations")
    .select("id,event_id,status,created_at")
    .eq("user_id", request.user.id)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });
  if (error) throw fromSupabaseError(error);
  const eventById = await getEventsByIds(request.db, rows.map(row => row.event_id));
  response.json({ registrations: rows.flatMap(row => eventById.has(row.event_id) ? [{ ...row, event: eventById.get(row.event_id) }] : []) });
});

router.get("/me/tickets", async (request, response) => {
  const { data: registrations, error: registrationError } = await request.db
    .from("event_registrations")
    .select("id,event_id")
    .eq("user_id", request.user.id)
    .eq("status", "confirmed");
  if (registrationError) throw fromSupabaseError(registrationError);
  if (!registrations.length) return response.json({ tickets: [] });

  const { data: tickets, error: ticketError } = await request.db
    .from("tickets")
    .select("id,registration_id,ticket_code,status,issued_at")
    .in("registration_id", registrations.map(row => row.id))
    .order("issued_at", { ascending: false });
  if (ticketError) throw fromSupabaseError(ticketError);
  const eventById = await getEventsByIds(request.db, registrations.map(row => row.event_id));
  const registrationById = new Map(registrations.map(row => [row.id, row]));
  const formattedTickets = await Promise.all(tickets.map(async ticket => {
      const registration = registrationById.get(ticket.registration_id);
      const event = registration && eventById.get(registration.event_id);
      return event ? { ...ticket, event, qr_code: await createTicketQr(ticket) } : null;
  }));
  response.json({ tickets: formattedTickets.filter(Boolean) });
});

router.get("/me/clubs", async (request, response) => {
  const { data, error } = await request.db
    .from("club_memberships")
    .select("club_id,role,created_at,clubs!club_memberships_club_id_fkey(id,slug,name,description,image_url,image_alt)")
    .eq("user_id", request.user.id)
    .order("created_at", { ascending: false });
  if (error) throw fromSupabaseError(error);
  response.json({ clubs: data.map(row => ({ ...formatClub(row.clubs), role: row.role, joined_at: row.created_at })) });
});

export { formatUser };
export default router;
