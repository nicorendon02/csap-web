-- Example admin seed. Login last name is Admin.

insert into public.csap_users (
  id,
  name,
  email,
  last_names,
  role,
  status
) values (
  'YWRtaW5AY3NhcC5wdXJkdWUuZWR1',
  'CSAP Admin',
  'admin@csap.purdue.edu',
  'Admin',
  'admin',
  'active'
) on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  last_names = excluded.last_names,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();
