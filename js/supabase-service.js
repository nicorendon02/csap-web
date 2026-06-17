// =====================================================
// CSAP - supabase-service.js
// Static GitHub Pages data layer using Supabase REST.
// =====================================================
(function (root) {
  'use strict';

  const AuthCore = root.CSAP_AUTH_CORE;
  const config = root.CSAP_SUPABASE_CONFIG || {};

  if (!AuthCore) {
    throw new Error('CSAP_AUTH_CORE must load before supabase-service.js');
  }

  function configuredUrl() {
    const url = String(config.url || '').trim().replace(/\/+$/, '');
    if (!url || url.includes('your-project-ref')) return '';
    return url;
  }

  function configuredAnonKey() {
    return String(config.anonKey || '').trim();
  }

  function requireSupabase() {
    const url = configuredUrl();
    const anonKey = configuredAnonKey();
    if (!url || !anonKey) {
      throw new Error('Supabase is not configured. Set url and anonKey in js/supabase-config.js.');
    }
    return { url, anonKey };
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function parseDate(value) {
    if (!value) return null;
    const normalized = String(value).includes('T') ? String(value) : String(value).replace(' ', 'T');
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value, options) {
    const date = parseDate(value);
    if (!date) return '';
    return date.toLocaleDateString('en-US', options || {
      weekday: 'short', month: 'short', day: '2-digit', year: 'numeric',
    });
  }

  function formatTime(value) {
    const date = parseDate(value);
    if (!date) return '';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function formatMemberDate(value, fallback) {
    const date = parseDate(value);
    if (!date) return fallback || 'Never';
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function buildQuery(query) {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, value);
    });
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  async function request(table, options) {
    const { url, anonKey } = requireSupabase();
    const method = options?.method || 'GET';
    const query = buildQuery(options?.query);
    const headers = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    };
    if (method !== 'GET') headers.Prefer = options?.prefer || 'return=representation';

    const response = await fetch(`${url}/rest/v1/${table}${query}`, {
      method,
      headers,
      body: options?.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(data?.message || data?.hint || `Supabase request failed (${response.status}).`);
    }
    return data;
  }

  function first(rows) {
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  function createRegistrationId() {
    if (root.crypto?.randomUUID) return `reg_${root.crypto.randomUUID()}`;
    return `reg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  }

  function normalizeEvent(event, registrations) {
    const regs = registrations || [];
    const closes = parseDate(event.registration_closes_at);
    const registrationOpen = !closes || closes.getTime() > Date.now();
    return {
      id: event.id,
      title: event.title || '',
      description: event.description || '',
      category: event.category || 'social',
      location: event.location || '',
      event_date: event.event_date || '',
      event_date_formatted: formatDate(event.event_date) || 'Date TBD',
      event_time_formatted: formatTime(event.event_date),
      has_entry_ticket: event.has_entry_ticket ? 1 : 0,
      has_food_ticket: event.has_food_ticket ? 1 : 0,
      registration_closes_at: event.registration_closes_at || '',
      registration_open: registrationOpen ? 1 : 0,
      status: event.status || 'active',
      created_by: event.created_by || '',
      created_by_name: event.created_by_name || '',
      created_at: event.created_at || '',
      updated_at: event.updated_at || '',
      registration_count: regs.length,
      checked_in_count: regs.filter(reg => !!reg.checked_in).length,
    };
  }

  function sortEvents(events, admin) {
    return [...events].sort((a, b) => {
      const ad = parseDate(a.event_date)?.getTime() || 0;
      const bd = parseDate(b.event_date)?.getTime() || 0;
      return admin ? bd - ad : ad - bd;
    });
  }

  function assertManageSession() {
    const user = AuthCore.getSession();
    if (!AuthCore.canManage(user)) throw new Error('Insufficient permissions.');
    return user;
  }

  async function getUserByEmail(email) {
    const normalizedEmail = AuthCore.normalizeEmail(email);
    if (!normalizedEmail) return null;
    const id = AuthCore.emailToUserKey(normalizedEmail);
    const rows = await request('csap_users', {
      query: { select: '*', id: `eq.${id}`, limit: '1' },
    });
    return first(rows);
  }

  async function getMembers() {
    const rows = await request('csap_users', {
      query: { select: '*', order: 'created_at.desc' },
    });
    return rows.map(user => ({
      ...user,
      email: AuthCore.normalizeEmail(user.email),
      role: AuthCore.normalizeRole(user.role),
      status: AuthCore.normalizeStatus(user.status),
      joined: formatMemberDate(user.created_at, ''),
      last_login: formatMemberDate(user.last_login, 'Never'),
    }));
  }

  async function addMember(input) {
    const actor = assertManageSession();
    const email = AuthCore.normalizeEmail(input.email);
    const lastNames = AuthCore.formatLastNamesInput(input.lastNames || '').trim();
    if (!input.name || !AuthCore.isValidEmail(email) || !AuthCore.isValidLastNames(lastNames)) {
      throw new Error('Name, valid email, and last name(s) are required.');
    }

    const id = AuthCore.emailToUserKey(email);
    if (await getUserByEmail(email)) throw new Error('A user with that email already exists.');

    const role = AuthCore.canPromote(actor) ? AuthCore.normalizeRole(input.role) : 'user';
    const now = nowIso();
    await request('csap_users', {
      method: 'POST',
      body: {
        id,
        name: input.name.trim(),
        email,
        last_names: lastNames,
        role,
        status: AuthCore.normalizeStatus(input.status || 'pending'),
        created_at: now,
        updated_at: now,
      },
    });
    await auditLog('user.create', id, { email, role });
    return { success: true, id };
  }

  async function updateMember(input) {
    const actor = assertManageSession();
    const current = first(await request('csap_users', {
      query: { select: '*', id: `eq.${input.id}`, limit: '1' },
    }));
    if (!current) throw new Error('User not found.');

    const email = AuthCore.normalizeEmail(input.email);
    const nextId = AuthCore.emailToUserKey(email);
    const emailChanged = nextId !== input.id;
    const lastNames = AuthCore.formatLastNamesInput(input.lastNames || '').trim();

    if (!input.name || !AuthCore.isValidEmail(email)) throw new Error('Valid name and email are required.');
    if (emailChanged && !AuthCore.isValidLastNames(lastNames)) throw new Error('Set last name(s) when changing a user email.');
    if (emailChanged && await getUserByEmail(email)) throw new Error('A user with that email already exists.');

    const updated = {
      id: nextId,
      name: input.name.trim(),
      email,
      status: AuthCore.normalizeStatus(input.status),
      updated_at: nowIso(),
    };
    if (AuthCore.canPromote(actor)) updated.role = AuthCore.normalizeRole(input.role);
    if (lastNames) updated.last_names = lastNames;

    await request('csap_users', {
      method: 'PATCH',
      query: { id: `eq.${input.id}` },
      body: updated,
    });
    await auditLog('user.update', nextId, { email, status: updated.status, role: updated.role });
    return { success: true, id: nextId };
  }

  async function deleteMember(id, hard) {
    assertManageSession();
    if (hard) {
      await request('csap_users', { method: 'DELETE', query: { id: `eq.${id}` } });
      await auditLog('user.delete', id);
    } else {
      await request('csap_users', {
        method: 'PATCH',
        query: { id: `eq.${id}` },
        body: { status: 'suspended', updated_at: nowIso() },
      });
      await auditLog('user.suspend', id);
    }
    return { success: true };
  }

  async function getRegistrationsForEvent(eventId) {
    return request('csap_registrations', {
      query: { select: '*', event_id: `eq.${eventId}` },
    });
  }

  async function getEvents(options) {
    const admin = !!options?.admin;
    const eventRows = await request('csap_events', {
      query: { select: '*', order: admin ? 'event_date.desc' : 'event_date.asc' },
    });
    const regRows = admin ? await request('csap_registrations', { query: { select: '*' } }) : [];
    const events = eventRows.map(event => {
      const eventRegs = regRows.filter(reg => String(reg.event_id) === String(event.id));
      return normalizeEvent(event, eventRegs);
    });
    const filtered = admin ? events : events.filter(event => event.status === 'active');
    return sortEvents(filtered, admin);
  }

  async function getEvent(id) {
    const row = first(await request('csap_events', {
      query: { select: '*', id: `eq.${id}`, limit: '1' },
    }));
    return row ? normalizeEvent(row, []) : null;
  }

  async function saveEvent(input) {
    const actor = assertManageSession();
    if (!input.title) throw new Error('Event title is required.');

    const now = nowIso();
    const payload = {
      title: input.title.trim(),
      description: input.description || '',
      category: input.category || 'social',
      status: input.status || 'active',
      location: input.location || '',
      event_date: input.event_date || null,
      registration_closes_at: input.registration_closes_at || null,
      has_entry_ticket: !!input.has_entry_ticket,
      has_food_ticket: !!input.has_food_ticket,
      updated_at: now,
    };

    if (input.id) {
      await request('csap_events', {
        method: 'PATCH',
        query: { id: `eq.${input.id}` },
        body: payload,
      });
      await auditLog('event.update', input.id, { title: payload.title });
      return { success: true, id: input.id };
    }

    payload.status = 'active';
    payload.created_at = now;
    payload.created_by = actor.id;
    payload.created_by_name = actor.name;
    const rows = await request('csap_events', { method: 'POST', body: payload });
    const created = first(rows);
    await auditLog('event.create', created?.id, { title: payload.title });
    return { success: true, id: created?.id };
  }

  async function deleteEvent(id) {
    assertManageSession();
    await request('csap_events', { method: 'DELETE', query: { id: `eq.${id}` } });
    await auditLog('event.delete', id);
    return { success: true };
  }

  async function registerForEvent(input) {
    const eventId = String(input.event_id || '');
    const email = AuthCore.normalizeEmail(input.email);
    const firstName = String(input.first_name || '').trim();
    const lastName = String(input.last_name || '').trim();
    const guests = Number(input.guests || 0);

    if (!eventId) throw new Error('Invalid event.');
    if (!AuthCore.isValidEmail(email)) throw new Error('Enter a valid email address.');
    if (!firstName) throw new Error('First name is required.');
    if (!lastName) throw new Error('Last name is required.');
    if (!Number.isInteger(guests) || guests < 0 || guests > 5) throw new Error('Guests must be between 0 and 5.');

    const event = await getEvent(eventId);
    if (!event || event.status !== 'active' || +event.registration_open !== 1) {
      throw new Error('This event is no longer accepting registrations.');
    }

    const existing = first(await request('csap_registrations', {
      query: { select: 'id', event_id: `eq.${eventId}`, email: `eq.${email}`, limit: '1' },
    }));
    if (existing) throw new Error('This email is already registered for this event. Each person may only register once.');

    const registration = {
      id: createRegistrationId(),
      event_id: eventId,
      email,
      first_name: firstName,
      last_name: lastName,
      guests,
      entry_ticket: !!+event.has_entry_ticket,
      food_ticket: !!+event.has_food_ticket,
      checked_in: false,
      checked_in_at: null,
      created_at: nowIso(),
    };
    const rows = await request('csap_registrations', { method: 'POST', body: registration });
    const created = first(rows) || registration;
    return { success: true, reg_id: created.id, registration: created, event };
  }

  async function getTicket(eventId, email) {
    const normalizedEmail = AuthCore.normalizeEmail(email);
    if (!eventId || !AuthCore.isValidEmail(normalizedEmail)) throw new Error('Valid event and email are required.');
    const registration = first(await request('csap_registrations', {
      query: { select: '*', event_id: `eq.${eventId}`, email: `eq.${normalizedEmail}`, limit: '1' },
    }));
    if (!registration) throw new Error('Ticket not found.');
    const event = await getEvent(eventId);
    if (!event) throw new Error('Event not found.');
    return { registration, event };
  }

  async function checkIn(eventId, ticketId) {
    assertManageSession();
    const id = String(ticketId || '').trim();
    if (!eventId || !id) throw new Error('Valid event and ticket id are required.');
    const registration = first(await request('csap_registrations', {
      query: { select: '*', id: `eq.${id}`, event_id: `eq.${eventId}`, limit: '1' },
    }));
    if (!registration) return { error: 'not_found', message: 'No registration found for this ticket at this event.' };
    if (registration.checked_in) return { already_checked_in: true, ...registration };

    const checkedInAt = nowIso();
    await request('csap_registrations', {
      method: 'PATCH',
      query: { id: `eq.${id}` },
      body: { checked_in: true, checked_in_at: checkedInAt },
    });
    await auditLog('event.checkin', eventId, { registration_id: id });
    return { success: true, ...registration, checked_in: true, checked_in_at: checkedInAt };
  }

  async function auditLog(action, targetId, detail) {
    try {
      const actor = AuthCore.getSession();
      await request('csap_audit_log', {
        method: 'POST',
        body: {
          actor_id: actor?.id || null,
          action,
          target_id: targetId || null,
          detail: detail || null,
          created_at: nowIso(),
        },
      });
    } catch (e) {}
  }

  async function login(email, lastNames) {
    const validation = AuthCore.validateLoginFields(email, lastNames);
    if (!validation.ok) throw new Error(validation.errors.join(' '));

    const user = await getUserByEmail(validation.email);
    const validCredential = await AuthCore.matchesLastNameCredential(user, validation.lastNames);
    if (!user || !validCredential) throw new Error('Incorrect email or last name(s). Please try again.');
    if (!AuthCore.isActiveUser(user)) throw new Error('Your account is not active. Contact an administrator.');

    const session = AuthCore.saveSession(user);
    await request('csap_users', {
      method: 'PATCH',
      query: { id: `eq.${user.id}` },
      body: { last_login: nowIso() },
    });
    return session;
  }

  function logout(redirect) {
    AuthCore.clearSession();
    if (redirect !== false) root.location.href = 'login.html';
  }

  function getCurrentUser() {
    return AuthCore.getSession();
  }

  function requireSession(options) {
    const user = getCurrentUser();
    if (!user || (options?.manageOnly && !AuthCore.canManage(user))) {
      root.location.href = 'login.html?error=session';
      return null;
    }
    return user;
  }

  root.CSAP_DB = {
    isConfigured: () => !!configuredUrl() && !!configuredAnonKey(),
    getUserByEmail,
    getMembers,
    addMember,
    updateMember,
    deleteMember,
    getEvents,
    getEvent,
    saveEvent,
    deleteEvent,
    registerForEvent,
    getTicket,
    checkIn,
  };

  root.CSAP_AUTH = {
    login,
    logout,
    getCurrentUser,
    requireSession,
    canManage: AuthCore.canManage,
    canPromote: AuthCore.canPromote,
    formatLastNamesInput: AuthCore.formatLastNamesInput,
  };

  root.logoutCurrentUser = function () { logout(); };
})(window);
