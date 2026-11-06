# Rails API boundary

The app runs entirely in the browser today. Every read and write goes through the `Repository` interface in [`src/data/repository.ts`](../src/data/repository.ts), and the data shapes live in [`src/data/types.ts`](../src/data/types.ts). This document describes the HTTP API a Rails backend needs to provide so an `ApiRepository` can replace `LocalRepository` without changing any screen.

## Conventions

- JSON over HTTPS under `/api/v1`. Field names stay camelCase in JSON, which you can do with a serializer key transform.
- Timestamps are ISO 8601 in UTC, such as `2026-11-15T03:00:00.000Z`.
- `timeZone` is an IANA name, such as `America/Los_Angeles`. Store it as a string. Do not store offsets.
- IDs are opaque strings. UUIDs work well.
- Lists return `{ "items": [...], "nextCursor": "..." | null }`. The current app does not paginate, so it can read `items` and ignore the cursor until the event count calls for it.

### Errors

Errors use one shape, which `ApiRepository` turns into `RepositoryError`:

```json
{
  "error": {
    "code": "conflict",
    "message": "12 spots are already taken. Remove RSVPs before lowering capacity below that.",
    "fields": { "capacity": ["must be at least 12"] }
  }
}
```

| HTTP status | `code`       | When                                                 |
| ----------- | ------------ | ---------------------------------------------------- |
| 401         | `unauthorized` | No valid session. New code for the client to handle |
| 403         | `forbidden`  | Signed in, but not the organizer of this event       |
| 404         | `not_found`  | Missing, or a draft that belongs to someone else     |
| 409         | `conflict`   | The action does not fit the event's current state    |
| 422         | `validation` | A field failed validation. `fields` lists which      |

`message` is shown to the visitor as written, so keep it a plain sentence that says how to fix the problem.

## Authentication

The app has no sign-in yet. `getSession` returns a sample person from local storage. Rails replaces this with real accounts.

Because the frontend is a static site, it may live on a different origin from the API. Two workable options:

1. **Same site (preferred).** Serve the API from a subdomain of the site's custom domain and use an `HttpOnly`, `Secure`, `SameSite=Lax` session cookie. This keeps tokens out of JavaScript.
2. **Different origins (the default `github.io` setup).** Cross-site cookies are unreliable there, so use short-lived access tokens with a refresh flow, and configure `rack-cors` to allow only the Pages origin.

| Method | Path               | Purpose                            |
| ------ | ------------------ | ---------------------------------- |
| POST   | `/auth/sign_up`    | Create an account                  |
| POST   | `/auth/sign_in`    | Start a session                    |
| DELETE | `/auth/sign_out`   | End a session                      |
| POST   | `/auth/password`   | Send a password reset              |

Devise or Rails 8's built-in `has_secure_password` authentication generator both cover this. Keep API credentials in Rails encrypted credentials or environment variables, never in the frontend.

## Session and profile

| Repository method | Method and path    | Request          | Response  |
| ----------------- | ------------------ | ---------------- | --------- |
| `getSession`      | `GET /me`          |                  | `Session` |
| `updateProfile`   | `PATCH /me`        | `ProfileInput`   | `Session` |

## Events and search

| Repository method   | Method and path                 | Request                  | Response            |
| ------------------- | ------------------------------- | ------------------------ | ------------------- |
| `listEvents`        | `GET /events`                   | Query parameters below   | `EventDetails[]`    |
| `listLocations`     | `GET /events/locations`         |                          | `LocationOption[]`  |
| `getEvent`          | `GET /events/:id`               |                          | `EventDetails`      |
| `listManagedEvents` | `GET /organizer/events`         |                          | `EventDetails[]`    |
| `createEvent`       | `POST /organizer/events`        | `EventInput`, `publish`  | `EventDetails`      |
| `updateEvent`       | `PATCH /organizer/events/:id`   | `EventInput`             | `EventDetails`      |
| `updateCapacity`    | `PATCH /organizer/events/:id`   | `{ capacity }`           | `EventDetails`      |
| `publishEvent`      | `POST /organizer/events/:id/publish`   |                   | `EventDetails`      |
| `unpublishEvent`    | `POST /organizer/events/:id/unpublish` |                   | `EventDetails`      |
| `cancelEvent`       | `POST /organizer/events/:id/cancel`    | `{ reason }`      | `EventDetails`      |
| `reopenEvent`       | `POST /organizer/events/:id/reopen`    |                   | `EventDetails`      |
| `deleteEvent`       | `DELETE /organizer/events/:id`  |                          | 204                 |

`GET /events` query parameters, matching `EventQuery`:

| Parameter      | Type                                 | Notes                                                                 |
| -------------- | ------------------------------------ | --------------------------------------------------------------------- |
| `search`       | string                               | All words must match title, description, organizer, venue or address  |
| `categories[]` | `EventCategory`                      | Any of the listed categories                                          |
| `from`, `to`   | ISO timestamp                        | The client works these out in the visitor's time zone                 |
| `location`     | city, or `online`                    | `online` matches any event with an online link                        |
| `availability` | `any`, `open`, `limited`, `full`     | `limited` means at most 3 spots, or 15 percent of capacity, are left  |
| `includePast`  | boolean                              | Past events are hidden unless this is set or `from` is given          |

Sort upcoming events soonest first, then past events most recent first. Never return drafts here. PostgreSQL full-text search with a `tsvector` column, or the `pg_search` gem, fits this well.

### EventDetails example

`viewer` depends on who is asking, so do not cache this response publicly.

```json
{
  "id": "evt-bike-clinic",
  "title": "Free Bike Repair Clinic",
  "description": "Bring a bike that squeaks, slips or will not stop.",
  "category": "learning",
  "startsAt": "2026-11-08T19:00:00.000Z",
  "endsAt": "2026-11-08T22:00:00.000Z",
  "timeZone": "America/Los_Angeles",
  "venue": {
    "name": "Cascade Tool Library",
    "street": "1537 SE Division St",
    "city": "Portland",
    "region": "OR",
    "postalCode": "97202",
    "neighborhood": "Hosford-Abernethy"
  },
  "onlineUrl": null,
  "organizerId": "org-tool-library",
  "capacity": 18,
  "accessibility": {
    "features": ["step_free_entrance", "transit_nearby"],
    "notes": "The shop floor is concrete and can be noisy."
  },
  "status": "published",
  "cancellation": null,
  "coverImageUrl": "https://cdn.example.com/covers/bike.jpg",
  "coverImageAlt": "A bicycle on a repair stand.",
  "createdAt": "2026-10-09T19:00:00.000Z",
  "updatedAt": "2026-10-09T19:00:00.000Z",
  "publishedAt": "2026-10-09T19:00:00.000Z",
  "organizer": {
    "id": "org-tool-library",
    "name": "Cascade Tool Library",
    "contactEmail": "borrow@cascadetools.example.com",
    "phone": null,
    "website": "https://cascadetools.example.com",
    "bio": "Borrow a drill, learn to use it, bring it back."
  },
  "goingCount": 18,
  "waitlistCount": 4,
  "spotsLeft": 0,
  "viewer": { "rsvp": null, "saved": false, "canManage": false }
}
```

`onlineUrl` should only be returned to people who hold a spot and to the organizer. The current app hides it in the interface, but a real server has to withhold it.

## RSVPs

| Repository method  | Method and path                          | Request       | Response              |
| ------------------ | ---------------------------------------- | ------------- | --------------------- |
| `submitRsvp`       | `PUT /events/:id/rsvp`                   | `RsvpInput`   | `EventDetails`        |
| `cancelRsvp`       | `DELETE /events/:id/rsvp`                |               | `EventDetails`        |
| `listMyRsvpEvents` | `GET /me/rsvps`                          |               | `EventDetails[]`      |
| `listEventRsvps`   | `GET /organizer/events/:id/rsvps`        |               | `RsvpWithAttendee[]`  |
| `addGuest`         | `POST /organizer/events/:id/rsvps`       | `RsvpInput`   | `RsvpWithAttendee[]`  |
| `removeRsvp`       | `DELETE /organizer/rsvps/:id`            |               | 204                   |
| `promoteRsvp`      | `POST /organizer/rsvps/:id/promote`      |               | 204                   |

### Rules the server must enforce

These live in `LocalRepository` today and are covered by `localRepository.test.ts`. Port the tests along with them.

- An RSVP is `going` if the party fits, otherwise `waitlisted`.
- Only published events that have not started accept RSVPs.
- A person has at most one active RSVP per event. A second submit changes the party size, and fails with `conflict` if a larger party no longer fits.
- When a spot opens (cancel, removal, or raised capacity), the waitlist moves up in the order people joined. A party too large for the open spots is skipped, and later parties that fit move ahead of it.
- Capacity cannot go below the spots already taken.
- An event with active RSVPs cannot move back to draft.

**Concurrency is the big change.** Two people can claim the last spot at the same moment, which never happens in a single browser. Wrap each RSVP write in a transaction and lock the event row (`event.with_lock { ... }`), or the event will oversell.

## Saved events

| Repository method | Method and path            | Response         |
| ----------------- | -------------------------- | ---------------- |
| `listSavedEvents` | `GET /me/saved_events`     | `EventDetails[]` |
| `saveEvent`       | `PUT /me/saved_events/:id` | 204              |
| `unsaveEvent`     | `DELETE /me/saved_events/:id` | 204           |

## Suggested tables

| Table             | Key columns                                                                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`           | `name`, `email` (unique), auth columns                                                                                                                                                                                 |
| `organizers`      | `name`, `contact_email`, `phone`, `website`, `bio`, `owner_id`                                                                                                                                                         |
| `events`          | `organizer_id`, `title`, `description`, `category`, `starts_at`, `ends_at`, `time_zone`, venue columns (or `venue_id`), `online_url`, `capacity`, `accessibility_features` (array), `accessibility_notes`, `status`, `cancellation_reason`, `canceled_at`, `cover_image_url`, `cover_image_alt`, `published_at` |
| `rsvps`           | `event_id`, `user_id`, `party_size`, `status`. Add a partial unique index on `(event_id, user_id)` where status is not `canceled`                                                                                       |
| `saved_events`    | `user_id`, `event_id`, unique on the pair                                                                                                                                                                              |

Index `events` on `(status, starts_at)` for discovery. Compute `goingCount` with a counter or a grouped query rather than loading each RSVP.

## Connecting the frontend

1. Write `src/data/apiRepository.ts`, implementing `Repository` with `fetch`, and map error responses to `RepositoryError`.
2. Read the API address from a `VITE_API_URL` setting. That value is public, so it must not hold a secret.
3. Change the export in `src/data/index.ts`. No screen imports `LocalRepository` directly.
4. Add `unauthorized` to `RepositoryErrorCode` and send visitors to a sign-in screen when it occurs.
5. Remove the seed data and the Reset button on the profile page.
