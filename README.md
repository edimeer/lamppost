# Lamppost

A community events board. Neighbors find local events, save a spot, and put up flyers of their own. Built with React, TypeScript and Vite. It works without a backend and keeps its data in the browser, with a clear boundary for adding a Rails API later.

The look comes from the flyers taped to lampposts: each event is a sheet of colored copier paper with tear-off tabs along the bottom, and the tabs show how much room is left. Status appears as rubber stamps with words on them, so nothing depends on color alone.

## Run it locally

You need Node 22 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open the address Vite prints, usually http://localhost:5173.

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Starts the development server                   |
| `npm run build`     | Type-checks and builds the production site      |
| `npm run preview`   | Serves the production build locally             |
| `npm run lint`      | Runs oxlint, including accessibility rules      |
| `npm run typecheck` | Runs the TypeScript compiler                    |
| `npm test`          | Runs the unit tests                             |

## Build for production

```bash
npm run build
```

The site lands in `dist/`. The build also copies `index.html` to `404.html`, because GitHub Pages has no server-side routing. Without that copy, opening a link like `/my-repo/events/42` directly would show GitHub's 404 page instead of the app.

## Deploy to GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. In the repository, open **Settings**, then **Pages**, and set **Source** to **GitHub Actions**.
3. Push to `main`, or run the **Deploy to GitHub Pages** workflow by hand from the **Actions** tab.

The workflow in `.github/workflows/deploy.yml` lints, tests, builds and publishes the site.

### The base path

A project site lives under a subpath, such as `https://<user>.github.io/<repo>/`, so the app has to know that path to find its assets and routes.

**`VITE_BASE_PATH`** supplies it. No repository name is written into the code.

- In GitHub Actions it is set for you from the `actions/configure-pages` step, so renaming the repository or adding a custom domain needs no code change.
- For a build elsewhere, set it yourself. The value can be `my-repo`, `/my-repo` or `/my-repo/`. Leave it empty for a site at a domain root.

To try the subpath setup on your machine:

```bash
VITE_BASE_PATH=/my-repo/ npm run build
```

```bash
VITE_BASE_PATH=/my-repo/ npm run preview
```

Then open http://localhost:4173/my-repo/.

## Using the app

### Browse and search

- **Discover** opens on the flyer board. The tabs along the big flyer at the top are the next events, so you can jump straight to one.
- Switch between **Flyers**, **Agenda** and **Calendar** at the top of the results.
- Search covers event names, descriptions, organizers and locations.
- Filter by category, date, location and availability. On a phone, these are behind the **Filters** button.
- Filters live in the page address, so you can bookmark or share a search.
- In the calendar, use the arrow keys to move between days.

### Time zones

Times appear in your device's time zone. Use the globe button in the header to choose another one. If an event's own time zone differs from yours, its page shows the local time there too.

Organizers enter times as they will read on a clock at the event, and choose the event's time zone. The app stores the exact moment in UTC along with that zone.

### Save and RSVP

- The bookmark on a flyer saves it to **Your plans**.
- **RSVP** on an event page reserves spots for up to 6 people. When an event is full you can join the waitlist, and you move up automatically if a spot opens.
- You can change or cancel an RSVP from the event page, or add the event to your calendar.

### Create and manage events

You are the sample organizer **Alder Street Neighbors**, and you can rename it on the **Profile** page. Other groups' events are read-only.

- **Organize**, then **Create event**, opens the form with a live flyer preview. **Save draft** keeps the event private. **Publish event** puts it on the board.
- **Manage** on an event lets you publish it, move it back to draft, cancel it with a note, reopen it, or delete it.
- The same page has the capacity control and the RSVP list, where you can add guests, remove people, give a waitlisted person a spot, and download a CSV.
- Lowering capacity below the spots already taken is blocked. Raising it moves people up from the waitlist.

**Reset sample data** on the Profile page restores the original events with fresh dates.

## How data is stored

Data lives in the browser's `localStorage` under the key `lamppost:database`, as one JSON document. It survives reloads, and open tabs stay in sync. The chosen time zone is a separate preference under `lamppost:time-zone`.

- Sample data is created on first launch, with dates relative to that moment.
- If stored data cannot be read, the app keeps a copy under `lamppost:database:corrupt` and starts again from the sample data.
- If the browser blocks storage, the app keeps working in memory and shows a notice.

Screens never touch storage directly. This is the layering:

```text
pages and components
        |
hooks/queries.ts        (React Query: caching, loading and error state)
        |
data/repository.ts      (the interface: every operation the app can perform)
        |
data/localRepository.ts (today: rules and storage in the browser)
data/apiRepository.ts   (later: HTTP calls to Rails)
```

`LocalRepository` deliberately behaves like a server. It enforces permissions and the waitlist rules, adds a short delay so loading states are real, and throws the same `RepositoryError` an API client would.

## The future Rails API

[docs/rails-api.md](docs/rails-api.md) lists every endpoint, data shape, error format and server rule the backend needs, including authentication, event management, search and RSVPs. Replacing local storage means writing one `ApiRepository` class and changing the export in `src/data/index.ts`.

## Project structure

```text
src/
  data/                 Types, repository interface, local storage version, seed data
  lib/                  Pure logic: time zones, formatting, validation, filters, exports
  hooks/queries.ts      React Query hooks for every read and write
  context/              Time zone and toast providers
  components/
    ui/                 Fields, dialogs, loading, empty and error states
    layout/             App shell and navigation
    events/             Flyers, calendar, agenda, filters, RSVP
    organizer/          Event form and RSVP list
  pages/                One file per route
public/covers/          Sample cover illustrations
docs/rails-api.md       Backend contract
```

## Current limitations

- There are no accounts. One browser is one person, and RSVPs are not shared between people or devices.
- Nothing sends email, so waitlist moves and cancellations are shown in the app only.
- Online links are hidden in the interface until you hold a spot, but anyone can read them in browser storage. A real server must withhold them.
- Cover images are links only. There is no upload.
- Dates and copy are English (en-US).
- Events are single occurrences, with no recurring series, and run for at most 24 hours.
- Sample event dates are set once, so they drift into the past over time. **Reset sample data** refreshes them.
