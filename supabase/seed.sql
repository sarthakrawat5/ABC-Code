begin;

insert into public.clubs (id, slug, name, category, description, image_url, image_alt) values
  ('10000000-0000-4000-8000-000000000001', 'soft-launch-run-club', 'Soft Launch Run Club', 'Outdoors', 'A friendly neighborhood running crew with pace groups for first-timers and regulars.', 'photo-1530549387789-4c1017266635', 'People jogging together outside'),
  ('10000000-0000-4000-8000-000000000002', 'the-sunday-studio', 'The Sunday Studio', 'Art', 'A shared space for curious makers, open studio nights, and beginner-friendly art workshops.', 'photo-1513364776144-60967b0f800f', 'Bright shared art studio'),
  ('10000000-0000-4000-8000-000000000003', 'dinner-party-dept', 'Dinner Party Dept.', 'Food', 'Hosted neighborhood dinners that turn a table of strangers into a room of friends.', 'photo-1528605248644-14dd04022da1', 'Friends enjoying a meal together'),
  ('10000000-0000-4000-8000-000000000004', 'elsewhere-community', 'Elsewhere Community', 'Music', 'Independent music, open-air nights, and artist-led gatherings in Brooklyn.', 'photo-1470229722913-7c0e2dbbafd3', 'Crowd dancing at an outdoor music show'),
  ('10000000-0000-4000-8000-000000000005', 'public-records-friends', 'Public Records and Friends', 'Music', 'A listening community centered on adventurous sound and close-up live performances.', 'photo-1516280440614-37939bbacd81', 'Singer performing in a warm intimate venue'),
  ('10000000-0000-4000-8000-000000000006', 'bushwick-printmakers', 'Bushwick Printmakers Club', 'Art', 'Independent printmakers sharing their processes, small editions, and studio know-how.', 'photo-1513364776144-60967b0f800f', 'Colorful art and printmaking supplies')
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  image_url = excluded.image_url,
  image_alt = excluded.image_alt;

insert into public.events (
  id, slug, club_id, title, category, description, starts_at, ends_at, timezone,
  venue_name, neighborhood, address, price_cents, currency, capacity,
  registration_deadline, status, image_url, image_alt, highlights, schedule
) values
  (
    '20000000-0000-4000-8000-000000000001', 'rooftop-sessions', '10000000-0000-4000-8000-000000000004',
    'Rooftop Sessions: Vol. 4', 'Music',
    'A golden-hour rooftop set led by three Brooklyn selectors, with open-air dance floors and a skyline view that lasts well past sunset.',
    '2026-12-04 19:30:00-05', '2026-12-04 23:00:00-05', 'America/New_York',
    'Elsewhere Rooftop', 'East Williamsburg, Brooklyn', '599 Johnson Avenue, Brooklyn, NY',
    1800, 'USD', 180, '2026-12-03 18:00:00-05', 'published',
    'photo-1470229722913-7c0e2dbbafd3', 'Crowd dancing at an outdoor music show',
    array['Three local DJ sets', 'Rooftop skyline views', 'Covered lounge and water station', '21+ with valid photo ID'],
    '[{"time":"7:30 PM","title":"Doors and rooftop open","description":"Check in, grab a drink, and find a place for sunset."},{"time":"8:15 PM","title":"Warm-up set","description":"Brooklyn selectors bring the first hour of records."},{"time":"9:30 PM","title":"Headliner set","description":"A full rooftop set under the night sky."}]'::jsonb
  ),
  (
    '20000000-0000-4000-8000-000000000002', 'clay-after-dark', '10000000-0000-4000-8000-000000000002',
    'Clay After Dark', 'Art',
    'An easygoing evening at the wheel for curious first-timers and returning makers. Shape a small piece, share the table, and let the studio handle the firing.',
    '2026-12-05 18:00:00-05', '2026-12-05 21:00:00-05', 'America/New_York',
    'Common Ground Studio', 'Fort Greene, Brooklyn', '68 Adelphi Street, Brooklyn, NY',
    3200, 'USD', 24, '2026-12-04 12:00:00-05', 'published',
    'photo-1578749556568-bc2c40e68b61', 'Hands making pottery at a ceramic studio',
    array['Guided wheel-throwing introduction', 'Clay, tools, and firing included', 'Aprons and tea provided', 'Finished work ready for pickup in three weeks'],
    '[{"time":"6:00 PM","title":"Welcome and studio tour","description":"Meet the makers and choose your wheel."},{"time":"6:20 PM","title":"Clay basics","description":"A hands-on demo of centering and shaping."},{"time":"7:00 PM","title":"Make and mingle","description":"Work at your own pace with studio help nearby."}]'::jsonb
  ),
  (
    '20000000-0000-4000-8000-000000000003', 'sunday-miles', '10000000-0000-4000-8000-000000000001',
    'Sunday Miles & Coffee', 'Outdoors',
    'A no-pressure Sunday loop with the Soft Launch crew. Pick a pace group, meet a few neighbors, then head for coffee together after the run.',
    '2026-12-06 09:00:00-05', '2026-12-06 11:00:00-05', 'America/New_York',
    'McCarren Park', 'Greenpoint, Brooklyn', 'Meet at the Driggs Avenue entrance, Brooklyn, NY',
    0, 'USD', 60, '2026-12-05 20:00:00-05', 'published',
    'photo-1552674605-db6ffd4facb5', 'Runners moving together on a city street',
    array['Three pace groups from 5K to 10K', 'First-timer friendly route leaders', 'Bag drop near the start', 'Optional coffee stop after the loop'],
    '[{"time":"9:00 AM","title":"Meet at the park entrance","description":"Check in and choose a pace group."},{"time":"9:15 AM","title":"Easy group warm-up","description":"A few mobility moves before setting off."},{"time":"9:30 AM","title":"Sunday loop","description":"Run the park loop with your group, then meet at the finish."}]'::jsonb
  ),
  (
    '20000000-0000-4000-8000-000000000004', 'listening-room', '10000000-0000-4000-8000-000000000005',
    'The Listening Room', 'Music',
    'A candlelit listening session for new voices in soul and jazz. Hear a short live set, discover records picked by the host, and stay for a low-key conversation after.',
    '2026-12-10 20:00:00-05', '2026-12-10 22:30:00-05', 'America/New_York',
    'Public Records', 'Gowanus, Brooklyn', '233 Butler Street, Brooklyn, NY',
    1200, 'USD', 90, '2026-12-10 17:00:00-05', 'published',
    'photo-1516280440614-37939bbacd81', 'Singer performing in a warm intimate venue',
    array['Intimate live vocal set', 'Curated records played front to back', 'Listening-room sound system', 'Seated and standing areas'],
    '[{"time":"8:00 PM","title":"Doors and first records","description":"Settle in while the host shares a few selections."},{"time":"8:45 PM","title":"Live set","description":"A close-up performance from a local vocalist and trio."},{"time":"9:30 PM","title":"After-listening conversation","description":"Meet the artists and swap recommendations."}]'::jsonb
  ),
  (
    '20000000-0000-4000-8000-000000000005', 'little-print-fair', '10000000-0000-4000-8000-000000000006',
    'Little Print Fair', 'Art',
    'A neighborhood print fair bringing independent illustrators and printmakers together for an afternoon of small editions, handmade books, and friendly studio demos.',
    '2026-12-12 12:00:00-05', '2026-12-12 17:00:00-05', 'America/New_York',
    'The Yard', 'Bushwick, Brooklyn', '84 Wyckoff Avenue, Brooklyn, NY',
    500, 'USD', 250, '2026-12-12 10:00:00-05', 'published',
    'photo-1513364776144-60967b0f800f', 'Colorful art and printmaking supplies',
    array['More than 30 independent artists', 'Live screen-printing demonstration', 'Small-press and zine table', 'Accessible indoor venue with step-free entry'],
    '[{"time":"12:00 PM","title":"Fair opens","description":"Meet the artists and browse the print tables."},{"time":"1:30 PM","title":"Screen-print demo","description":"Watch a small edition come together from start to finish."},{"time":"3:00 PM","title":"Zine swap","description":"Bring a zine or pick one up from the community table."}]'::jsonb
  ),
  (
    '20000000-0000-4000-8000-000000000006', 'long-table', '10000000-0000-4000-8000-000000000003',
    'The Long Table', 'Social',
    'One long table, a seasonal family-style menu, and a few new faces. Come solo or bring a friend; hosts make sure everyone has a seat and a way into the conversation.',
    '2026-12-13 17:00:00-05', '2026-12-13 20:00:00-05', 'America/New_York',
    'Poppy''s', 'Bed-Stuy, Brooklyn', '120 Franklin Avenue, Brooklyn, NY',
    2400, 'USD', 32, '2026-12-11 20:00:00-05', 'published',
    'photo-1511795409834-ef04bbd61622', 'Friends gathering around a long dinner table',
    array['Family-style seasonal dinner', 'Hosted introductions at each table', 'Vegetarian menu available', 'Share dietary needs at registration'],
    '[{"time":"5:00 PM","title":"Welcome drink","description":"Meet the hosts and find your place card."},{"time":"5:30 PM","title":"Dinner is served","description":"A seasonal menu arrives family-style."},{"time":"7:15 PM","title":"Last course and linger","description":"Stay for dessert, conversation, and local recommendations."}]'::jsonb
  )
on conflict (slug) do update set
  club_id = excluded.club_id,
  title = excluded.title,
  category = excluded.category,
  description = excluded.description,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  timezone = excluded.timezone,
  venue_name = excluded.venue_name,
  neighborhood = excluded.neighborhood,
  address = excluded.address,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  capacity = excluded.capacity,
  registration_deadline = excluded.registration_deadline,
  status = excluded.status,
  image_url = excluded.image_url,
  image_alt = excluded.image_alt,
  highlights = excluded.highlights,
  schedule = excluded.schedule;

commit;
