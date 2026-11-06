import { addDays, fromWallClock, toWallClock, weekdayOf } from '../lib/time'
import type {
  AccessibilityFeature,
  Attendee,
  CommunityEvent,
  EventCategory,
  Organizer,
  PublicationStatus,
  Rsvp,
  Venue,
} from './types'

/**
 * Sample data for first launch. Dates are worked out from the moment the data
 * is created, so there are always events today, this weekend and next month no
 * matter when someone opens the app.
 */

export interface Database {
  version: number
  events: CommunityEvent[]
  organizers: Organizer[]
  attendees: Attendee[]
  rsvps: Rsvp[]
  savedEventIds: string[]
  sessionAttendeeId: string
  sessionOrganizerId: string
}

export const DATABASE_VERSION = 2

const PACIFIC = 'America/Los_Angeles'
const YOU_ATTENDEE_ID = 'att-you'
const YOU_ORGANIZER_ID = 'org-alder-street'
const SAMPLE_PROFILE = { name: 'Edi', email: 'edi@example.com' }

const organizers: Organizer[] = [
  {
    id: YOU_ORGANIZER_ID,
    name: 'Alder Street Neighbors',
    contactEmail: 'hello@alderstreetneighbors.example.com',
    phone: '(503) 555-0142',
    website: 'https://alderstreetneighbors.example.com',
    bio: 'A volunteer group of about 200 households in Buckman. We run block meetings, potlucks and repair days.',
  },
  {
    id: 'org-fern-hill',
    name: 'Fern Hill Makers Co-op',
    contactEmail: 'studio@fernhillmakers.example.com',
    phone: '(503) 555-0178',
    website: 'https://fernhillmakers.example.com',
    bio: 'A member-run studio with a ceramics room, wood shop and print bench. Classes are open to everyone.',
  },
  {
    id: 'org-tool-library',
    name: 'Cascade Tool Library',
    contactEmail: 'borrow@cascadetools.example.com',
    phone: null,
    website: 'https://cascadetools.example.com',
    bio: 'Borrow a drill, learn to use it, bring it back. Over 3,000 tools and a crew of volunteer fixers.',
  },
  {
    id: 'org-trail-keepers',
    name: 'Clark County Trail Keepers',
    contactEmail: 'crew@trailkeepers.example.com',
    phone: '(360) 555-0119',
    website: null,
    bio: 'Volunteers who look after trails and creek banks across southwest Washington.',
  },
  {
    id: 'org-peninsula-kitchen',
    name: 'Peninsula Community Kitchen',
    contactEmail: 'kitchen@peninsulakitchen.example.com',
    phone: '(503) 555-0163',
    website: 'https://peninsulakitchen.example.com',
    bio: 'A shared kitchen in St. Johns. We cook meals, stock community fridges and teach preserving.',
  },
  {
    id: 'org-little-bridge',
    name: 'Little Bridge Families',
    contactEmail: 'hi@littlebridge.example.com',
    phone: null,
    website: 'https://littlebridge.example.com',
    bio: 'Parents and caregivers in Sellwood who organize low-cost activities for kids under 10.',
  },
  {
    id: 'org-southeast-sing',
    name: 'Southeast Sing',
    contactEmail: 'sing@southeastsing.example.com',
    phone: null,
    website: 'https://southeastsing.example.com',
    bio: 'A no-audition community choir and live music series. If you can hum, you can join.',
  },
  {
    id: 'org-caregivers',
    name: 'Mountain West Caregivers Network',
    contactEmail: 'support@mwcaregivers.example.com',
    phone: '(208) 555-0126',
    website: 'https://mwcaregivers.example.com',
    bio: 'Free online workshops for people looking after a parent, partner or friend.',
  },
  {
    id: 'org-stitch',
    name: 'Stitch Together',
    contactEmail: 'team@stitchtogether.example.com',
    phone: null,
    website: 'https://stitchtogether.example.com',
    bio: 'A Toronto knitting circle that went online in 2020 and kept every member.',
  },
]

interface SeedVenue {
  venue: Venue
  features: AccessibilityFeature[]
  notes: string
}

const venues = {
  commons: {
    venue: {
      name: 'Alder Street Commons',
      street: '2114 SE Alder St',
      city: 'Portland',
      region: 'OR',
      postalCode: '97214',
      neighborhood: 'Buckman',
    },
    features: ['step_free_entrance', 'accessible_restroom', 'seating_available', 'transit_nearby'],
    notes: 'Use the ramp on the 22nd Ave side. The number 15 bus stops one block away.',
  },
  grange: {
    venue: {
      name: 'Peninsula Grange Hall',
      street: '8818 N Syracuse St',
      city: 'Portland',
      region: 'OR',
      postalCode: '97203',
      neighborhood: 'St. Johns',
    },
    features: ['step_free_entrance', 'accessible_restroom', 'seating_available', 'assistive_listening'],
    notes: 'Assistive listening headsets are at the front desk. The hall gets loud during dancing, and the side room stays quiet.',
  },
  fernHill: {
    venue: {
      name: 'Fern Hill Makers Studio',
      street: '4120 NE Fremont St, Unit B',
      city: 'Portland',
      region: 'OR',
      postalCode: '97212',
      neighborhood: 'Beaumont',
    },
    features: ['step_free_entrance', 'accessible_restroom', 'accessible_parking'],
    notes: 'Wheel stations can be adjusted for seated use. Ask when you arrive and we will set one up.',
  },
  toolLibrary: {
    venue: {
      name: 'Cascade Tool Library',
      street: '1537 SE Division St',
      city: 'Portland',
      region: 'OR',
      postalCode: '97202',
      neighborhood: 'Hosford-Abernethy',
    },
    features: ['step_free_entrance', 'transit_nearby'],
    notes: 'The shop floor is concrete and can be noisy. Ear protection is available to borrow.',
  },
  library: {
    venue: {
      name: 'Sellwood Reading Room',
      street: '7860 SE 13th Ave',
      city: 'Portland',
      region: 'OR',
      postalCode: '97202',
      neighborhood: 'Sellwood',
    },
    features: ['step_free_entrance', 'accessible_restroom', 'seating_available', 'quiet_space', 'service_animals_welcome'],
    notes: 'An elevator goes to the lower level. A quiet corner stays open throughout.',
  },
  schoolhouse: {
    venue: {
      name: 'Old Cedar Schoolhouse',
      street: '12465 SW Farmington Rd',
      city: 'Beaverton',
      region: 'OR',
      postalCode: '97005',
      neighborhood: 'Central Beaverton',
    },
    features: ['step_free_entrance', 'accessible_restroom', 'accessible_parking', 'seating_available'],
    notes: 'Reserved wheelchair seating is in the front row.',
  },
  waterfront: {
    venue: {
      name: 'Columbia Landing Park',
      street: '100 Columbia Way',
      city: 'Vancouver',
      region: 'WA',
      postalCode: '98660',
      neighborhood: 'Waterfront',
    },
    features: ['step_free_entrance', 'accessible_parking', 'service_animals_welcome'],
    notes: 'The riverside path is paved and level. Portable accessible restrooms are by the east lot.',
  },
  riverfront: {
    venue: {
      name: 'Kellogg Creek Pavilion',
      street: '10600 SE McLoughlin Blvd',
      city: 'Milwaukie',
      region: 'OR',
      postalCode: '97222',
      neighborhood: 'Downtown Milwaukie',
    },
    features: ['step_free_entrance', 'seating_available', 'transit_nearby'],
    notes: 'A two-minute walk from the MAX Orange Line. Benches every 200 feet along the path.',
  },
  orchard: {
    venue: {
      name: 'Pine Grove Orchard Barn',
      street: '3380 Tucker Rd',
      city: 'Hood River',
      region: 'OR',
      postalCode: '97031',
      neighborhood: null,
    },
    features: ['accessible_parking', 'seating_available'],
    notes: 'The barn floor is packed gravel. Paved parking sits right beside the door.',
  },
  lacamas: {
    venue: {
      name: 'Lacamas Creek Trailhead',
      street: '2700 NE Everett St',
      city: 'Camas',
      region: 'WA',
      postalCode: '98607',
      neighborhood: null,
    },
    features: ['accessible_parking', 'service_animals_welcome'],
    notes: 'Work sites are on uneven dirt trail. A paved check-in table is at the trailhead if you would rather help from there.',
  },
  annex: {
    venue: {
      name: 'Multnomah Commons East Annex, Building C, Second Floor Community Room',
      street: '18400 Southeast Stark Street at the corner of Northeast 184th Avenue, Enter Through the Courtyard Gate',
      city: 'Gresham',
      region: 'OR',
      postalCode: '97233',
      neighborhood: 'Rockwood',
    },
    features: ['step_free_entrance', 'accessible_restroom', 'asl_interpretation', 'assistive_listening', 'seating_available'],
    notes: 'Take the elevator beside the courtyard gate. ASL interpreters will be at the stage all evening.',
  },
} satisfies Record<string, SeedVenue>

type When =
  | { days: number; at: string }
  | { weekday: number; week: number; at: string }
  | { minutesFromNow: number }

interface SeedEvent {
  id: string
  title: string
  category: EventCategory
  when: When
  minutes: number
  place: SeedVenue | null
  organizerId: string
  capacity: number
  going: number
  waitlist?: number
  description: string
  onlineUrl?: string
  timeZone?: string
  status?: PublicationStatus
  cancelReason?: string
  features?: AccessibilityFeature[]
  notes?: string
  cover?: { file: string; alt: string }
}

const SAT = 6
const SUN = 0
const TUE = 2
const WED = 3
const THU = 4
const FRI = 5

const seedEvents: SeedEvent[] = [
  // Past
  {
    id: 'evt-harvest-potluck',
    title: 'Harvest Potluck at the Commons',
    category: 'neighborhood',
    when: { days: -12, at: '17:30' },
    minutes: 150,
    place: venues.commons,
    organizerId: YOU_ORGANIZER_ID,
    capacity: 60,
    going: 47,
    description:
      'Our autumn potluck for anyone on or near Alder Street. Bring a dish to share and a label listing what is in it. We will supply plates, cider and a very long table.',
  },
  {
    id: 'evt-bulb-planting',
    title: 'Fall Bulb Planting Day',
    category: 'volunteering',
    when: { days: -20, at: '10:00' },
    minutes: 180,
    place: venues.riverfront,
    organizerId: 'org-trail-keepers',
    capacity: 30,
    going: 22,
    description:
      'We planted 2,000 daffodil bulbs along the Kellogg Creek path. Thanks to everyone who came out, and watch for them in March.',
  },
  {
    id: 'evt-grange-open-mic',
    title: 'Open Mic at the Grange',
    category: 'music',
    when: { days: -6, at: '19:00' },
    minutes: 180,
    place: venues.grange,
    organizerId: 'org-southeast-sing',
    capacity: 80,
    going: 63,
    description:
      'Ten-minute slots for songs, poems and the occasional accordion. Sign-up sheet opened at 6:30.',
  },

  // Right now and today
  {
    id: 'evt-noon-stretch',
    title: 'Gentle Stretch in the Park',
    category: 'wellness',
    when: { minutesFromNow: -20 },
    minutes: 90,
    place: venues.riverfront,
    organizerId: 'org-little-bridge',
    capacity: 25,
    going: 14,
    description:
      'A slow, seated-or-standing stretch session under the pavilion. Bring water and anything that helps you stay comfortable. No experience needed.',
  },
  {
    id: 'evt-board-games',
    title: 'Board Game Night',
    category: 'neighborhood',
    when: { minutesFromNow: 180 },
    minutes: 150,
    place: venues.commons,
    organizerId: YOU_ORGANIZER_ID,
    capacity: 32,
    going: 21,
    description:
      'Tables of Catan, Codenames and whatever else people bring. Someone will always explain the rules. Tea and snacks by donation.',
  },

  // This weekend
  {
    id: 'evt-buckman-market',
    title: 'Buckman Saturday Market',
    category: 'food',
    when: { weekday: SAT, week: 0, at: '09:00' },
    minutes: 300,
    place: venues.commons,
    organizerId: YOU_ORGANIZER_ID,
    capacity: 400,
    going: 186,
    description:
      'Thirty stalls of late-season produce, bread, honey and hot food, all from within a hundred miles. SNAP match tokens are available at the info tent, and the first 50 kids get a free apple.',
    cover: { file: 'market', alt: 'Illustration of three market stalls with striped awnings and piles of produce.' },
  },
  {
    id: 'evt-birding-walk',
    title: 'Beginner Birding Walk at Lacamas Creek',
    category: 'outdoors',
    when: { weekday: SAT, week: 0, at: '08:00' },
    minutes: 120,
    place: venues.lacamas,
    organizerId: 'org-trail-keepers',
    capacity: 16,
    going: 13,
    description:
      'An easy two-mile loop with a volunteer naturalist. We have binoculars to lend. Winter ducks are arriving, so expect buffleheads and maybe a kingfisher.',
  },
  {
    id: 'evt-paper-lanterns',
    title: 'Story Hour and Paper Lanterns',
    category: 'family',
    when: { weekday: SAT, week: 0, at: '14:00' },
    minutes: 90,
    place: venues.library,
    organizerId: 'org-little-bridge',
    capacity: 24,
    going: 12,
    description:
      'Two picture books read aloud, then everyone folds and decorates a paper lantern to take home. Best for ages 3 to 8. Grown-ups stay and help.',
  },
  {
    id: 'evt-sunday-choir',
    title: 'Sunday Community Choir: Open Rehearsal',
    category: 'music',
    when: { weekday: SUN, week: 0, at: '15:00' },
    minutes: 105,
    place: venues.grange,
    organizerId: 'org-southeast-sing',
    capacity: 70,
    going: 41,
    description:
      'Come and try the choir. We learn by ear, in parts, with no audition and no sheet music. This term we are singing harmonies from Georgia, Ghana and the Appalachians.',
    cover: { file: 'choir', alt: 'Illustration of five singers standing in a curved row with their mouths open in song.' },
  },
  {
    id: 'evt-bike-clinic',
    title: 'Free Bike Repair Clinic',
    category: 'learning',
    when: { weekday: SUN, week: 0, at: '11:00' },
    minutes: 180,
    place: venues.toolLibrary,
    organizerId: 'org-tool-library',
    capacity: 18,
    going: 18,
    waitlist: 4,
    description:
      'Bring a bike that squeaks, slips or will not stop. A volunteer mechanic works alongside you so you leave knowing how to do it yourself. Parts at cost.',
    cover: { file: 'bike', alt: 'Illustration of a bicycle seen from the side.' },
  },

  // Next week
  {
    id: 'evt-wheel-throwing',
    title: 'Intro to Wheel Throwing',
    category: 'arts',
    when: { weekday: TUE, week: 1, at: '18:30' },
    minutes: 150,
    place: venues.fernHill,
    organizerId: 'org-fern-hill',
    capacity: 8,
    going: 8,
    waitlist: 3,
    description:
      'Learn to center clay and pull your first walls on the wheel. Each person makes two pieces, and we glaze and fire the one you like best. Wear clothes that can get muddy.',
    cover: { file: 'pottery', alt: 'Illustration of a tall yellow vase and a wide green bowl on a shelf.' },
  },
  {
    id: 'evt-seed-swap',
    title: 'Seed Swap and Winter Garden Planning',
    category: 'outdoors',
    when: { weekday: WED, week: 1, at: '18:00' },
    minutes: 120,
    place: venues.library,
    organizerId: 'org-little-bridge',
    capacity: 40,
    going: 19,
    description:
      'Trade saved seeds, compare notes on what worked this year and plan a shared bed for spring. Nothing to trade? Come anyway: there are always extras.',
    cover: { file: 'garden', alt: 'Illustration of a row of pink seedlings growing under a yellow sun.' },
  },
  {
    id: 'evt-emergency-prep',
    title: 'Two Weeks Ready: Neighborhood Emergency Prep',
    category: 'learning',
    when: { weekday: THU, week: 1, at: '19:00' },
    minutes: 90,
    place: venues.commons,
    organizerId: YOU_ORGANIZER_ID,
    capacity: 50,
    going: 29,
    description:
      'A trained neighborhood responder walks through what to store, how to shut off your gas, and how our block will check on each other after an earthquake. Everyone leaves with a printed plan.',
  },
  {
    id: 'evt-yoga-waterfront',
    title: 'Sunrise Yoga on the Waterfront',
    category: 'wellness',
    when: { weekday: SAT, week: 1, at: '07:30' },
    minutes: 60,
    place: venues.waterfront,
    organizerId: 'org-trail-keepers',
    capacity: 30,
    going: 26,
    description:
      'All levels welcome, with chair options for every pose. Bring a mat and a warm layer. We stay on the covered deck if it rains.',
  },
  {
    id: 'evt-fridge-restock',
    title: 'Community Fridge Restock and Sort',
    category: 'volunteering',
    when: { weekday: FRI, week: 1, at: '16:00' },
    minutes: 90,
    place: venues.grange,
    organizerId: 'org-peninsula-kitchen',
    capacity: 12,
    going: 7,
    description:
      'Help sort donations, check dates and restock the three St. Johns fridges. Light lifting, some walking, and a pot of soup at the end.',
  },
  {
    id: 'evt-riverside-cleanup',
    title: 'Vancouver Waterfront Cleanup',
    category: 'volunteering',
    when: { weekday: SUN, week: 1, at: '10:00' },
    minutes: 150,
    place: venues.waterfront,
    organizerId: 'org-trail-keepers',
    capacity: 60,
    going: 34,
    description:
      'Gloves, grabbers and bags provided. We split into crews by the east lot and finish with coffee from the Trail Keepers urn.',
  },

  // Later this month
  {
    id: 'evt-schoolhouse-film',
    title: 'Film Night at the Schoolhouse: Neighborhood Shorts',
    category: 'arts',
    when: { weekday: FRI, week: 2, at: '19:00' },
    minutes: 120,
    place: venues.schoolhouse,
    organizerId: 'org-fern-hill',
    capacity: 90,
    going: 52,
    description:
      'Twelve short films made by people who live within ten miles, none longer than eight minutes. All films are open captioned. Popcorn is free, and the filmmakers stay for questions.',
    features: ['step_free_entrance', 'accessible_restroom', 'accessible_parking', 'seating_available', 'live_captions'],
    cover: { file: 'film', alt: 'Illustration of an audience seen from behind, facing a bright screen.' },
  },
  {
    id: 'evt-cider-press',
    title: 'Cider Press Day at Pine Grove',
    category: 'food',
    when: { weekday: SAT, week: 2, at: '11:00' },
    minutes: 240,
    place: venues.orchard,
    organizerId: 'org-peninsula-kitchen',
    capacity: 75,
    going: 58,
    description:
      'Bring clean jugs and take home fresh-pressed cider. Bins of Newtown Pippins are provided, and kids can turn the crank on the small press. Chili and cornbread available for purchase.',
  },
  {
    id: 'evt-sketch-walk',
    title: 'Milwaukie Riverfront Sketch Walk',
    category: 'arts',
    when: { weekday: SUN, week: 2, at: '13:00' },
    minutes: 120,
    place: venues.riverfront,
    organizerId: 'org-fern-hill',
    capacity: 15,
    going: 15,
    description:
      'A slow walk with three stops to draw the river, the bridge and each other. Paper and pencils provided. Nobody looks at your sketchbook unless you offer.',
  },
  {
    id: 'evt-repair-cafe',
    title: 'Repair Cafe: Bring It Broken',
    category: 'learning',
    when: { weekday: SAT, week: 3, at: '10:00' },
    minutes: 240,
    place: venues.commons,
    organizerId: YOU_ORGANIZER_ID,
    capacity: 45,
    going: 38,
    description:
      'Lamps, zippers, toasters and wobbly chairs: volunteer fixers will help you repair them for free. One item per person until noon so everybody gets a turn.',
  },
  {
    id: 'evt-tenant-rights',
    title: 'Tenant Rights Q&A',
    category: 'neighborhood',
    when: { weekday: WED, week: 2, at: '18:30' },
    minutes: 90,
    place: venues.grange,
    organizerId: 'org-peninsula-kitchen',
    capacity: 60,
    going: 23,
    description:
      'Volunteer legal aid staff explain Oregon rules on rent increases, repairs and deposits, then take questions. This is general information, not individual legal advice. Spanish interpretation provided.',
  },
  {
    id: 'evt-salsa-grange',
    title: 'Salsa Night with Live Band',
    category: 'music',
    when: { weekday: SAT, week: 2, at: '19:30' },
    minutes: 270,
    place: venues.grange,
    organizerId: 'org-southeast-sing',
    capacity: 120,
    going: 88,
    description:
      'A 30-minute beginner lesson, then Orquesta del Puente plays until midnight. No partner needed. Suggested donation is $10, and nobody is turned away.',
  },
  {
    id: 'evt-storytelling-festival',
    title:
      'Third Annual Southeast Portland Intergenerational Storytelling Festival, Potluck Supper and Community Quilt Unveiling',
    category: 'arts',
    when: { weekday: SAT, week: 3, at: '16:00' },
    minutes: 240,
    place: venues.annex,
    organizerId: 'org-little-bridge',
    capacity: 150,
    going: 96,
    description:
      'For three years, neighbors from 8 to 88 have been recording stories about the streets they grew up on. This year 14 of them take the stage.\n\nThe evening runs in three parts. First, an hour of short stories told live, each paired with a square of the community quilt. Next, a potluck supper in the courtyard room. Please bring a dish that means something to your family, and a card with its story if you like. Last, we unveil the finished quilt, which took 61 people and eleven months to make.\n\nASL interpretation runs throughout, and recordings go to the Rockwood archive afterward. If you would rather not appear in photos, pick up a blue lanyard at check-in.',
  },

  // Next month and beyond
  {
    id: 'evt-makers-market',
    title: 'Winter Makers Market',
    category: 'food',
    when: { weekday: SAT, week: 4, at: '10:00' },
    minutes: 360,
    place: venues.schoolhouse,
    organizerId: 'org-fern-hill',
    capacity: 300,
    going: 112,
    description:
      'Handmade gifts from 45 local makers: ceramics, prints, wool, jam and more. Live fiddle music at noon. Entry is free, and registering helps us plan for the crowd.',
  },
  {
    id: 'evt-youth-jazz',
    title: 'Youth Jazz Ensemble Winter Concert',
    category: 'music',
    when: { weekday: FRI, week: 4, at: '19:00' },
    minutes: 90,
    place: venues.schoolhouse,
    organizerId: 'org-southeast-sing',
    capacity: 110,
    going: 67,
    description:
      'Twenty-two young musicians from three middle schools play Ellington, Mingus and two pieces they wrote themselves. Pay what you can.',
  },
  {
    id: 'evt-trail-work',
    title: 'Trail Work Party at Lacamas Creek',
    category: 'outdoors',
    when: { weekday: SAT, week: 5, at: '09:00' },
    minutes: 240,
    place: venues.lacamas,
    organizerId: 'org-trail-keepers',
    capacity: 20,
    going: 9,
    description:
      'We are clearing drains and resurfacing a muddy stretch of the lower loop. Tools and training provided. Wear boots and bring lunch.',
  },
  {
    id: 'evt-solstice-bonfire',
    title: 'Winter Solstice Bonfire and Cocoa',
    category: 'outdoors',
    when: { weekday: SUN, week: 6, at: '16:30' },
    minutes: 150,
    place: venues.orchard,
    organizerId: 'org-peninsula-kitchen',
    capacity: 100,
    going: 44,
    description:
      'Mark the longest night with a fire in the orchard, cocoa, and songs led by anyone who wants to. Dress warmly and bring a mug.',
  },
  {
    id: 'evt-new-year-block',
    title: 'New Year Block Party Planning',
    category: 'neighborhood',
    when: { weekday: TUE, week: 8, at: '18:30' },
    minutes: 60,
    place: venues.commons,
    organizerId: YOU_ORGANIZER_ID,
    capacity: 25,
    going: 3,
    description:
      'A short meeting to choose a date, find a street closure captain and split up the jobs for the spring block party.',
  },

  // Online
  {
    id: 'evt-caregiver-medicare',
    title: 'Medicare Basics for Family Caregivers',
    category: 'learning',
    when: { weekday: WED, week: 1, at: '13:00' },
    minutes: 60,
    place: null,
    onlineUrl: 'https://meet.example.com/mwcaregivers-medicare',
    timeZone: 'America/Boise',
    organizerId: 'org-caregivers',
    capacity: 200,
    going: 74,
    description:
      'A plain-language walk through the parts of Medicare, what enrollment periods mean, and where to ask for free help. Live captions are on, and the recording goes out to everyone who registers.',
    features: ['live_captions'],
    notes: 'Slides are shared the day before so you can follow along with a screen reader.',
  },
  {
    id: 'evt-knit-along',
    title: 'Online Knit-Along: Your First Hat',
    category: 'arts',
    when: { weekday: THU, week: 2, at: '20:00' },
    minutes: 90,
    place: null,
    onlineUrl: 'https://meet.example.com/stitch-together-hat',
    timeZone: 'America/Toronto',
    organizerId: 'org-stitch',
    capacity: 40,
    going: 37,
    description:
      'We cast on together and knit a simple ribbed hat at a relaxed pace. You need size 8 circular needles and a ball of worsted yarn. Cameras optional.',
    features: ['live_captions'],
    notes: 'Instructions are also available in large print and as a text file.',
  },
  {
    id: 'evt-spanish-circle',
    title: 'Spanish Conversation Circle for Beginners',
    category: 'learning',
    when: { weekday: TUE, week: 2, at: '18:00' },
    minutes: 75,
    place: venues.library,
    onlineUrl: 'https://meet.example.com/sellwood-spanish',
    organizerId: 'org-little-bridge',
    capacity: 20,
    going: 11,
    description:
      'Practice in small groups, in the room or on a video call. Led by two volunteer teachers. We pick one topic each week, and this week it is food.',
  },

  // Canceled
  {
    id: 'evt-lantern-walk',
    title: 'Lantern Walk Along the River',
    category: 'family',
    when: { weekday: FRI, week: 0, at: '17:00' },
    minutes: 90,
    place: venues.riverfront,
    organizerId: YOU_ORGANIZER_ID,
    capacity: 80,
    going: 31,
    status: 'canceled',
    cancelReason:
      'High winds are forecast and the park has closed the river path. We will share a new date on this page when we have one.',
    description:
      'Bring a lantern or borrow one of ours and walk the river path at dusk. The whole route takes about 45 minutes and suits strollers.',
  },
  {
    id: 'evt-fish-fry',
    title: 'Fish Fry Fundraiser',
    category: 'food',
    when: { weekday: FRI, week: 3, at: '17:00' },
    minutes: 180,
    place: venues.grange,
    organizerId: 'org-peninsula-kitchen',
    capacity: 100,
    going: 40,
    status: 'canceled',
    cancelReason: 'Our main fryer failed its inspection. Anyone who prepaid will get a refund within a week.',
    description:
      'Fried cod, slaw and hush puppies to raise money for the kitchen roof. Take-out available from the side door.',
  },

  // Drafts
  {
    id: 'evt-clothing-drive',
    title: 'Winter Clothing Drive Sorting Party',
    category: 'volunteering',
    when: { weekday: SAT, week: 3, at: '13:00' },
    minutes: 150,
    place: venues.commons,
    organizerId: YOU_ORGANIZER_ID,
    capacity: 20,
    going: 0,
    status: 'draft',
    description:
      'Help us sort coats, boots and blankets by size before they go out to shelters in the area. Snacks provided.',
  },
  {
    id: 'evt-new-neighbor',
    title: 'New Neighbor Welcome Breakfast',
    category: 'neighborhood',
    when: { weekday: SUN, week: 4, at: '09:30' },
    minutes: 90,
    place: venues.commons,
    organizerId: YOU_ORGANIZER_ID,
    capacity: 30,
    going: 0,
    status: 'draft',
    description:
      'Moved here in the last year? Come for pancakes and meet the people on your block. We will have maps and a list of who to call for what.',
  },
]

/** The sample visitor's own RSVPs and saved events, so "Your plans" is not empty. */
const yourRsvps: { eventId: string; partySize: number; status: Rsvp['status'] }[] = [
  { eventId: 'evt-paper-lanterns', partySize: 2, status: 'going' },
  { eventId: 'evt-seed-swap', partySize: 1, status: 'going' },
  { eventId: 'evt-wheel-throwing', partySize: 1, status: 'waitlisted' },
  { eventId: 'evt-lantern-walk', partySize: 2, status: 'going' },
  { eventId: 'evt-grange-open-mic', partySize: 1, status: 'going' },
]

const yourSavedEvents = ['evt-sunday-choir', 'evt-cider-press', 'evt-knit-along', 'evt-fish-fry']

const FIRST_NAMES = [
  'Ada', 'Amara', 'Andre', 'Beatriz', 'Caleb', 'Chiara', 'Dae-jung', 'Dana', 'Darnell', 'Elif',
  'Emeka', 'Farah', 'Felix', 'Grace', 'Hana', 'Hector', 'Imani', 'Ivan', 'Jamal', 'Jin',
  'Joaquin', 'Kai', 'Keiko', 'Lakshmi', 'Leah', 'Lucia', 'Malik', 'Maren', 'Mateo', 'Mei',
  'Nadia', 'Noah', 'Nora', 'Omar', 'Oksana', 'Paolo', 'Quinn', 'Rashida', 'Ravi', 'Rosa',
  'Samir', 'Sofia', 'Tariq', 'Thea', 'Tomas', 'Uma', 'Vera', 'Wendell', 'Yara', 'Zoe',
]

const LAST_NAMES = [
  'Abara', 'Alvarez', 'Bergstrom', 'Bianchi', 'Cho', 'Costa', 'Delgado', 'Dube', 'Eriksen', 'Fitzgerald',
  'Fong', 'Garcia', 'Haddad', 'Hansen', 'Ibarra', 'Iyer', 'Jackson', 'Kaplan', 'Kim', 'Kowalski',
  'Larsen', 'Le', 'Mbeki', 'Mendoza', 'Morales', 'Nakamura', 'Nguyen', 'Novak', 'Okafor', 'Olsen',
  'Park', 'Patel', 'Petrov', 'Quintero', 'Reyes', 'Rossi', 'Sato', 'Schmidt', 'Silva', 'Singh',
  'Tanaka', 'Thompson', 'Tran', 'Vargas', 'Vu', 'Walker', 'Whitehorse', 'Wright', 'Yilmaz', 'Zhang',
]

/** A small repeatable random number generator, so sample data is the same every time. */
function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function resolveStart(when: When, timeZone: string, now: Date): Date {
  if ('minutesFromNow' in when) {
    const rounded = Math.round(now.getTime() / 300000) * 300000
    return new Date(rounded + when.minutesFromNow * 60000)
  }
  const today = toWallClock(now, timeZone).date
  if ('days' in when) {
    return fromWallClock({ date: addDays(today, when.days), time: when.at }, timeZone)
  }
  const daysUntil = (when.weekday - weekdayOf(today) + 7) % 7
  const start = fromWallClock(
    { date: addDays(today, daysUntil + when.week * 7), time: when.at },
    timeZone,
  )
  // If today is that weekday and the time has gone by, use next week instead.
  return start > now ? start : new Date(start.getTime() + 7 * 86400000)
}

function seedOneEvent(seed: SeedEvent, now: Date): CommunityEvent {
  const timeZone = seed.timeZone ?? PACIFIC
  const startsAt = resolveStart(seed.when, timeZone, now)
  const endsAt = new Date(startsAt.getTime() + seed.minutes * 60000)
  const status = seed.status ?? 'published'
  const createdAt = new Date(startsAt.getTime() - 30 * 86400000).toISOString()

  return {
    id: seed.id,
    title: seed.title,
    description: seed.description,
    category: seed.category,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    timeZone,
    venue: seed.place?.venue ?? null,
    onlineUrl: seed.onlineUrl ?? null,
    organizerId: seed.organizerId,
    capacity: seed.capacity,
    accessibility: {
      features: seed.features ?? seed.place?.features ?? [],
      notes: seed.notes ?? seed.place?.notes ?? '',
    },
    status,
    cancellation:
      status === 'canceled'
        ? { reason: seed.cancelReason ?? '', canceledAt: now.toISOString() }
        : null,
    coverImageUrl: seed.cover ? `covers/${seed.cover.file}.svg` : null,
    coverImageAlt: seed.cover?.alt ?? null,
    createdAt,
    updatedAt: createdAt,
    publishedAt: status === 'draft' ? null : createdAt,
  }
}

/**
 * Brings data saved by an older version of the app up to date. Sample data is
 * copied into each browser on first visit, so changing it above only reaches new
 * visitors. Everyone else gets this step, which keeps their RSVPs and events.
 */
export function upgradeDatabase(database: Database): Database {
  if (database.version < 2) {
    const you = database.attendees.find((a) => a.id === database.sessionAttendeeId)
    // Replace only the old sample profile, never a name someone typed in.
    if (you?.name === 'Jordan Lee' && you.email === 'jordan.lee@example.com') {
      Object.assign(you, SAMPLE_PROFILE)
    }
  }
  return { ...database, version: DATABASE_VERSION }
}

export function buildSeedDatabase(now: Date = new Date()): Database {
  const random = createRandom(20261107)
  const attendees: Attendee[] = [
    { id: YOU_ATTENDEE_ID, ...SAMPLE_PROFILE },
  ]
  const rsvps: Rsvp[] = []
  const pick = (list: string[]) => list[Math.floor(random() * list.length)]

  const addAttendee = (): Attendee => {
    const first = pick(FIRST_NAMES)
    const last = pick(LAST_NAMES)
    const handle = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '')
    const attendee: Attendee = {
      id: `att-${attendees.length}`,
      name: `${first} ${last}`,
      email: `${handle}${attendees.length}@example.com`,
    }
    attendees.push(attendee)
    return attendee
  }

  const events = seedEvents.map((seed) => {
    const event = seedOneEvent(seed, now)
    const yours = yourRsvps.find((rsvp) => rsvp.eventId === seed.id)
    const reservedByYou = yours?.status === 'going' ? yours.partySize : 0
    let spotsToFill = seed.going - reservedByYou
    let order = 0

    const addRsvp = (status: Rsvp['status'], partySize: number, attendeeId: string) => {
      order += 1
      // Earlier RSVPs came in earlier, spread over the month before the event.
      const at = new Date(
        new Date(event.createdAt).getTime() + order * 3 * 3600000,
      ).toISOString()
      rsvps.push({
        id: `rsvp-${seed.id}-${order}`,
        eventId: seed.id,
        attendeeId,
        partySize,
        status,
        createdAt: at,
        updatedAt: at,
      })
    }

    while (spotsToFill > 0) {
      const roll = random()
      const partySize = Math.min(spotsToFill, roll > 0.9 ? 3 : roll > 0.65 ? 2 : 1)
      addRsvp('going', partySize, addAttendee().id)
      spotsToFill -= partySize
    }
    for (let i = 0; i < (seed.waitlist ?? 0); i += 1) {
      addRsvp('waitlisted', 1, addAttendee().id)
    }
    if (yours) addRsvp(yours.status, yours.partySize, YOU_ATTENDEE_ID)
    return event
  })

  return {
    version: DATABASE_VERSION,
    events,
    organizers: organizers.map((organizer) => ({ ...organizer })),
    attendees,
    rsvps,
    savedEventIds: [...yourSavedEvents],
    sessionAttendeeId: YOU_ATTENDEE_ID,
    sessionOrganizerId: YOU_ORGANIZER_ID,
  }
}
