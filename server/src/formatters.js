export const eventSelect = "id,slug,club_id,title,category,description,starts_at,ends_at,timezone,venue_name,neighborhood,address,price_cents,currency,capacity,registered_count,registration_deadline,status,image_url,image_alt,highlights,schedule,clubs!events_club_id_fkey(id,slug,name,description,image_url,image_alt)";

function parts(date, options, timeZone) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-US", { ...options, timeZone }).formatToParts(date).map(part => [part.type, part.value]));
}

export function formatEvent(row) {
  const timeZone = row.timezone || "America/New_York";
  const start = new Date(row.starts_at);
  const end = new Date(row.ends_at);
  const startParts = parts(start, { weekday: "short", day: "2-digit", month: "short", year: "numeric" }, timeZone);
  const formatTime = date => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(date);
  const formatDeadline = date => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone }).format(date);
  let price = "Free";
  if (row.price_cents > 0) {
    try {
      price = new Intl.NumberFormat("en-US", { style: "currency", currency: row.currency || "USD" }).format(row.price_cents / 100);
    } catch {
      price = `${(row.price_cents / 100).toFixed(2)} ${row.currency || "USD"}`;
    }
  }
  const club = row.clubs ? {
    id: row.clubs.id,
    slug: row.clubs.slug,
    name: row.clubs.name,
    description: row.clubs.description,
    image: row.clubs.image_url,
    alt: row.clubs.image_alt
  } : null;

  return {
    id: row.id,
    slug: row.slug,
    club_id: row.club_id,
    title: row.title,
    category: row.category,
    description: row.description,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    timezone: timeZone,
    venue_name: row.venue_name,
    place: row.venue_name,
    neighborhood: row.neighborhood,
    address: row.address,
    price_cents: row.price_cents,
    currency: row.currency,
    price,
    capacity: row.capacity,
    registeredCount: row.registered_count,
    registration_deadline: row.registration_deadline,
    deadline: formatDeadline(new Date(row.registration_deadline)),
    status: row.status,
    image: row.image_url,
    alt: row.image_alt || row.title,
    highlights: row.highlights || [],
    schedule: row.schedule || [],
    organiser: club?.name || "Nexus Club",
    club,
    day: startParts.weekday,
    date: startParts.day,
    month: startParts.month.toUpperCase(),
    year: startParts.year,
    time: formatTime(start),
    endTime: formatTime(end)
  };
}

export function formatClub(row, memberCount = 0) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    type: row.category || "Community",
    members: memberCount,
    image: row.image_url,
    alt: row.image_alt || row.name
  };
}
