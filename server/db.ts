import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type {
  BookingRecord,
  BookingUpdate,
  CircuitDetail,
  CircuitSummary,
  DarshanSlot,
  EmailDispatchRecord,
  ItineraryDay,
  StayOption,
  TempleDirectoryEntry,
  TrainClassOption,
  TrainRoute,
} from '../src/types/pilgrimage.ts';
import { buildTicketEmailHtml } from './email.ts';
import { VERIFIED_TEMPLES_SEED } from './templesSeed.ts';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'teerthsutra.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS circuits (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    region TEXT NOT NULL,
    deity TEXT NOT NULL,
    temples_json TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    booking_status TEXT NOT NULL,
    window_label TEXT NOT NULL,
    window_opens_at TEXT NOT NULL,
    slots_total INTEGER NOT NULL,
    slots_remaining INTEGER NOT NULL,
    price_seva INTEGER NOT NULL,
    price_parivar INTEGER NOT NULL,
    price_rajasi INTEGER NOT NULL,
    summary TEXT NOT NULL,
    highlights_json TEXT NOT NULL,
    default_itinerary_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS darshan_slots (
    id TEXT PRIMARY KEY,
    circuit_id TEXT NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,
    slot_name TEXT NOT NULL,
    slot_time TEXT NOT NULL,
    tier_access TEXT NOT NULL,
    surcharge INTEGER NOT NULL,
    seats_remaining INTEGER NOT NULL,
    is_vip INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS train_routes (
    id TEXT PRIMARY KEY,
    circuit_id TEXT NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,
    train_number TEXT NOT NULL,
    train_name TEXT NOT NULL,
    origin_city TEXT NOT NULL,
    arrival_station TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    duration_text TEXT NOT NULL,
    classes_json TEXT NOT NULL,
    live_status TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stays (
    id TEXT PRIMARY KEY,
    circuit_id TEXT NOT NULL REFERENCES circuits(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tier TEXT NOT NULL,
    stay_type TEXT NOT NULL,
    distance_to_temple TEXT NOT NULL,
    meal_plan TEXT NOT NULL,
    price_per_night INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    pnr TEXT UNIQUE NOT NULL,
    circuit_id TEXT NOT NULL REFERENCES circuits(id),
    booking_mode TEXT NOT NULL,
    tier TEXT NOT NULL,
    pilgrim_name TEXT NOT NULL,
    pilgrim_email TEXT NOT NULL,
    pilgrim_phone TEXT NOT NULL,
    travel_date TEXT NOT NULL,
    pilgrim_count INTEGER NOT NULL,
    senior_assistance INTEGER NOT NULL DEFAULT 0,
    prasad_box INTEGER NOT NULL DEFAULT 0,
    sankalp_gotra TEXT NOT NULL DEFAULT '',
    darshan_slot_id TEXT REFERENCES darshan_slots(id),
    train_route_id TEXT REFERENCES train_routes(id),
    train_class TEXT NOT NULL,
    train_coach_berth TEXT NOT NULL,
    stay_id TEXT REFERENCES stays(id),
    itinerary_json TEXT NOT NULL,
    total_amount INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS booking_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_dispatches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    delivery_mode TEXT NOT NULL,
    html_body TEXT NOT NULL,
    sent_at TEXT NOT NULL
  );
`);

function seedInitialData(): void {
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM circuits').get() as { cnt: number };
  if (countRow.cnt > 0) {
    return;
  }

  const circuits = [
    {
      id: 'ashtavinayak-sampoorna',
      slug: 'ashtavinayak-sampoorna-yatra',
      title: 'Ashtavinayak Sampoorna Yatra',
      category: 'Ashtavinayak',
      region: 'Maharashtra (Pune · Raigad · Ahmednagar)',
      deity: 'Lord Ganesha (8 Swayambhu Shrines)',
      temples: [
        { order: 1, name: 'Mayureshwar', town: 'Morgaon', deity: 'Moreshwar', highlight: 'First & concluding shrine of the traditional parikrama' },
        { order: 2, name: 'Siddhivinayak', town: 'Siddhatek', deity: 'Siddhatek Ganapati', highlight: 'Sacred Bhima river bank & clockwise trunk idol' },
        { order: 3, name: 'Ballaleshwar', town: 'Pali', deity: 'Ballaleshwar', highlight: 'Dressed in traditional dhoti-angavastra style' },
        { order: 4, name: 'Varadavinayak', town: 'Mahad', deity: 'Varadavinayak', highlight: 'Continuous sacred Nandadeep lamp burning since 1892' },
        { order: 5, name: 'Chintamani', town: 'Theur', deity: 'Chintamani', highlight: 'Mula-Mutha confluence serene morning abhishek' },
        { order: 6, name: 'Girijatmaj', town: 'Lenyadri', deity: 'Girijatmaj', highlight: 'Hilltop monolithic rock-cut cave temple (307 steps / doli)' },
        { order: 7, name: 'Vighnahar', town: 'Ozar', deity: 'Vighneshwar', highlight: 'Golden dome & Deepmala stone lamp pillars' },
        { order: 8, name: 'Mahaganapati', town: 'Ranjangaon', deity: 'Mahaganapati', highlight: 'Ancient Peshwa-era sanctum with eastern sun rays' },
      ],
      duration_days: 3,
      image_url: '/src/assets/images/circuit_ashtavinayak_ganesha_1795707382899.jpg',
      booking_status: 'LIVE_NOW',
      window_label: 'Margashirsha Sankashti Window',
      window_opens_at: '2026-11-26',
      slots_total: 120,
      slots_remaining: 24,
      price_seva: 3450,
      price_parivar: 6900,
      price_rajasi: 15800,
      summary: 'Complete 8-temple sacred Ashtavinayak parikrama starting from Pune Junction with pre-coordinated Kakad Aarti passes, pure satvik thalis, and Bhakta Niwas or Heritage stays.',
      highlights: [
        'All 8 Swayambhu Ganesha temples covered in traditional sequence',
        'Coordinated Pune / Mumbai rail pickup & dedicated temple transfers',
        'Guaranteed Aarti & Mukh Darshan tokens without queue guesswork',
      ],
      default_itinerary: [
        {
          day: 1,
          title: 'Morgaon, Siddhatek & Theur Darshan',
          morning_ritual: 'Pune Junction arrival & Snan at Morgaon Bhakta Niwas',
          darshan_window: '06:30 AM Mayureshwar · 11:00 AM Siddhatek · 05:30 PM Chintamani',
          evening_program: 'Sandhya Aarti at Theur & Satvik Mahaprasad',
          included: true,
        },
        {
          day: 2,
          title: 'Ranjangaon, Ozar & Lenyadri Hilltop Shrine',
          morning_ritual: 'Early Mangala Aarti at Ranjangaon Mahaganapati',
          darshan_window: '07:00 AM Ranjangaon · 11:30 AM Ozar · 03:30 PM Lenyadri',
          evening_program: 'Kukadi river twilight lamps & traditional bhajan sabha',
          included: true,
        },
        {
          day: 3,
          title: 'Mahad, Pali & Concluding Morgaon Sankalp',
          morning_ritual: 'Sahyadri pass darshan at Varadavinayak Mahad',
          darshan_window: '07:30 AM Mahad · 10:30 AM Pali Ballaleshwar',
          evening_program: 'Purnahuti Modak Prasad & return rail transfer to Pune/Mumbai',
          included: true,
        },
      ],
    },
    {
      id: 'kashi-prayagraj-ayodhya',
      slug: 'kashi-vishwanath-ayodhya-yatra',
      title: 'Kashi Vishwanath, Prayag & Ayodhya',
      category: 'Jyotirlinga',
      region: 'Uttar Pradesh (Varanasi · Prayagraj · Ayodhya)',
      deity: 'Lord Shiva Jyotirlinga & Shri Ram Lalla',
      temples: [
        { order: 1, name: 'Shri Kashi Vishwanath Dham', town: 'Varanasi', deity: 'Vishweshwar Jyotirlinga', highlight: 'Mangala Aarti & Ganga Dwar corridor darshan' },
        { order: 2, name: 'Kal Bhairav & Annapurna', town: 'Varanasi', deity: 'Kashi Kotwal', highlight: 'Traditional Kashi yatra completion darshan' },
        { order: 3, name: 'Triveni Sangam & Bade Hanuman', town: 'Prayagraj', deity: 'Ganga-Yamuna-Saraswati', highlight: 'Sunrise boat snan & Sangam Sankalp' },
        { order: 4, name: 'Shri Ram Janmabhoomi Mandir', town: 'Ayodhya', deity: 'Ram Lalla', highlight: 'Sugam Darshan & Hanuman Garhi' },
      ],
      duration_days: 4,
      image_url: '/src/assets/images/circuit_jyotirlinga_kashi_1795707383684.jpg',
      booking_status: 'LIVE_NOW',
      window_label: 'Dev Deepawali & Kartik Live',
      window_opens_at: '2026-11-26',
      slots_total: 160,
      slots_remaining: 19,
      price_seva: 5200,
      price_parivar: 11400,
      price_rajasi: 24900,
      summary: 'A luminous four-day sacred triangle uniting Kashi Vishwanath Jyotirlinga, Dashashwamedh Ganga Aarti boat seating, Triveni Sangam snan, and Ayodhya Ram Mandir Sugam passes.',
      highlights: [
        'Priority Sugam / Sparsh Darshan slot booking at Kashi Vishwanath Corridor',
        'Reserved Ghat boat seating for Sandhya Ganga Aarti',
        'Vande Bharat & Kashi Vishwanath Express confirmed berth options',
      ],
      default_itinerary: [
        {
          day: 1,
          title: 'Arrival in Kashi & Dashashwamedh Maha Aarti',
          morning_ritual: 'Varanasi Cantt pickup & ghat check-in',
          darshan_window: '04:00 PM Sankat Mochan · 06:15 PM Ganga Maha Aarti',
          evening_program: 'Reserved wooden bajra boat view of evening lamps',
          included: true,
        },
        {
          day: 2,
          title: 'Kashi Vishwanath Mangala Aarti & Kal Bhairav',
          morning_ritual: '03:00 AM Ganga Snan at Lalita Ghat',
          darshan_window: '04:00 AM Vishwanath Darshan · 09:00 AM Annapurna & Kal Bhairav',
          evening_program: 'Sarnath peace walk & Banarasi satvik thali',
          included: true,
        },
        {
          day: 3,
          title: 'Triveni Sangam Snan & Proceed to Ayodhya',
          morning_ritual: 'Vande Bharat / Intercity transit to Prayagraj',
          darshan_window: '08:30 AM Sangam Snan · 11:00 AM Lete Hanumanji',
          evening_program: 'Evening Sarayu Ghat deepdan at Ayodhya',
          included: true,
        },
        {
          day: 4,
          title: 'Shri Ram Janmabhoomi & Hanuman Garhi',
          morning_ritual: 'Sarayu morning prayers & Kanak Bhawan',
          darshan_window: '07:30 AM Hanuman Garhi · 09:30 AM Ram Lalla Sugam Darshan',
          evening_program: 'Ayodhya Dham Cantt train departure',
          included: true,
        },
      ],
    },
    {
      id: 'maharashtra-jyotirlinga-trio',
      slug: 'maharashtra-jyotirlinga-trio',
      title: 'Trimbakeshwar, Bhimashankar & Grishneshwar',
      category: 'Jyotirlinga',
      region: 'Maharashtra (Nashik · Sahyadri · Ellora)',
      deity: 'Three Sacred Jyotirlingas of Sahyadri',
      temples: [
        { order: 1, name: 'Trimbakeshwar Jyotirlinga', town: 'Nashik', deity: 'Trimukha Shiva', highlight: 'Origin of River Godavari & Kushavarta Kund' },
        { order: 2, name: 'Bhimashankar Jyotirlinga', town: 'Khed, Pune', deity: 'Bhimashankar', highlight: 'Dense Sahyadri cloud-forest Nagara shrine' },
        { order: 3, name: 'Grishneshwar Jyotirlinga', town: 'Verul (Ellora)', deity: 'Ghushmeshwar', highlight: '12th Jyotirlinga in red volcanic stone' },
      ],
      duration_days: 4,
      image_url: '/src/assets/images/circuit_jyotirlinga_kashi_1795707383684.jpg',
      booking_status: 'FILLING_FAST',
      window_label: 'Karthik Somvar Window Active',
      window_opens_at: '2026-11-26',
      slots_total: 90,
      slots_remaining: 9,
      price_seva: 4600,
      price_parivar: 8900,
      price_rajasi: 19200,
      summary: 'Connect Maharashtra’s three revered Jyotirlingas plus Shirdi & Shani Shingnapur en route via Panchavati Express and Chhatrapati Sambhajinagar rail corridors.',
      highlights: [
        'Includes optional Rudrabhishek Sankalp with temple-authorized purohit',
        'Panchavati Express & Devagiri Express rail integration',
        'Seamless Sahyadri forest shuttle for Bhimashankar',
      ],
      default_itinerary: [
        {
          day: 1,
          title: 'Nashik Road Arrival & Trimbakeshwar Abhishek',
          morning_ritual: 'Kushavarta Kund snan & Panchavati Ramkund',
          darshan_window: '08:00 AM Trimbakeshwar VIP / Sugam Darshan',
          evening_program: 'Godavari Ramkund evening aarti',
          included: true,
        },
        {
          day: 2,
          title: 'Bhimashankar Sahyadri Jyotirlinga',
          morning_ritual: 'Scenic Sahyadri climb through Bhimashankar sanctuary',
          darshan_window: '11:00 AM Bhimashankar Garbha Griha Darshan',
          evening_program: 'Silent forest ashram dinner & rest',
          included: true,
        },
        {
          day: 3,
          title: 'Shirdi Sai Baba & Shani Shingnapur En Route',
          morning_ritual: 'Optional Kakad / Madhyanha darshan at Shirdi',
          darshan_window: '09:30 AM Samadhi Mandir · 02:30 PM Shani Shingnapur',
          evening_program: 'Arrival at Ellora heritage stay',
          included: true,
        },
        {
          day: 4,
          title: 'Grishneshwar Jyotirlinga & Ellora Kailasa',
          morning_ritual: 'Traditional men’s uttariya sanctum darshan at Grishneshwar',
          darshan_window: '06:30 AM Grishneshwar Jyotirlinga · 10:00 AM Kailasa Temple',
          evening_program: 'Return rail departure from Aurangabad / Manmad',
          included: true,
        },
      ],
    },
    {
      id: 'kedarnath-badrinath-dodham',
      slug: 'kedarnath-badrinath-dodham',
      title: 'Kedarnath & Badrinath Himalayan Do-Dham',
      category: 'Char Dham',
      region: 'Uttarakhand (Garhwal Himalayas)',
      deity: 'Shri Kedarnath & Shri Badrivishal',
      temples: [
        { order: 1, name: 'Har Ki Pauri & Devprayag', town: 'Haridwar / Rishikesh', deity: 'Maa Ganga', highlight: 'Alaknanda-Bhagirathi Sangam darshan' },
        { order: 2, name: 'Shri Kedarnath Dham', town: 'Rudraprayag', deity: 'Panch Kedar Jyotirlinga', highlight: '11,755 ft alpine stone shrine & Bhairavnath' },
        { order: 3, name: 'Shri Badrinath Dham', town: 'Chamoli', deity: 'Badrinarayan Vishnu', highlight: 'Tapt Kund hot spring & Mana village' },
      ],
      duration_days: 6,
      image_url: '/src/assets/images/circuit_chardham_himalaya_1795707384622.jpg',
      booking_status: 'PRE_BOOKING',
      window_label: '2027 Kapat Opening Pre-Booking',
      window_opens_at: '2027-04-18',
      slots_total: 200,
      slots_remaining: 68,
      price_seva: 9800,
      price_parivar: 18500,
      price_rajasi: 42000,
      summary: 'Lock priority Uttarakhand Yatra registration, Haridwar rail berths, heated Himalayan cottages, and optional Phata/Sersi helicopter or pony/palki allocation ahead of the summer rush.',
      highlights: [
        'Priority Kapat-opening darshan token & biometric registration handled',
        'Includes Haridwar Shatabdi / Vande Bharat rail options',
        'Rajasi tier includes Phata–Kedarnath round-trip helicopter shuttle priority',
      ],
      default_itinerary: [
        {
          day: 1,
          title: 'Haridwar Arrival & Ganga Aarti',
          morning_ritual: 'Haridwar Junction pickup & Yatra Biometric Pass check',
          darshan_window: '05:45 PM Har Ki Pauri Ganga Aarti',
          evening_program: 'Briefing & Himalayan medical kit distribution',
          included: true,
        },
        {
          day: 2,
          title: 'Devprayag Sangam to Guptkashi',
          morning_ritual: 'Confluence darshan at Devprayag & Rudraprayag',
          darshan_window: '04:30 PM Vishwanath Temple Guptkashi',
          evening_program: 'Early rest before Kedarnath ascent',
          included: true,
        },
        {
          day: 3,
          title: 'Shri Kedarnath Jyotirlinga Darshan',
          morning_ritual: 'Gaurikund trek / Heli transfer from Phata',
          darshan_window: '02:00 PM Kedarnath Mandir · 07:00 PM Sandhya Aarti',
          evening_program: 'Overnight heated stay near Mandir premises',
          included: true,
        },
        {
          day: 4,
          title: 'Morning Rudrabhishek & Return to Joshimath',
          morning_ritual: '05:00 AM Kedarnath Prabhat Darshan',
          darshan_window: '06:00 AM Bhairavnath Shrine · Evening Narsingh Temple',
          evening_program: 'Rest at Joshimath Himalayan lodge',
          included: true,
        },
        {
          day: 5,
          title: 'Shri Badrinath Dham & Tapt Kund Snan',
          morning_ritual: 'Warm Tapt Kund bath on Alaknanda banks',
          darshan_window: '08:30 AM Badrivishal Darshan · 01:00 PM Mana Village',
          evening_program: 'Swarna Aarti & Gita Path at Badrinath',
          included: true,
        },
        {
          day: 6,
          title: 'Rishikesh Ram Jhula & Haridwar Rail Departure',
          morning_ritual: 'Descent along Alaknanda valley',
          darshan_window: '03:00 PM Parmarth Niketan Rishikesh',
          evening_program: 'Haridwar Junction train boarding',
          included: true,
        },
      ],
    },
    {
      id: 'tirupati-kanchi-divya-desam',
      slug: 'tirupati-balaji-kanchipuram-yatra',
      title: 'Tirumala Balaji & Kanchipuram Divya Desam',
      category: 'South Divya Desam',
      region: 'Andhra Pradesh & Tamil Nadu',
      deity: 'Sri Venkateswara & Kamakshi Amman',
      temples: [
        { order: 1, name: 'Tirumala Sri Venkateswara', town: 'Tirupati Hills', deity: 'Balaji / Govinda', highlight: '₹300 Special Entry / VIP Break Darshan & Laddu Prasadam' },
        { order: 2, name: 'Sri Padmavathi Ammavari', town: 'Tiruchanur', deity: 'Alamelu Mangai', highlight: 'Sacred Pushkarini lotus tank darshan' },
        { order: 3, name: 'Ekambareswarar & Kamakshi Amman', town: 'Kanchipuram', deity: 'Shakti Peetha & Pancha Bhoota', highlight: '3,500-year sacred mango tree & gold vimana' },
      ],
      duration_days: 3,
      image_url: '/src/assets/images/circuit_south_gopuram_1795707384656.jpg',
      booking_status: 'LIVE_NOW',
      window_label: 'TTD Special Entry Quota Live',
      window_opens_at: '2026-11-26',
      slots_total: 140,
      slots_remaining: 31,
      price_seva: 3900,
      price_parivar: 7800,
      price_rajasi: 17400,
      summary: 'Seamless Tirumala Special Entry Darshan paired with Alipiri/Renigunta rail transfers, Tiruchanur Padmavathi darshan, and Kanchipuram’s ancient temple city.',
      highlights: [
        'Pre-booked TTD Special Entry Darshan slots & Srivari Laddu tokens',
        'Pure South Indian satvik plantain-leaf bhojan included',
        'Direct Renigunta / Tirupati Express rail coordination',
      ],
      default_itinerary: [
        {
          day: 1,
          title: 'Tirupati Arrival & Tiruchanur Padmavathi Temple',
          morning_ritual: 'Tirupati / Renigunta station pickup & check-in',
          darshan_window: '04:00 PM Sri Padmavathi Ammavari · 06:30 PM Govindaraja Swamy',
          evening_program: 'Early satvik dinner & Tirumala ascent prep',
          included: true,
        },
        {
          day: 2,
          title: 'Tirumala Hills Sri Venkateswara Darshan',
          morning_ritual: 'Swami Pushkarini & Varaha Swamy darshan',
          darshan_window: '09:00 AM Tirumala Special / Break Darshan · 02:00 PM Akasha Ganga',
          evening_program: 'Srivari Laddu collection & Alipiri descent',
          included: true,
        },
        {
          day: 3,
          title: 'Kanchipuram Kamakshi Amman & Return',
          morning_ritual: 'Morning drive to Kanchipuram',
          darshan_window: '09:30 AM Kamakshi Amman · 11:30 AM Ekambareswarar',
          evening_program: 'Evening return train from Chennai Central / Arakkonam',
          included: true,
        },
      ],
    },
    {
      id: 'ujjain-mahakal-omkareshwar',
      slug: 'ujjain-mahakaleshwar-omkareshwar',
      title: 'Ujjain Mahakal Bhasma Aarti & Omkareshwar',
      category: 'Regional Teerth',
      region: 'Madhya Pradesh (Malwa · Narmada)',
      deity: 'Mahakaleshwar & Omkareshwar Jyotirlingas',
      temples: [
        { order: 1, name: 'Shri Mahakaleshwar & Mahakal Lok', town: 'Ujjain', deity: 'Dakshinamurti Mahakal', highlight: '4:00 AM Bhasma Aarti & Shipra Ram Ghat' },
        { order: 2, name: 'Harsiddhi Shakti Peeth & Kal Bhairav', town: 'Ujjain', deity: 'Maa Harsiddhi', highlight: 'Evening towering Deepstambh illumination' },
        { order: 3, name: 'Shri Omkareshwar & Mamleshwar', town: 'Mandhata Island', deity: 'Omkara Jyotirlinga', highlight: 'Sacred Narmada parikrama boat crossing' },
      ],
      duration_days: 3,
      image_url: '/src/assets/images/hero_temple_sunrise_1795707382592.jpg',
      booking_status: 'PRE_BOOKING',
      window_label: 'Mahashivratri & Spring Pre-Book',
      window_opens_at: '2027-02-01',
      slots_total: 100,
      slots_remaining: 44,
      price_seva: 3650,
      price_parivar: 7400,
      price_rajasi: 16500,
      summary: 'Experience the rare pre-dawn Bhasma Aarti at Mahakaleshwar, walk the illuminated Mahakal Lok corridor, and cross the Narmada to Omkareshwar Island.',
      highlights: [
        'Bhasma Aarti & Shighra Darshan pass registration',
        'Narmada boat ferry & Parikrama guide at Omkareshwar',
        'Malwa Express / Avantika Express / Indore Vande Bharat routes',
      ],
      default_itinerary: [
        {
          day: 1,
          title: 'Ujjain Arrival & Mahakal Lok Corridor',
          morning_ritual: 'Ujjain Junction arrival & Shipra Ram Ghat snan',
          darshan_window: '05:00 PM Mahakal Lok Walk · 07:30 PM Harsiddhi Deepstambh',
          evening_program: 'Malwa satvik bhojan & early rest for Bhasma Aarti',
          included: true,
        },
        {
          day: 2,
          title: '04:00 AM Bhasma Aarti & Kal Bhairav',
          morning_ritual: '02:30 AM temple gate reporting in traditional dhoti/saree',
          darshan_window: '04:00 AM Bhasma Aarti · 10:30 AM Mangalnath & Sandipani Ashram',
          evening_program: 'Drive to Omkareshwar Narmada Ghat',
          included: true,
        },
        {
          day: 3,
          title: 'Omkareshwar & Mamleshwar Jyotirlinga',
          morning_ritual: 'Sunrise Narmada snan & boat crossing',
          darshan_window: '07:00 AM Omkareshwar · 09:30 AM Mamleshwar',
          evening_program: 'Indore / Ujjain rail departure',
          included: true,
        },
      ],
    },
  ];

  const insertCircuit = db.prepare(`
    INSERT INTO circuits (
      id, slug, title, category, region, deity, temples_json, duration_days,
      image_url, booking_status, window_label, window_opens_at, slots_total,
      slots_remaining, price_seva, price_parivar, price_rajasi, summary,
      highlights_json, default_itinerary_json
    ) VALUES (
      @id, @slug, @title, @category, @region, @deity, @temples_json, @duration_days,
      @image_url, @booking_status, @window_label, @window_opens_at, @slots_total,
      @slots_remaining, @price_seva, @price_parivar, @price_rajasi, @summary,
      @highlights_json, @default_itinerary_json
    )
  `);

  const insertDarshan = db.prepare(`
    INSERT INTO darshan_slots (id, circuit_id, slot_name, slot_time, tier_access, surcharge, seats_remaining, is_vip)
    VALUES (@id, @circuit_id, @slot_name, @slot_time, @tier_access, @surcharge, @seats_remaining, @is_vip)
  `);

  const insertTrain = db.prepare(`
    INSERT INTO train_routes (
      id, circuit_id, train_number, train_name, origin_city, arrival_station,
      departure_time, arrival_time, duration_text, classes_json, live_status
    ) VALUES (
      @id, @circuit_id, @train_number, @train_name, @origin_city, @arrival_station,
      @departure_time, @arrival_time, @duration_text, @classes_json, @live_status
    )
  `);

  const insertStay = db.prepare(`
    INSERT INTO stays (id, circuit_id, name, tier, stay_type, distance_to_temple, meal_plan, price_per_night)
    VALUES (@id, @circuit_id, @name, @tier, @stay_type, @distance_to_temple, @meal_plan, @price_per_night)
  `);

  const seedTx = db.transaction(() => {
    for (const c of circuits) {
      insertCircuit.run({
        id: c.id,
        slug: c.slug,
        title: c.title,
        category: c.category,
        region: c.region,
        deity: c.deity,
        temples_json: JSON.stringify(c.temples),
        duration_days: c.duration_days,
        image_url: c.image_url,
        booking_status: c.booking_status,
        window_label: c.window_label,
        window_opens_at: c.window_opens_at,
        slots_total: c.slots_total,
        slots_remaining: c.slots_remaining,
        price_seva: c.price_seva,
        price_parivar: c.price_parivar,
        price_rajasi: c.price_rajasi,
        summary: c.summary,
        highlights_json: JSON.stringify(c.highlights),
        default_itinerary_json: JSON.stringify(c.default_itinerary),
      });

      const slots = [
        {
          id: `${c.id}-kakad`,
          circuit_id: c.id,
          slot_name: 'Pratah Kakad & Mukh Darshan',
          slot_time: '04:30 AM – 06:15 AM',
          tier_access: 'ALL',
          surcharge: 0,
          seats_remaining: 42,
          is_vip: 0,
        },
        {
          id: `${c.id}-sugam`,
          circuit_id: c.id,
          slot_name: 'Mangala Sugam Queue Pass',
          slot_time: '07:30 AM – 09:30 AM',
          tier_access: 'ALL',
          surcharge: 350,
          seats_remaining: 28,
          is_vip: 0,
        },
        {
          id: `${c.id}-vip-abhishek`,
          circuit_id: c.id,
          slot_name: 'VIP Garbha Griha & Sankalp Abhishek',
          slot_time: '10:00 AM – 11:30 AM',
          tier_access: 'PARIVAR_PLUS',
          surcharge: 1250,
          seats_remaining: 14,
          is_vip: 1,
        },
        {
          id: `${c.id}-sandhya-vip`,
          circuit_id: c.id,
          slot_name: 'Sandhya Maha Aarti Reserved Mandapam',
          slot_time: '06:30 PM – 08:00 PM',
          tier_access: 'PARIVAR_PLUS',
          surcharge: 850,
          seats_remaining: 18,
          is_vip: 1,
        },
      ];
      for (const s of slots) insertDarshan.run(s);
    }

    const trains = [
      {
        id: 'tr-deccan-queen',
        circuit_id: 'ashtavinayak-sampoorna',
        train_number: '12123',
        train_name: 'Deccan Queen SF Express',
        origin_city: 'Mumbai CSMT',
        arrival_station: 'Pune Jn',
        departure_time: '17:10',
        arrival_time: '20:25',
        duration_text: '3h 15m',
        classes_json: JSON.stringify([
          { code: 'CC', label: 'AC Chair Car', fare: 540, available: 38 },
          { code: 'EC', label: 'Vistadome / Exec Chair', fare: 1320, available: 12 },
          { code: 'SL', label: 'Second Sitting', fare: 195, available: 64 },
        ]),
        live_status: 'Booking Open · Daily Service',
      },
      {
        id: 'tr-pragati-exp',
        circuit_id: 'ashtavinayak-sampoorna',
        train_number: '12125',
        train_name: 'Pragati Express',
        origin_city: 'Mumbai CSMT',
        arrival_station: 'Pune Jn',
        departure_time: '16:25',
        arrival_time: '19:50',
        duration_text: '3h 25m',
        classes_json: JSON.stringify([
          { code: 'CC', label: 'AC Chair Car', fare: 510, available: 26 },
          { code: 'SL', label: 'Reserved Sitting', fare: 180, available: 51 },
        ]),
        live_status: 'On Time · Platform 11',
      },
      {
        id: 'tr-kashi-vb',
        circuit_id: 'kashi-prayagraj-ayodhya',
        train_number: '22436',
        train_name: 'New Delhi – Varanasi Vande Bharat',
        origin_city: 'New Delhi (NDLS)',
        arrival_station: 'Varanasi Jn (BSB)',
        departure_time: '06:00',
        arrival_time: '14:00',
        duration_text: '8h 00m',
        classes_json: JSON.stringify([
          { code: 'CC', label: 'Vande Bharat Chair Car', fare: 1790, available: 29 },
          { code: 'EC', label: 'Executive Class', fare: 3340, available: 9 },
        ]),
        live_status: 'Booking Open · Priority Quota',
      },
      {
        id: 'tr-shivganga-exp',
        circuit_id: 'kashi-prayagraj-ayodhya',
        train_number: '12560',
        train_name: 'Shiv Ganga SF Express',
        origin_city: 'New Delhi (NDLS)',
        arrival_station: 'Banaras (BSBS)',
        departure_time: '20:05',
        arrival_time: '06:25',
        duration_text: '10h 20m',
        classes_json: JSON.stringify([
          { code: 'SL', label: 'Sleeper', fare: 445, available: 45 },
          { code: '3A', label: 'AC 3 Tier', fare: 1180, available: 22 },
          { code: '2A', label: 'AC 2 Tier', fare: 1690, available: 11 },
          { code: '1A', label: 'First AC Cabin', fare: 2860, available: 4 },
        ]),
        live_status: 'Overnight Pilgrim Favorite',
      },
      {
        id: 'tr-panchavati-exp',
        circuit_id: 'maharashtra-jyotirlinga-trio',
        train_number: '12109',
        train_name: 'Panchavati SF Express',
        origin_city: 'Mumbai CSMT',
        arrival_station: 'Nashik Road (NK)',
        departure_time: '18:15',
        arrival_time: '21:42',
        duration_text: '3h 27m',
        classes_json: JSON.stringify([
          { code: 'SL', label: 'Second Sitting', fare: 165, available: 40 },
          { code: 'CC', label: 'AC Chair Car', fare: 495, available: 19 },
        ]),
        live_status: 'Direct Godavari Gateway',
      },
      {
        id: 'tr-devagiri-exp',
        circuit_id: 'maharashtra-jyotirlinga-trio',
        train_number: '17057',
        train_name: 'Devagiri Express',
        origin_city: 'Mumbai CSMT',
        arrival_station: 'Aurangabad (AWB)',
        departure_time: '21:30',
        arrival_time: '04:30',
        duration_text: '7h 00m',
        classes_json: JSON.stringify([
          { code: 'SL', label: 'Sleeper', fare: 280, available: 34 },
          { code: '3A', label: 'AC 3 Tier', fare: 760, available: 17 },
          { code: '2A', label: 'AC 2 Tier', fare: 1120, available: 8 },
        ]),
        live_status: 'Overnight Berths Available',
      },
      {
        id: 'tr-dehradun-shatabdi',
        circuit_id: 'kedarnath-badrinath-dodham',
        train_number: '12017',
        train_name: 'Dehradun Shatabdi Express',
        origin_city: 'New Delhi (NDLS)',
        arrival_station: 'Haridwar Jn (HW)',
        departure_time: '06:45',
        arrival_time: '11:25',
        duration_text: '4h 40m',
        classes_json: JSON.stringify([
          { code: 'CC', label: 'AC Chair Car', fare: 960, available: 48 },
          { code: 'EC', label: 'Executive Chair Car', fare: 1680, available: 15 },
        ]),
        live_status: 'Pre-Booking Rail Quota Open',
      },
      {
        id: 'tr-yoga-express',
        circuit_id: 'kedarnath-badrinath-dodham',
        train_number: '19031',
        train_name: 'Yoga Express',
        origin_city: 'Ahmedabad / Jaipur',
        arrival_station: 'Haridwar / Yog Nagari Rishikesh',
        departure_time: '11:25',
        arrival_time: '12:15',
        duration_text: '24h 50m',
        classes_json: JSON.stringify([
          { code: 'SL', label: 'Sleeper', fare: 560, available: 62 },
          { code: '3A', label: 'AC 3 Tier', fare: 1490, available: 28 },
          { code: '2A', label: 'AC 2 Tier', fare: 2140, available: 12 },
        ]),
        live_status: 'Direct Rishikesh Terminus',
      },
      {
        id: 'tr-tirupati-vb',
        circuit_id: 'tirupati-kanchi-divya-desam',
        train_number: '20708',
        train_name: 'Secunderabad – Tirupati Vande Bharat',
        origin_city: 'Secunderabad (SC)',
        arrival_station: 'Tirupati (TPTY)',
        departure_time: '06:00',
        arrival_time: '14:15',
        duration_text: '8h 15m',
        classes_json: JSON.stringify([
          { code: 'CC', label: 'Chair Car', fare: 1680, available: 32 },
          { code: 'EC', label: 'Executive Class', fare: 3120, available: 10 },
        ]),
        live_status: 'Syncs with Evening Darshan',
      },
      {
        id: 'tr-saptagiri-exp',
        circuit_id: 'tirupati-kanchi-divya-desam',
        train_number: '16057',
        train_name: 'Saptagiri Express',
        origin_city: 'Chennai Central (MAS)',
        arrival_station: 'Tirupati (TPTY)',
        departure_time: '06:25',
        arrival_time: '09:50',
        duration_text: '3h 25m',
        classes_json: JSON.stringify([
          { code: 'SL', label: 'Second Sitting', fare: 120, available: 55 },
          { code: 'CC', label: 'AC Chair Car', fare: 410, available: 24 },
        ]),
        live_status: 'Morning Temple Express',
      },
      {
        id: 'tr-avantika-exp',
        circuit_id: 'ujjain-mahakal-omkareshwar',
        train_number: '12961',
        train_name: 'Avantika SF Express',
        origin_city: 'Mumbai Central (MMCT)',
        arrival_station: 'Ujjain Jn (UJN)',
        departure_time: '20:55',
        arrival_time: '07:20',
        duration_text: '10h 25m',
        classes_json: JSON.stringify([
          { code: 'SL', label: 'Sleeper', fare: 410, available: 38 },
          { code: '3A', label: 'AC 3 Tier', fare: 1090, available: 20 },
          { code: '2A', label: 'AC 2 Tier', fare: 1580, available: 9 },
          { code: '1A', label: 'First AC', fare: 2690, available: 3 },
        ]),
        live_status: 'Pre-Booking Quota Active',
      },
    ];
    for (const tr of trains) insertTrain.run(tr);

    const stayTemplates = [
      { suffix: 'seva', tier: 'SEVA', label: 'Sanctum Bhakta Niwas', type: 'Trust Dharamshala (Clean Non-AC/Cooler)', dist: '120m from Temple Gate', meal: 'Pure Satvik Bhojan Thali', price: 650 },
      { suffix: 'parivar', tier: 'PARIVAR', label: 'Tulasi Heritage Yatri Niwas', type: '3-Star Pure Veg AC Family Stay', dist: '250m from Temple East Corridor', meal: 'Satvik Breakfast & Evening Prasadam', price: 2100 },
      { suffix: 'rajasi', tier: 'RAJASI', label: 'Swarna Mandapam Retreat', type: '5-Star Spiritual Sanctuary Suite', dist: 'Private Cart to VIP Gate (180m)', meal: 'All-Day Satvik Kitchen & Rudraksha Welcome', price: 6400 },
    ];

    for (const c of circuits) {
      for (const st of stayTemplates) {
        insertStay.run({
          id: `${c.id}-stay-${st.suffix}`,
          circuit_id: c.id,
          name: `${c.title.split(' ')[0]} ${st.label}`,
          tier: st.tier,
          stay_type: st.type,
          distance_to_temple: st.dist,
          meal_plan: st.meal,
          price_per_night: st.price,
        });
      }
    }

    // Seed 2 realistic bookings so My Yatra Pass has instant live records
    const seedBookings = [
      {
        id: 'bk-seed-1',
        pnr: 'TS-408219',
        circuit_id: 'ashtavinayak-sampoorna',
        booking_mode: 'LIVE_BOOKING',
        tier: 'PARIVAR',
        pilgrim_name: 'Aditi Kulkarni',
        pilgrim_email: 'aditi.kulkarni@example.in',
        pilgrim_phone: '+91 98204 55120',
        travel_date: '2026-12-04',
        pilgrim_count: 4,
        senior_assistance: 1,
        prasad_box: 1,
        sankalp_gotra: 'Kashyap Gotra · Kulkarni Parivar',
        darshan_slot_id: 'ashtavinayak-sampoorna-sugam',
        train_route_id: 'tr-deccan-queen',
        train_class: 'CC',
        train_coach_berth: 'Coach C3 · Seats 24, 25, 26, 27',
        stay_id: 'ashtavinayak-sampoorna-stay-parivar',
        itinerary_json: JSON.stringify(circuits[0].default_itinerary),
        total_amount: 39811,
        status: 'CONFIRMED',
        created_at: new Date(Date.now() - 3600_000 * 5).toISOString(),
        updates: [
          { event_type: 'TICKET_ISSUED', message: 'PNR TS-408219 confirmed for 4 Yatris (Parivar Tier).' },
          { event_type: 'TRAIN_PNR_SYNC', message: '12123 Deccan Queen Express Coach C3 seats locked.' },
          { event_type: 'DARSHAN_TOKEN_READY', message: 'Mangala Sugam Pass issued for all 8 Swayambhu shrines.' },
          { event_type: 'EMAIL_SENT', message: 'Automated E-Ticket & Darshan Pass dispatched to aditi.kulkarni@example.in.' },
        ],
      },
      {
        id: 'bk-seed-2',
        pnr: 'TS-519044',
        circuit_id: 'kedarnath-badrinath-dodham',
        booking_mode: 'PRE_BOOKING',
        tier: 'RAJASI',
        pilgrim_name: 'Raghavendra Joshi',
        pilgrim_email: 'raghav.joshi@example.in',
        pilgrim_phone: '+91 98112 77340',
        travel_date: '2027-05-09',
        pilgrim_count: 2,
        senior_assistance: 0,
        prasad_box: 1,
        sankalp_gotra: 'Bharadwaj Gotra',
        darshan_slot_id: 'kedarnath-badrinath-dodham-vip-abhishek',
        train_route_id: 'tr-dehradun-shatabdi',
        train_class: 'EC',
        train_coach_berth: 'Coach E1 · Seats 14, 15',
        stay_id: 'kedarnath-badrinath-dodham-stay-rajasi',
        itinerary_json: JSON.stringify(circuits[3].default_itinerary),
        total_amount: 122211,
        status: 'PRE_BOOKED_PRIORITY',
        created_at: new Date(Date.now() - 3600_000 * 2).toISOString(),
        updates: [
          { event_type: 'PREBOOK_PRIORITY_LOCKED', message: '2027 Kapat Opening Priority Slot #68 locked in Rajasi Tier.' },
          { event_type: 'TRAIN_PNR_SYNC', message: '12017 Dehradun Shatabdi Executive Class queued for Haridwar arrival.' },
          { event_type: 'EMAIL_SENT', message: 'Pre-booking receipt & Uttarakhand Yatra dossier sent to raghav.joshi@example.in.' },
        ],
      },
    ];

    const insBooking = db.prepare(`
      INSERT INTO bookings (
        id, pnr, circuit_id, booking_mode, tier, pilgrim_name, pilgrim_email,
        pilgrim_phone, travel_date, pilgrim_count, senior_assistance, prasad_box,
        sankalp_gotra, darshan_slot_id, train_route_id, train_class, train_coach_berth,
        stay_id, itinerary_json, total_amount, status, created_at
      ) VALUES (
        @id, @pnr, @circuit_id, @booking_mode, @tier, @pilgrim_name, @pilgrim_email,
        @pilgrim_phone, @travel_date, @pilgrim_count, @senior_assistance, @prasad_box,
        @sankalp_gotra, @darshan_slot_id, @train_route_id, @train_class, @train_coach_berth,
        @stay_id, @itinerary_json, @total_amount, @status, @created_at
      )
    `);
    const insUpdate = db.prepare(`
      INSERT INTO booking_updates (booking_id, event_type, message, created_at)
      VALUES (@booking_id, @event_type, @message, @created_at)
    `);
    const insEmail = db.prepare(`
      INSERT INTO email_dispatches (booking_id, recipient_email, subject, delivery_mode, html_body, sent_at)
      VALUES (@booking_id, @recipient_email, @subject, @delivery_mode, @html_body, @sent_at)
    `);

    for (const b of seedBookings) {
      const circuit = circuits.find((c) => c.id === b.circuit_id)!;
      insBooking.run({
        id: b.id,
        pnr: b.pnr,
        circuit_id: b.circuit_id,
        booking_mode: b.booking_mode,
        tier: b.tier,
        pilgrim_name: b.pilgrim_name,
        pilgrim_email: b.pilgrim_email,
        pilgrim_phone: b.pilgrim_phone,
        travel_date: b.travel_date,
        pilgrim_count: b.pilgrim_count,
        senior_assistance: b.senior_assistance,
        prasad_box: b.prasad_box,
        sankalp_gotra: b.sankalp_gotra,
        darshan_slot_id: b.darshan_slot_id,
        train_route_id: b.train_route_id,
        train_class: b.train_class,
        train_coach_berth: b.train_coach_berth,
        stay_id: b.stay_id,
        itinerary_json: b.itinerary_json,
        total_amount: b.total_amount,
        status: b.status,
        created_at: b.created_at,
      });

      for (const u of b.updates) {
        insUpdate.run({
          booking_id: b.id,
          event_type: u.event_type,
          message: u.message,
          created_at: b.created_at,
        });
      }

      const emailBuilt = buildTicketEmailHtml({
        pnr: b.pnr,
        bookingMode: b.booking_mode as 'LIVE_BOOKING' | 'PRE_BOOKING',
        tier: b.tier as 'SEVA' | 'PARIVAR' | 'RAJASI',
        pilgrimName: b.pilgrim_name,
        pilgrimEmail: b.pilgrim_email,
        pilgrimPhone: b.pilgrim_phone,
        travelDate: b.travel_date,
        pilgrimCount: b.pilgrim_count,
        circuitTitle: circuit.title,
        circuitRegion: circuit.region,
        darshanSlotName: 'Mangala Sugam / VIP Sankalp Pass',
        darshanSlotTime: '07:30 AM – 11:30 AM',
        trainSummary: b.train_route_id === 'tr-deccan-queen' ? '12123 Deccan Queen SF Express' : '12017 Dehradun Shatabdi Express',
        trainCoachBerth: b.train_coach_berth,
        stayName: b.tier === 'PARIVAR' ? 'Tulasi Heritage Yatri Niwas' : 'Swarna Mandapam Retreat',
        stayDistance: '250m from Temple Gate',
        sankalpGotra: b.sankalp_gotra,
        seniorAssistance: Boolean(b.senior_assistance),
        prasadBox: Boolean(b.prasad_box),
        totalAmount: b.total_amount,
        itinerary: JSON.parse(b.itinerary_json) as ItineraryDay[],
      });

      insEmail.run({
        booking_id: b.id,
        recipient_email: b.pilgrim_email,
        subject: emailBuilt.subject,
        delivery_mode: 'LOCAL_DISPATCH_VERIFIED',
        html_body: emailBuilt.html,
        sent_at: b.created_at,
      });
    }
  });

  seedTx();
}

seedInitialData();

function ensureUniversalSeedData(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      care_mode TEXT NOT NULL DEFAULT 'ELDERLY_CARE',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS temples_directory (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tradition TEXT NOT NULL,
      location TEXT NOT NULL,
      state TEXT NOT NULL,
      deity_or_focus TEXT NOT NULL,
      darshan_timings TEXT NOT NULL,
      aarti_timings TEXT NOT NULL,
      opening_closing TEXT NOT NULL,
      online_booking_info TEXT NOT NULL,
      entry_requirements TEXT NOT NULL,
      dress_code TEXT NOT NULL,
      photography_rules TEXT NOT NULL,
      festivals_json TEXT NOT NULL,
      official_website TEXT NOT NULL,
      source_authority TEXT NOT NULL,
      crowd_weekday TEXT NOT NULL,
      crowd_weekend TEXT NOT NULL,
      crowd_festival TEXT NOT NULL,
      recommended_visit_window TEXT NOT NULL,
      special_darshan_notes TEXT NOT NULL,
      wheelchair_accessible INTEGER NOT NULL,
      ramps_and_lifts TEXT NOT NULL,
      walking_distance_note TEXT NOT NULL,
      resting_zones TEXT NOT NULL,
      medical_facility TEXT NOT NULL,
      nearby_pharmacy TEXT NOT NULL,
      emergency_contact TEXT NOT NULL,
      history_summary TEXT NOT NULL,
      significance_summary TEXT NOT NULL,
      rituals_summary TEXT NOT NULL,
      faqs_json TEXT NOT NULL,
      image_url TEXT NOT NULL
    );
  `);

  const bookingCols = db.prepare('PRAGMA table_info(bookings)').all() as { name: string }[];
  if (!bookingCols.some((c) => c.name === 'user_id')) {
    db.exec('ALTER TABLE bookings ADD COLUMN user_id TEXT');
  }

  const templeCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM temples_directory').get() as { cnt: number }
  ).cnt;

  if (templeCount === 0) {
    const insTemple = db.prepare(`
      INSERT INTO temples_directory (
        id, name, tradition, location, state, deity_or_focus, darshan_timings,
        aarti_timings, opening_closing, online_booking_info, entry_requirements,
        dress_code, photography_rules, festivals_json, official_website,
        source_authority, crowd_weekday, crowd_weekend, crowd_festival,
        recommended_visit_window, special_darshan_notes, wheelchair_accessible,
        ramps_and_lifts, walking_distance_note, resting_zones, medical_facility,
        nearby_pharmacy, emergency_contact, history_summary, significance_summary,
        rituals_summary, faqs_json, image_url
      ) VALUES (
        @id, @name, @tradition, @location, @state, @deity_or_focus, @darshan_timings,
        @aarti_timings, @opening_closing, @online_booking_info, @entry_requirements,
        @dress_code, @photography_rules, @festivals_json, @official_website,
        @source_authority, @crowd_weekday, @crowd_weekend, @crowd_festival,
        @recommended_visit_window, @special_darshan_notes, @wheelchair_accessible,
        @ramps_and_lifts, @walking_distance_note, @resting_zones, @medical_facility,
        @nearby_pharmacy, @emergency_contact, @history_summary, @significance_summary,
        @rituals_summary, @faqs_json, @image_url
      )
    `);

    const tx = db.transaction(() => {
      for (const t of VERIFIED_TEMPLES_SEED) {
        insTemple.run({
          ...t,
          festivals_json: JSON.stringify(t.festivals),
          faqs_json: JSON.stringify(t.faqs),
        });
      }
    });
    tx();
  }

  // Ensure Option C Buddhist Sacred Circuit & Shirdi Regional Circuit exist in circuits
  const buddhistExists = db
    .prepare('SELECT id FROM circuits WHERE id = ?')
    .get('buddhist-sacred-circuit');

  if (!buddhistExists) {
    const universalCircuits = [
      {
        id: 'buddhist-sacred-circuit',
        slug: 'buddhist-sacred-circuit-bodhgaya-sarnath',
        title: 'Bodh Gaya, Sarnath & Kushinagar Buddhist Trail',
        category: 'Buddhist Circuit',
        region: 'Bihar & Uttar Pradesh (Bodh Gaya · Sarnath · Kushinagar)',
        deity: 'Gautama Buddha Enlightenment & Parinirvana Sites',
        temples: [
          { order: 1, name: 'Mahabodhi Mahavihara & Bodhi Tree', town: 'Bodh Gaya', deity: 'Enlightenment Seat', highlight: 'Vajrasana & tranquil sunrise chanting' },
          { order: 2, name: 'Rajgir Griddhakuta & Nalanda', town: 'Rajgir', deity: 'Vulture Peak', highlight: 'Peace Pagoda ropeway & ancient university ruins' },
          { order: 3, name: 'Dhamek Stupa & Mulagandha Kuti', town: 'Sarnath', deity: 'First Dharma Sermon', highlight: 'Deer Park evening meditation & museum' },
          { order: 4, name: 'Mahaparinirvana Stupa', town: 'Kushinagar', deity: 'Final Parinirvana', highlight: 'Reclining Buddha sanctum & Ramabhar Stupa' },
        ],
        duration_days: 5,
        image_url: '/src/assets/images/circuit_buddhist_bodhgaya_1795710528041.jpg',
        booking_status: 'LIVE_NOW',
        window_label: 'Winter Meditation & Tipitaka Season',
        window_opens_at: '2026-11-26',
        slots_total: 110,
        slots_remaining: 34,
        price_seva: 5800,
        price_parivar: 11900,
        price_rajasi: 23500,
        summary: 'Wheelchair-friendly spiritual journey uniting Bodh Gaya, Rajgir, Sarnath, and Kushinagar with monastery guest stays, Mahabodhi Express rail berths, and quiet chanting schedules.',
        highlights: [
          'Step-free paved courtyard routes suited for elderly pilgrims',
          'Mahabodhi Express & Vande Bharat rail connectivity via Gaya & Varanasi',
          'Verified BTMC meditation timings and calm morning chanting access',
        ],
        default_itinerary: [
          {
            day: 1,
            title: 'Gaya Arrival & Mahabodhi Evening Chanting',
            morning_ritual: 'Gaya Jn rail pickup & monastery check-in',
            darshan_window: '04:30 PM Bodhi Tree Parikrama · 06:00 PM Evening Sutta Chanting',
            evening_program: 'Butter lamp lighting at Muchalinda Lotus Pond',
            included: true,
          },
          {
            day: 2,
            title: 'Sunrise Vajrasana Meditation & Sujata Garh',
            morning_ritual: '05:30 AM dawn chanting beneath Bodhi Tree',
            darshan_window: '09:30 AM International Monasteries · 03:30 PM Sujata Stupa',
            evening_program: 'Quiet vegetarian monastery meal & rest',
            included: true,
          },
          {
            day: 3,
            title: 'Rajgir Peace Pagoda & Nalanda Ruins',
            morning_ritual: 'Ropeway ascent to Vishwa Shanti Stupa (senior accessible)',
            darshan_window: '09:00 AM Griddhakuta Peak · 01:30 PM Nalanda Mahavihara',
            evening_program: 'Overnight train or coach transit to Varanasi / Sarnath',
            included: true,
          },
          {
            day: 4,
            title: 'Sarnath Dhamek Stupa & Deer Park',
            morning_ritual: 'Mindful walk at Sarnath gardens',
            darshan_window: '08:00 AM Dhamek Stupa · 11:00 AM Mulagandha Kuti Vihara',
            evening_program: 'Evening reflection at Ashoka Pillar complex',
            included: true,
          },
          {
            day: 5,
            title: 'Kushinagar Mahaparinirvana Temple',
            morning_ritual: 'Peaceful morning tribute at Reclining Buddha shrine',
            darshan_window: '09:00 AM Mahaparinirvana Stupa · 11:30 AM Ramabhar Stupa',
            evening_program: 'Gorakhpur / Varanasi rail departure',
            included: true,
          },
        ],
      },
      {
        id: 'shirdi-shani-teerth',
        slug: 'shirdi-sai-shani-shingnapur-care',
        title: 'Shirdi Sai Baba & Shani Shingnapur Senior-Care Yatra',
        category: 'Regional Teerth',
        region: 'Maharashtra (Shirdi · Shingnapur)',
        deity: 'Shri Sai Baba Samadhi & Shani Dev',
        temples: [
          { order: 1, name: 'Shri Saibaba Samadhi Mandir', town: 'Shirdi', deity: 'Sai Baba', highlight: 'Gate 6 Senior/Wheelchair lane & Prasadalaya' },
          { order: 2, name: 'Dwarkamai & Chavadi', town: 'Shirdi', deity: 'Sacred Dhuni', highlight: 'Historic residence & Palkhi route' },
          { order: 3, name: 'Shani Shingnapur Swayambhu', town: 'Shingnapur', deity: 'Shani Dev', highlight: 'Open-air black stone shrine' },
        ],
        duration_days: 2,
        image_url: '/src/assets/images/circuit_ashtavinayak_ganesha_1795707382899.jpg',
        booking_status: 'LIVE_NOW',
        window_label: 'Daily Sansthan Time-Slot Open',
        window_opens_at: '2026-11-26',
        slots_total: 150,
        slots_remaining: 42,
        price_seva: 2499,
        price_parivar: 5400,
        price_rajasi: 11800,
        summary: 'Designed especially for families and elderly pilgrims with Sainagar Shirdi Vande Bharat rail sync, step-free Gate 6 access, and calm mid-week darshan slots.',
        highlights: [
          'Gate 6 wheelchair & elderly lift access pre-coordinated',
          'CSMT – Sainagar Shirdi Vande Bharat & Dadar Express options',
          'Sansthan Bhakta Niwas or 4-Star pure-veg stay with shuttle',
        ],
        default_itinerary: [
          {
            day: 1,
            title: 'Sainagar Shirdi Arrival & Samadhi Mandir Darshan',
            morning_ritual: 'Sainagar Shirdi station pickup & check-in',
            darshan_window: '02:30 PM Samadhi Mandir Paid / Senior Gate 6 · 04:30 PM Dwarkamai',
            evening_program: '06:15 PM Dhoop Aarti & Sansthan Prasadalaya dinner',
            included: true,
          },
          {
            day: 2,
            title: 'Chavadi Morning Prayers & Shani Shingnapur',
            morning_ritual: '06:00 AM Kakad / Morning Samadhi visit & Lendi Baug',
            darshan_window: '10:30 AM Shani Shingnapur Open Shrine',
            evening_program: 'Return boarding from Sainagar Shirdi / Kopargaon',
            included: true,
          },
        ],
      },
    ];

    const insertCircuit = db.prepare(`
      INSERT OR IGNORE INTO circuits (
        id, slug, title, category, region, deity, temples_json, duration_days,
        image_url, booking_status, window_label, window_opens_at, slots_total,
        slots_remaining, price_seva, price_parivar, price_rajasi, summary,
        highlights_json, default_itinerary_json
      ) VALUES (
        @id, @slug, @title, @category, @region, @deity, @temples_json, @duration_days,
        @image_url, @booking_status, @window_label, @window_opens_at, @slots_total,
        @slots_remaining, @price_seva, @price_parivar, @price_rajasi, @summary,
        @highlights_json, @default_itinerary_json
      )
    `);
    const insertDarshan = db.prepare(`
      INSERT OR IGNORE INTO darshan_slots (id, circuit_id, slot_name, slot_time, tier_access, surcharge, seats_remaining, is_vip)
      VALUES (@id, @circuit_id, @slot_name, @slot_time, @tier_access, @surcharge, @seats_remaining, @is_vip)
    `);
    const insertTrain = db.prepare(`
      INSERT OR IGNORE INTO train_routes (
        id, circuit_id, train_number, train_name, origin_city, arrival_station,
        departure_time, arrival_time, duration_text, classes_json, live_status
      ) VALUES (
        @id, @circuit_id, @train_number, @train_name, @origin_city, @arrival_station,
        @departure_time, @arrival_time, @duration_text, @classes_json, @live_status
      )
    `);
    const insertStay = db.prepare(`
      INSERT OR IGNORE INTO stays (id, circuit_id, name, tier, stay_type, distance_to_temple, meal_plan, price_per_night)
      VALUES (@id, @circuit_id, @name, @tier, @stay_type, @distance_to_temple, @meal_plan, @price_per_night)
    `);

    const tx = db.transaction(() => {
      for (const c of universalCircuits) {
        insertCircuit.run({
          id: c.id,
          slug: c.slug,
          title: c.title,
          category: c.category,
          region: c.region,
          deity: c.deity,
          temples_json: JSON.stringify(c.temples),
          duration_days: c.duration_days,
          image_url: c.image_url,
          booking_status: c.booking_status,
          window_label: c.window_label,
          window_opens_at: c.window_opens_at,
          slots_total: c.slots_total,
          slots_remaining: c.slots_remaining,
          price_seva: c.price_seva,
          price_parivar: c.price_parivar,
          price_rajasi: c.price_rajasi,
          summary: c.summary,
          highlights_json: JSON.stringify(c.highlights),
          default_itinerary_json: JSON.stringify(c.default_itinerary),
        });

        insertDarshan.run({
          id: `${c.id}-morning`,
          circuit_id: c.id,
          slot_name: c.id === 'buddhist-sacred-circuit' ? 'Sunrise Bodhi Chanting & Parikrama' : 'Senior & Family Gate 6 Morning Pass',
          slot_time: '06:00 AM – 08:30 AM',
          tier_access: 'ALL',
          surcharge: 0,
          seats_remaining: 36,
          is_vip: 0,
        });
        insertDarshan.run({
          id: `${c.id}-priority`,
          circuit_id: c.id,
          slot_name: c.id === 'buddhist-sacred-circuit' ? 'Guided Meditation & Stupa Priority Access' : 'Sansthan Priority Time-Slot & Dhoop Aarti',
          slot_time: '04:00 PM – 06:30 PM',
          tier_access: 'PARIVAR_PLUS',
          surcharge: 450,
          seats_remaining: 20,
          is_vip: 1,
        });

        insertStay.run({
          id: `${c.id}-stay-seva`,
          circuit_id: c.id,
          name: c.id === 'buddhist-sacred-circuit' ? 'Bodh Gaya Sangha Pilgrim Guest House' : 'Shirdi Sansthan Bhakta Niwas',
          tier: 'SEVA',
          stay_type: 'Clean Ground-Floor / Lift Pilgrim Stay',
          distance_to_temple: '150m flat path',
          meal_plan: 'Pure Veg Satvik Thali',
          price_per_night: 750,
        });
        insertStay.run({
          id: `${c.id}-stay-parivar`,
          circuit_id: c.id,
          name: c.id === 'buddhist-sacred-circuit' ? 'Vajra Heritage Peace Lodge' : 'Sai Tulasi Family Residency',
          tier: 'PARIVAR',
          stay_type: '3-Star Accessible Pure-Veg Stay',
          distance_to_temple: '220m with e-rickshaw transfer',
          meal_plan: 'Breakfast & Dinner Included',
          price_per_night: 2200,
        });
        insertStay.run({
          id: `${c.id}-stay-rajasi`,
          circuit_id: c.id,
          name: c.id === 'buddhist-sacred-circuit' ? 'Lotus Enlightenment Sanctuary Suites' : 'Shirdi Retreat Courtyard Suites',
          tier: 'RAJASI',
          stay_type: '5-Star Peaceful Garden Suite',
          distance_to_temple: 'Private Battery Cart Transfer',
          meal_plan: 'All-Day Satvik Kitchen',
          price_per_night: 5900,
        });
      }

      insertTrain.run({
        id: 'tr-mahabodhi-exp',
        circuit_id: 'buddhist-sacred-circuit',
        train_number: '12398',
        train_name: 'Mahabodhi SF Express',
        origin_city: 'New Delhi (NDLS)',
        arrival_station: 'Gaya Jn (GAYA)',
        departure_time: '12:50',
        arrival_time: '02:55',
        duration_text: '14h 05m',
        classes_json: JSON.stringify([
          { code: 'SL', label: 'Sleeper', fare: 510, available: 42 },
          { code: '3A', label: 'AC 3 Tier', fare: 1320, available: 24 },
          { code: '2A', label: 'AC 2 Tier', fare: 1890, available: 10 },
          { code: '1A', label: 'First AC', fare: 3180, available: 4 },
        ]),
        live_status: 'Direct Bodh Gaya Gateway',
      });

      insertTrain.run({
        id: 'tr-shirdi-vb',
        circuit_id: 'shirdi-shani-teerth',
        train_number: '22223',
        train_name: 'Mumbai CSMT – Sainagar Shirdi Vande Bharat',
        origin_city: 'Mumbai CSMT',
        arrival_station: 'Sainagar Shirdi (SNSI)',
        departure_time: '06:20',
        arrival_time: '11:40',
        duration_text: '5h 20m',
        classes_json: JSON.stringify([
          { code: 'CC', label: 'AC Chair Car', fare: 975, available: 34 },
          { code: 'EC', label: 'Executive Chair Car', fare: 1840, available: 11 },
        ]),
        live_status: 'Senior Favorite · Step-Free Platform',
      });
    });
    tx();
  }

  // Ensure vibrant destination-specific images and Shree Jagannath Puri Dham (Odisha) are synced
  const syncTx = db.transaction(() => {
    const updateTempleImg = db.prepare('UPDATE temples_directory SET image_url = ? WHERE id = ?');
    const insOrIgnoreTemple = db.prepare(`
      INSERT OR IGNORE INTO temples_directory (
        id, name, tradition, location, state, deity_or_focus, darshan_timings,
        aarti_timings, opening_closing, online_booking_info, entry_requirements,
        dress_code, photography_rules, festivals_json, official_website,
        source_authority, crowd_weekday, crowd_weekend, crowd_festival,
        recommended_visit_window, special_darshan_notes, wheelchair_accessible,
        ramps_and_lifts, walking_distance_note, resting_zones, medical_facility,
        nearby_pharmacy, emergency_contact, history_summary, significance_summary,
        rituals_summary, faqs_json, image_url
      ) VALUES (
        @id, @name, @tradition, @location, @state, @deity_or_focus, @darshan_timings,
        @aarti_timings, @opening_closing, @online_booking_info, @entry_requirements,
        @dress_code, @photography_rules, @festivals_json, @official_website,
        @source_authority, @crowd_weekday, @crowd_weekend, @crowd_festival,
        @recommended_visit_window, @special_darshan_notes, @wheelchair_accessible,
        @ramps_and_lifts, @walking_distance_note, @resting_zones, @medical_facility,
        @nearby_pharmacy, @emergency_contact, @history_summary, @significance_summary,
        @rituals_summary, @faqs_json, @image_url
      )
    `);

    for (const t of VERIFIED_TEMPLES_SEED) {
      insOrIgnoreTemple.run({
        ...t,
        festivals_json: JSON.stringify(t.festivals),
        faqs_json: JSON.stringify(t.faqs),
      });
      updateTempleImg.run(t.image_url, t.id);
    }

    const updateCircuitImg = db.prepare('UPDATE circuits SET image_url = ? WHERE id = ?');
    updateCircuitImg.run('/src/assets/images/tirupati_balaji_1795712131516.jpg', 'tirupati-kanchi-divya-desam');
    updateCircuitImg.run('/src/assets/images/shirdi_saibaba_1795712133273.jpg', 'shirdi-shani-teerth');
    updateCircuitImg.run('/src/assets/images/ujjain_mahakal_1795712133305.jpg', 'ujjain-mahakal-omkareshwar');
    updateCircuitImg.run('/src/assets/images/trimbakeshwar_shiva_1795712132766.jpg', 'maharashtra-jyotirlinga-trio');

    const puriExists = db
      .prepare('SELECT id FROM circuits WHERE id = ?')
      .get('jagannath-puri-konark-odisha');

    if (!puriExists) {
      const puriCircuit = {
        id: 'jagannath-puri-konark-odisha',
        slug: 'shree-jagannath-puri-konark-odisha',
        title: 'Shree Jagannath Puri, Konark & Lingaraj Odisha Yatra',
        category: 'Char Dham',
        region: 'Odisha (Puri · Konark · Bhubaneswar)',
        deity: 'Lord Jagannath, Balabhadra & Devi Subhadra',
        temples: [
          { order: 1, name: 'Shree Jagannath Temple', town: 'Puri', deity: 'Lord Jagannath (Char Dham East)', highlight: 'Mangala Alati, Singhadwara & Anand Bazaar Mahaprasad' },
          { order: 2, name: 'Gundicha & Lokanath Mandir', town: 'Puri', deity: 'Shiva & Rath Yatra Garden Shrine', highlight: 'Sacred chariot destination & serene lotus tank' },
          { order: 3, name: 'Konark Sun Temple & Chandrabhaga', town: 'Konark', deity: 'Surya Narayana', highlight: 'UNESCO 13th-century stone chariot marvel' },
          { order: 4, name: 'Lingaraj & Mukteswar Temples', town: 'Bhubaneswar', deity: 'Harihara Shiva', highlight: 'Ancient Kalinga architecture & Bindu Sagar' },
        ],
        duration_days: 4,
        image_url: '/src/assets/images/jagannath_puri_1795712131738.jpg',
        booking_status: 'LIVE_NOW',
        window_label: 'Kartika & Winter Darshan Window',
        window_opens_at: '2026-11-26',
        slots_total: 140,
        slots_remaining: 27,
        price_seva: 4250,
        price_parivar: 8600,
        price_rajasi: 18400,
        summary: 'Eastern Char Dham pilgrimage to Shree Jagannath Puri in Odisha with Puri Vande Bharat & Purushottam Express berths, North Gate senior ramp entry, and Abadha Mahaprasad.',
        highlights: [
          'North Gate (Hastidwara) wheelchair & senior step-free assistance',
          'Includes Anand Bazaar Mahaprasad token & Puri sea-coast Bhakta Niwas',
          'Howrah–Puri Vande Bharat & New Delhi Purushottam Express rail integration',
        ],
        default_itinerary: [
          {
            day: 1,
            title: 'Puri Arrival & Evening Singhadwara Darshan',
            morning_ritual: 'Puri station pickup & check-in near Grand Road',
            darshan_window: '05:00 PM Singhadwara & Patitapabana · 07:00 PM Sandhya Alati',
            evening_program: 'Abadha Mahaprasad dinner & Golden Beach walk',
            included: true,
          },
          {
            day: 2,
            title: 'Mangala Alati & Gundicha Mandir',
            morning_ritual: '05:30 AM Shree Jagannath Mangala Alati',
            darshan_window: '06:30 AM Abakasha · 11:00 AM Gundicha & Lokanath Temple',
            evening_program: 'Narendra Pokhari evening lamps & Bhajan Sandhya',
            included: true,
          },
          {
            day: 3,
            title: 'Konark Sun Temple & Sakshigopal',
            morning_ritual: 'Sunrise coastal drive along Marine Drive',
            darshan_window: '09:00 AM Konark Sun Temple · 03:30 PM Sakshigopal Temple',
            evening_program: 'Rest at Puri stay',
            included: true,
          },
          {
            day: 4,
            title: 'Bhubaneswar Lingaraj Temple & Rail Departure',
            morning_ritual: 'Drive to Ekamra Kshetra (Bhubaneswar)',
            darshan_window: '09:30 AM Lingaraj Temple · 11:30 AM Mukteswar',
            evening_program: 'Bhubaneswar / Puri rail boarding',
            included: true,
          },
        ],
      };

      db.prepare(`
        INSERT OR IGNORE INTO circuits (
          id, slug, title, category, region, deity, temples_json, duration_days,
          image_url, booking_status, window_label, window_opens_at, slots_total,
          slots_remaining, price_seva, price_parivar, price_rajasi, summary,
          highlights_json, default_itinerary_json
        ) VALUES (
          @id, @slug, @title, @category, @region, @deity, @temples_json, @duration_days,
          @image_url, @booking_status, @window_label, @window_opens_at, @slots_total,
          @slots_remaining, @price_seva, @price_parivar, @price_rajasi, @summary,
          @highlights_json, @default_itinerary_json
        )
      `).run({
        id: puriCircuit.id,
        slug: puriCircuit.slug,
        title: puriCircuit.title,
        category: puriCircuit.category,
        region: puriCircuit.region,
        deity: puriCircuit.deity,
        temples_json: JSON.stringify(puriCircuit.temples),
        duration_days: puriCircuit.duration_days,
        image_url: puriCircuit.image_url,
        booking_status: puriCircuit.booking_status,
        window_label: puriCircuit.window_label,
        window_opens_at: puriCircuit.window_opens_at,
        slots_total: puriCircuit.slots_total,
        slots_remaining: puriCircuit.slots_remaining,
        price_seva: puriCircuit.price_seva,
        price_parivar: puriCircuit.price_parivar,
        price_rajasi: puriCircuit.price_rajasi,
        summary: puriCircuit.summary,
        highlights_json: JSON.stringify(puriCircuit.highlights),
        default_itinerary_json: JSON.stringify(puriCircuit.default_itinerary),
      });

      const insDarshan = db.prepare(`
        INSERT OR IGNORE INTO darshan_slots (id, circuit_id, slot_name, slot_time, tier_access, surcharge, seats_remaining, is_vip)
        VALUES (@id, @circuit_id, @slot_name, @slot_time, @tier_access, @surcharge, @seats_remaining, @is_vip)
      `);
      insDarshan.run({
        id: 'jagannath-puri-mangala',
        circuit_id: puriCircuit.id,
        slot_name: 'Mangala Alati & North Gate Senior Access',
        slot_time: '05:30 AM – 07:30 AM',
        tier_access: 'ALL',
        surcharge: 0,
        seats_remaining: 38,
        is_vip: 0,
      });
      insDarshan.run({
        id: 'jagannath-puri-sandhya',
        circuit_id: puriCircuit.id,
        slot_name: 'Sandhya Alati & Anand Bazaar Mahaprasad Pass',
        slot_time: '06:00 PM – 08:30 PM',
        tier_access: 'PARIVAR_PLUS',
        surcharge: 550,
        seats_remaining: 20,
        is_vip: 1,
      });

      const insStay = db.prepare(`
        INSERT OR IGNORE INTO stays (id, circuit_id, name, tier, stay_type, distance_to_temple, meal_plan, price_per_night)
        VALUES (@id, @circuit_id, @name, @tier, @stay_type, @distance_to_temple, @meal_plan, @price_per_night)
      `);
      insStay.run({
        id: 'jagannath-puri-stay-seva',
        circuit_id: puriCircuit.id,
        name: 'Neelachal Bhakta Niwas Puri',
        tier: 'SEVA',
        stay_type: 'SJTA Pilgrim Rest House (Clean Ground & Lift)',
        distance_to_temple: '180m from Grand Road',
        meal_plan: 'Pure Veg Odia Satvik Thali',
        price_per_night: 700,
      });
      insStay.run({
        id: 'jagannath-puri-stay-parivar',
        circuit_id: puriCircuit.id,
        name: 'Swargadwar Sea-View Satvik Residency',
        tier: 'PARIVAR',
        stay_type: '3-Star Family AC Stay near Beach & Temple',
        distance_to_temple: '350m with Battery E-Cart',
        meal_plan: 'Breakfast & Temple Mahaprasad',
        price_per_night: 2350,
      });
      insStay.run({
        id: 'jagannath-puri-stay-rajasi',
        circuit_id: puriCircuit.id,
        name: 'Puri Heritage Coast Sanctuary Suites',
        tier: 'RAJASI',
        stay_type: '5-Star Coastal Suite with Guide',
        distance_to_temple: 'Private E-Cart to North Gate',
        meal_plan: 'All-Day Satvik Kitchen',
        price_per_night: 6100,
      });

      const insTrain = db.prepare(`
        INSERT OR IGNORE INTO train_routes (
          id, circuit_id, train_number, train_name, origin_city, arrival_station,
          departure_time, arrival_time, duration_text, classes_json, live_status
        ) VALUES (
          @id, @circuit_id, @train_number, @train_name, @origin_city, @arrival_station,
          @departure_time, @arrival_time, @duration_text, @classes_json, @live_status
        )
      `);
      insTrain.run({
        id: 'tr-puri-vb',
        circuit_id: puriCircuit.id,
        train_number: '22895',
        train_name: 'Howrah – Puri Vande Bharat Express',
        origin_city: 'Howrah (HWH)',
        arrival_station: 'Puri (PURI)',
        departure_time: '06:10',
        arrival_time: '12:35',
        duration_text: '6h 25m',
        classes_json: JSON.stringify([
          { code: 'CC', label: 'Chair Car', fare: 1440, available: 30 },
          { code: 'EC', label: 'Executive Chair', fare: 2680, available: 8 },
        ]),
        live_status: 'Booking Open · Direct Coastal Rail',
      });
      insTrain.run({
        id: 'tr-purushottam-exp',
        circuit_id: puriCircuit.id,
        train_number: '12802',
        train_name: 'Purushottam SF Express',
        origin_city: 'New Delhi (NDLS)',
        arrival_station: 'Puri (PURI)',
        departure_time: '22:40',
        arrival_time: '05:25',
        duration_text: '30h 45m',
        classes_json: JSON.stringify([
          { code: 'SL', label: 'Sleeper', fare: 740, available: 44 },
          { code: '3A', label: 'AC 3 Tier', fare: 1920, available: 21 },
          { code: '2A', label: 'AC 2 Tier', fare: 2780, available: 9 },
        ]),
        live_status: 'Classic Pilgrimage Express',
      });
    }

    const ayodhyaExists = db
      .prepare('SELECT id FROM circuits WHERE id = ?')
      .get('ram-mandir-ayodhya');

    if (!ayodhyaExists) {
      const ayodhyaCircuit = {
        id: 'ram-mandir-ayodhya',
        slug: 'ram-mandir-ayodhya-yatra',
        title: 'Ram Mandir, Ayodhya & Sarayu Darshan',
        category: 'Regional Teerth',
        region: 'Uttar Pradesh (Ayodhya)',
        deity: 'Shri Ram Lalla Virajman & Hanuman Garhi',
        temples: [
          { order: 1, name: 'Hanuman Garhi', town: 'Ayodhya', deity: 'Lord Hanuman', highlight: 'Traditional gateway darshan before Ram Lalla' },
          { order: 2, name: 'Dashrath Mahal', town: 'Ayodhya', deity: 'Royal Palace Shrine', highlight: 'Historic courtyard & evening bhajan' },
          { order: 3, name: 'Shri Ram Janmabhoomi Mandir', town: 'Ayodhya', deity: 'Ram Lalla', highlight: 'Mangala / Shringar / Sandhya Aarti & Sugam Pass' },
          { order: 4, name: 'Surya Kund & Ram Ki Paidi', town: 'Ayodhya', deity: 'Sarayu Ghat', highlight: 'Evening Sarayu Aarti & Ramayana laser show' },
        ],
        duration_days: 3,
        image_url: '/src/assets/images/ayodhya_ram_mandir_1795712703190.jpg',
        booking_status: 'LIVE_NOW',
        window_label: 'Daily Ram Lalla Sugam Window',
        window_opens_at: '2026-11-26',
        slots_total: 160,
        slots_remaining: 33,
        price_seva: 3600,
        price_parivar: 7900,
        price_rajasi: 17900,
        summary: 'Dedicated Ayodhya yatra covering Hanuman Garhi, Dashrath Mahal, Ram Janmabhoomi Mandir, and Surya Kund with Vande Bharat rail sync and senior e-cart care.',
        highlights: [
          'Free Wheelchair & Battery Golf Cart inside Janmabhoomi Path',
          'Includes Ayodhya Dham Vande Bharat & Kaifiyat Express train options',
          'Sarayu Ghat evening aarti & pure satvik meals',
        ],
        default_itinerary: [
          {
            day: 1,
            title: 'Hanuman Garhi, Dashrath Mahal & Ram Mandir',
            morning_ritual: 'Ayodhya Dham station arrival & check-in',
            darshan_window: '09:00 AM Hanuman Garhi · 11:00 AM Dashrath Mahal · 04:00 PM Ram Lalla',
            evening_program: 'Sarayu Ram Ki Paidi evening Aarti',
            included: true,
          },
          {
            day: 2,
            title: 'Kanak Bhawan, Surya Kund & Guptar Ghat',
            morning_ritual: '06:30 AM Shringar Darshan & Kanak Bhawan',
            darshan_window: '10:30 AM Kanak Bhawan · 04:30 PM Surya Kund',
            evening_program: 'Satvik dinner & rest',
            included: true,
          },
          {
            day: 3,
            title: 'Nageshwarnath Temple & Return Departure',
            morning_ritual: 'Morning Sarayu darshan & Nageshwarnath Mandir',
            darshan_window: '08:00 AM Nageshwarnath',
            evening_program: 'Ayodhya Dham Jn rail departure',
            included: true,
          },
        ],
      };

      db.prepare(`
        INSERT OR IGNORE INTO circuits (
          id, slug, title, category, region, deity, temples_json, duration_days,
          image_url, booking_status, window_label, window_opens_at, slots_total,
          slots_remaining, price_seva, price_parivar, price_rajasi, summary,
          highlights_json, default_itinerary_json
        ) VALUES (
          @id, @slug, @title, @category, @region, @deity, @temples_json, @duration_days,
          @image_url, @booking_status, @window_label, @window_opens_at, @slots_total,
          @slots_remaining, @price_seva, @price_parivar, @price_rajasi, @summary,
          @highlights_json, @default_itinerary_json
        )
      `).run({
        id: ayodhyaCircuit.id,
        slug: ayodhyaCircuit.slug,
        title: ayodhyaCircuit.title,
        category: ayodhyaCircuit.category,
        region: ayodhyaCircuit.region,
        deity: ayodhyaCircuit.deity,
        temples_json: JSON.stringify(ayodhyaCircuit.temples),
        duration_days: ayodhyaCircuit.duration_days,
        image_url: ayodhyaCircuit.image_url,
        booking_status: ayodhyaCircuit.booking_status,
        window_label: ayodhyaCircuit.window_label,
        window_opens_at: ayodhyaCircuit.window_opens_at,
        slots_total: ayodhyaCircuit.slots_total,
        slots_remaining: ayodhyaCircuit.slots_remaining,
        price_seva: ayodhyaCircuit.price_seva,
        price_parivar: ayodhyaCircuit.price_parivar,
        price_rajasi: ayodhyaCircuit.price_rajasi,
        summary: ayodhyaCircuit.summary,
        highlights_json: JSON.stringify(ayodhyaCircuit.highlights),
        default_itinerary_json: JSON.stringify(ayodhyaCircuit.default_itinerary),
      });

      const insD = db.prepare(`
        INSERT OR IGNORE INTO darshan_slots (id, circuit_id, slot_name, slot_time, tier_access, surcharge, seats_remaining, is_vip)
        VALUES (@id, @circuit_id, @slot_name, @slot_time, @tier_access, @surcharge, @seats_remaining, @is_vip)
      `);
      insD.run({
        id: 'ayodhya-mangala',
        circuit_id: ayodhyaCircuit.id,
        slot_name: 'Mangala / Shringar Morning Pass',
        slot_time: '06:30 AM – 08:30 AM',
        tier_access: 'ALL',
        surcharge: 0,
        seats_remaining: 40,
        is_vip: 0,
      });
      insD.run({
        id: 'ayodhya-sandhya',
        circuit_id: ayodhyaCircuit.id,
        slot_name: 'Sandhya Aarti & Sugam E-Cart Priority',
        slot_time: '06:30 PM – 08:00 PM',
        tier_access: 'PARIVAR_PLUS',
        surcharge: 450,
        seats_remaining: 24,
        is_vip: 1,
      });

      const insS = db.prepare(`
        INSERT OR IGNORE INTO stays (id, circuit_id, name, tier, stay_type, distance_to_temple, meal_plan, price_per_night)
        VALUES (@id, @circuit_id, @name, @tier, @stay_type, @distance_to_temple, @meal_plan, @price_per_night)
      `);
      insS.run({
        id: 'ayodhya-stay-seva',
        circuit_id: ayodhyaCircuit.id,
        name: 'Ramkot Pilgrim Bhakta Niwas',
        tier: 'SEVA',
        stay_type: 'Clean Ground & Lift Family Guest House',
        distance_to_temple: '300m from Janmabhoomi Path',
        meal_plan: 'Pure Veg Satvik Thali',
        price_per_night: 750,
      });
      insS.run({
        id: 'ayodhya-stay-parivar',
        circuit_id: ayodhyaCircuit.id,
        name: 'Sarayu Heritage Family Stay',
        tier: 'PARIVAR',
        stay_type: '3-Star AC Hotel with E-Rickshaw',
        distance_to_temple: '450m near Ram Ki Paidi',
        meal_plan: 'Breakfast & Satvik Dinner',
        price_per_night: 2400,
      });
      insS.run({
        id: 'ayodhya-stay-rajasi',
        circuit_id: ayodhyaCircuit.id,
        name: 'Avadh Sanctuary Retreat',
        tier: 'RAJASI',
        stay_type: '5-Star Peaceful Garden Suite',
        distance_to_temple: 'Private Drop to PFC Gate',
        meal_plan: 'All-Day Satvik Kitchen',
        price_per_night: 6200,
      });

      db.prepare(`
        INSERT OR IGNORE INTO train_routes (
          id, circuit_id, train_number, train_name, origin_city, arrival_station,
          departure_time, arrival_time, duration_text, classes_json, live_status
        ) VALUES (
          @id, @circuit_id, @train_number, @train_name, @origin_city, @arrival_station,
          @departure_time, @arrival_time, @duration_text, @classes_json, @live_status
        )
      `).run({
        id: 'tr-ayodhya-vb',
        circuit_id: ayodhyaCircuit.id,
        train_number: '22426',
        train_name: 'Anand Vihar – Ayodhya Dham Vande Bharat',
        origin_city: 'Delhi (ANVT)',
        arrival_station: 'Ayodhya Dham (AY)',
        departure_time: '06:10',
        arrival_time: '14:30',
        duration_text: '8h 20m',
        classes_json: JSON.stringify([
          { code: 'CC', label: 'Chair Car', fare: 1620, available: 34 },
          { code: 'EC', label: 'Executive Chair', fare: 2990, available: 10 },
        ]),
        live_status: 'Daily Direct Vande Bharat',
      });
    }

    const dwarkaExists = db
      .prepare('SELECT id FROM circuits WHERE id = ?')
      .get('dwarka-somnath-gujarat');

    if (!dwarkaExists) {
      const dwarkaCircuit = {
        id: 'dwarka-somnath-gujarat',
        slug: 'dwarka-somnath-gujarat-yatra',
        title: 'Dwarka & Somnath Sacred Gujarat Yatra',
        category: 'Char Dham',
        region: 'Gujarat (Dwarka · Bet Dwarka · Somnath)',
        deity: 'Shri Dwarkadhish Krishna & Somnath Jyotirlinga',
        temples: [
          { order: 1, name: 'Shri Dwarkadhish Jagat Mandir', town: 'Dwarka', deity: 'Lord Krishna', highlight: 'Western Char Dham & sacred Dhaja ceremony' },
          { order: 2, name: 'Nageshwar Jyotirlinga & Bet Dwarka', town: 'Dwarka', deity: 'Nageshwar Shiva', highlight: '8th Jyotirlinga & Sudarshan Setu island crossing' },
          { order: 3, name: 'Shri Somnath Jyotirlinga', town: 'Prabhas Patan', deity: 'First Jyotirlinga', highlight: 'Arabian Sea shore temple & light-and-sound evening' },
        ],
        duration_days: 4,
        image_url: '/src/assets/images/dwarka_temple_1795712703669.jpg',
        booking_status: 'LIVE_NOW',
        window_label: 'Winter Coastal Char Dham Open',
        window_opens_at: '2026-11-26',
        slots_total: 130,
        slots_remaining: 29,
        price_seva: 4400,
        price_parivar: 9100,
        price_rajasi: 19600,
        summary: 'Western Char Dham & First Jyotirlinga coastal pilgrimage combining Dwarkadhish, Nageshwar, Bet Dwarka via Sudarshan Setu, and Somnath Express rail.',
        highlights: [
          'Moksha Dwar step-free wheelchair entry at Dwarkadhish',
          'Includes Somnath Express & Saurashtra Mail rail coordination',
          'Pure Kathiyawadi / Gujarati Satvik Bhojan included',
        ],
        default_itinerary: [
          {
            day: 1,
            title: 'Dwarka Arrival & Evening Dhaja Darshan',
            morning_ritual: 'Dwarka station pickup & Gomti Ghat check-in',
            darshan_window: '05:30 PM Dwarkadhish Temple · 07:30 PM Sandhya Aarti',
            evening_program: 'Gomti Ghat lamps & Gujarati satvik dinner',
            included: true,
          },
          {
            day: 2,
            title: 'Nageshwar Jyotirlinga & Bet Dwarka',
            morning_ritual: 'Morning Rukmini Devi Mandir',
            darshan_window: '09:30 AM Nageshwar Jyotirlinga · 12:00 PM Bet Dwarka',
            evening_program: 'Sunset along Bhadkeshwar Mahadev point',
            included: true,
          },
          {
            day: 3,
            title: 'Porbandar Sudamapuri to Somnath Jyotirlinga',
            morning_ritual: 'Coastal highway drive via Sudama Temple',
            darshan_window: '05:00 PM Somnath Jyotirlinga · 07:00 PM Evening Aarti',
            evening_program: 'Sound & light show overlooking Arabian Sea',
            included: true,
          },
          {
            day: 4,
            title: 'Bhalka Tirth & Rail Departure',
            morning_ritual: 'Pratah Somnath Darshan & Triveni Sangam',
            darshan_window: '08:30 AM Bhalka Tirth',
            evening_program: 'Veraval / Rajkot rail departure',
            included: true,
          },
        ],
      };

      db.prepare(`
        INSERT OR IGNORE INTO circuits (
          id, slug, title, category, region, deity, temples_json, duration_days,
          image_url, booking_status, window_label, window_opens_at, slots_total,
          slots_remaining, price_seva, price_parivar, price_rajasi, summary,
          highlights_json, default_itinerary_json
        ) VALUES (
          @id, @slug, @title, @category, @region, @deity, @temples_json, @duration_days,
          @image_url, @booking_status, @window_label, @window_opens_at, @slots_total,
          @slots_remaining, @price_seva, @price_parivar, @price_rajasi, @summary,
          @highlights_json, @default_itinerary_json
        )
      `).run({
        id: dwarkaCircuit.id,
        slug: dwarkaCircuit.slug,
        title: dwarkaCircuit.title,
        category: dwarkaCircuit.category,
        region: dwarkaCircuit.region,
        deity: dwarkaCircuit.deity,
        temples_json: JSON.stringify(dwarkaCircuit.temples),
        duration_days: dwarkaCircuit.duration_days,
        image_url: dwarkaCircuit.image_url,
        booking_status: dwarkaCircuit.booking_status,
        window_label: dwarkaCircuit.window_label,
        window_opens_at: dwarkaCircuit.window_opens_at,
        slots_total: dwarkaCircuit.slots_total,
        slots_remaining: dwarkaCircuit.slots_remaining,
        price_seva: dwarkaCircuit.price_seva,
        price_parivar: dwarkaCircuit.price_parivar,
        price_rajasi: dwarkaCircuit.price_rajasi,
        summary: dwarkaCircuit.summary,
        highlights_json: JSON.stringify(dwarkaCircuit.highlights),
        default_itinerary_json: JSON.stringify(dwarkaCircuit.default_itinerary),
      });

      const insD = db.prepare(`
        INSERT OR IGNORE INTO darshan_slots (id, circuit_id, slot_name, slot_time, tier_access, surcharge, seats_remaining, is_vip)
        VALUES (@id, @circuit_id, @slot_name, @slot_time, @tier_access, @surcharge, @seats_remaining, @is_vip)
      `);
      insD.run({
        id: 'dwarka-mangala',
        circuit_id: dwarkaCircuit.id,
        slot_name: 'Mangala Morning & Moksha Dwar Ramp Pass',
        slot_time: '06:30 AM – 08:30 AM',
        tier_access: 'ALL',
        surcharge: 0,
        seats_remaining: 42,
        is_vip: 0,
      });
      insD.run({
        id: 'dwarka-sandhya',
        circuit_id: dwarkaCircuit.id,
        slot_name: 'Sandhya Dhaja & Somnath Priority Mandapam',
        slot_time: '06:30 PM – 08:30 PM',
        tier_access: 'PARIVAR_PLUS',
        surcharge: 500,
        seats_remaining: 20,
        is_vip: 1,
      });

      const insS = db.prepare(`
        INSERT OR IGNORE INTO stays (id, circuit_id, name, tier, stay_type, distance_to_temple, meal_plan, price_per_night)
        VALUES (@id, @circuit_id, @name, @tier, @stay_type, @distance_to_temple, @meal_plan, @price_per_night)
      `);
      insS.run({
        id: 'dwarka-stay-seva',
        circuit_id: dwarkaCircuit.id,
        name: 'Gomti Pilgrim Bhakta Niwas',
        tier: 'SEVA',
        stay_type: 'Clean Ground & Lift Yatri Stay',
        distance_to_temple: '200m from Moksha Dwar',
        meal_plan: 'Pure Veg Gujarati Thali',
        price_per_night: 700,
      });
      insS.run({
        id: 'dwarka-stay-parivar',
        circuit_id: dwarkaCircuit.id,
        name: 'Dwarka Coastline Family Residency',
        tier: 'PARIVAR',
        stay_type: '3-Star AC Stay with Shuttle',
        distance_to_temple: '350m from Jagat Mandir',
        meal_plan: 'Breakfast & Satvik Dinner',
        price_per_night: 2300,
      });
      insS.run({
        id: 'dwarka-stay-rajasi',
        circuit_id: dwarkaCircuit.id,
        name: 'Dwarkadhish Seafront Sanctuary',
        tier: 'RAJASI',
        stay_type: '5-Star Coastal Suite',
        distance_to_temple: 'Private Cart to Temple Gate',
        meal_plan: 'All-Day Satvik Kitchen',
        price_per_night: 6000,
      });

      db.prepare(`
        INSERT OR IGNORE INTO train_routes (
          id, circuit_id, train_number, train_name, origin_city, arrival_station,
          departure_time, arrival_time, duration_text, classes_json, live_status
        ) VALUES (
          @id, @circuit_id, @train_number, @train_name, @origin_city, @arrival_station,
          @departure_time, @arrival_time, @duration_text, @classes_json, @live_status
        )
      `).run({
        id: 'tr-saurashtra-mail',
        circuit_id: dwarkaCircuit.id,
        train_number: '22945',
        train_name: 'Saurashtra Mail SF Express',
        origin_city: 'Mumbai Central (MMCT)',
        arrival_station: 'Dwarka (DWK)',
        departure_time: '21:05',
        arrival_time: '13:45',
        duration_text: '16h 40m',
        classes_json: JSON.stringify([
          { code: 'SL', label: 'Sleeper', fare: 485, available: 45 },
          { code: '3A', label: 'AC 3 Tier', fare: 1290, available: 22 },
          { code: '2A', label: 'AC 2 Tier', fare: 1850, available: 9 },
        ]),
        live_status: 'Direct Mumbai – Dwarka Express',
      });
    }
  });
  syncTx();
}

ensureUniversalSeedData();

function mapTempleRow(row: Record<string, unknown>): TempleDirectoryEntry {
  return {
    id: String(row.id),
    name: String(row.name),
    tradition: row.tradition as TempleDirectoryEntry['tradition'],
    location: String(row.location),
    state: String(row.state),
    deity_or_focus: String(row.deity_or_focus),
    darshan_timings: String(row.darshan_timings),
    aarti_timings: String(row.aarti_timings),
    opening_closing: String(row.opening_closing),
    online_booking_info: String(row.online_booking_info),
    entry_requirements: String(row.entry_requirements),
    dress_code: String(row.dress_code),
    photography_rules: String(row.photography_rules),
    festivals: JSON.parse(String(row.festivals_json)),
    official_website: String(row.official_website),
    source_authority: String(row.source_authority),
    crowd_weekday: String(row.crowd_weekday),
    crowd_weekend: String(row.crowd_weekend),
    crowd_festival: String(row.crowd_festival),
    recommended_visit_window: String(row.recommended_visit_window),
    special_darshan_notes: String(row.special_darshan_notes),
    wheelchair_accessible: Number(row.wheelchair_accessible),
    ramps_and_lifts: String(row.ramps_and_lifts),
    walking_distance_note: String(row.walking_distance_note),
    resting_zones: String(row.resting_zones),
    medical_facility: String(row.medical_facility),
    nearby_pharmacy: String(row.nearby_pharmacy),
    emergency_contact: String(row.emergency_contact),
    history_summary: String(row.history_summary),
    significance_summary: String(row.significance_summary),
    rituals_summary: String(row.rituals_summary),
    faqs: JSON.parse(String(row.faqs_json)),
    image_url: String(row.image_url),
  };
}

export function listTemples(): TempleDirectoryEntry[] {
  const rows = db.prepare('SELECT * FROM temples_directory ORDER BY name ASC').all() as Record<string, unknown>[];
  return rows.map(mapTempleRow);
}

export function getTempleById(templeId: string): TempleDirectoryEntry | null {
  const row = db.prepare('SELECT * FROM temples_directory WHERE id = ?').get(templeId) as Record<string, unknown> | undefined;
  return row ? mapTempleRow(row) : null;
}

function mapCircuitRow(row: Record<string, unknown>): CircuitSummary {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    category: row.category as CircuitSummary['category'],
    region: String(row.region),
    deity: String(row.deity),
    temples: JSON.parse(String(row.temples_json)),
    duration_days: Number(row.duration_days),
    image_url: String(row.image_url),
    booking_status: row.booking_status as CircuitSummary['booking_status'],
    window_label: String(row.window_label),
    window_opens_at: String(row.window_opens_at),
    slots_total: Number(row.slots_total),
    slots_remaining: Number(row.slots_remaining),
    price_seva: Number(row.price_seva),
    price_parivar: Number(row.price_parivar),
    price_rajasi: Number(row.price_rajasi),
    summary: String(row.summary),
    highlights: JSON.parse(String(row.highlights_json)),
    default_itinerary: JSON.parse(String(row.default_itinerary_json)),
  };
}

export function listCircuits(): CircuitSummary[] {
  const rows = db.prepare('SELECT * FROM circuits ORDER BY booking_status ASC, slots_remaining ASC').all() as Record<string, unknown>[];
  return rows.map(mapCircuitRow);
}

export function getCircuitDetail(circuitId: string): CircuitDetail | null {
  const row = db.prepare('SELECT * FROM circuits WHERE id = ?').get(circuitId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const darshanSlots = db
    .prepare('SELECT * FROM darshan_slots WHERE circuit_id = ? ORDER BY surcharge ASC')
    .all(circuitId) as DarshanSlot[];

  const trainRows = db
    .prepare('SELECT * FROM train_routes WHERE circuit_id = ?')
    .all(circuitId) as Record<string, unknown>[];

  const trainRoutes: TrainRoute[] = trainRows.map((tr) => ({
    id: String(tr.id),
    circuit_id: String(tr.circuit_id),
    train_number: String(tr.train_number),
    train_name: String(tr.train_name),
    origin_city: String(tr.origin_city),
    arrival_station: String(tr.arrival_station),
    departure_time: String(tr.departure_time),
    arrival_time: String(tr.arrival_time),
    duration_text: String(tr.duration_text),
    classes: JSON.parse(String(tr.classes_json)) as TrainClassOption[],
    live_status: String(tr.live_status),
  }));

  const stays = db
    .prepare('SELECT * FROM stays WHERE circuit_id = ? ORDER BY price_per_night ASC')
    .all(circuitId) as StayOption[];

  return {
    ...mapCircuitRow(row),
    darshan_slots: darshanSlots,
    train_routes: trainRoutes,
    stays,
  };
}

export function getBookingByPnrOrEmail(query: string): BookingRecord[] {
  const clean = query.trim();
  const rows = db
    .prepare(
      `SELECT b.*, c.title as circuit_title, c.region as circuit_region, c.image_url as circuit_image_url,
              d.slot_name as darshan_slot_name, d.slot_time as darshan_slot_time,
              t.train_number as train_number, t.train_name as train_name,
              t.origin_city as train_origin, t.arrival_station as train_arrival,
              s.name as stay_name, s.distance_to_temple as stay_distance
       FROM bookings b
       JOIN circuits c ON c.id = b.circuit_id
       LEFT JOIN darshan_slots d ON d.id = b.darshan_slot_id
       LEFT JOIN train_routes t ON t.id = b.train_route_id
       LEFT JOIN stays s ON s.id = b.stay_id
       WHERE UPPER(b.pnr) = UPPER(?) OR LOWER(b.pilgrim_email) = LOWER(?)
       ORDER BY b.created_at DESC`
    )
    .all(clean, clean) as Record<string, unknown>[];

  return rows.map(hydrateBookingRow);
}

export function listRecentBookings(limit = 8): BookingRecord[] {
  const rows = db
    .prepare(
      `SELECT b.*, c.title as circuit_title, c.region as circuit_region, c.image_url as circuit_image_url,
              d.slot_name as darshan_slot_name, d.slot_time as darshan_slot_time,
              t.train_number as train_number, t.train_name as train_name,
              t.origin_city as train_origin, t.arrival_station as train_arrival,
              s.name as stay_name, s.distance_to_temple as stay_distance
       FROM bookings b
       JOIN circuits c ON c.id = b.circuit_id
       LEFT JOIN darshan_slots d ON d.id = b.darshan_slot_id
       LEFT JOIN train_routes t ON t.id = b.train_route_id
       LEFT JOIN stays s ON s.id = b.stay_id
       ORDER BY b.created_at DESC
       LIMIT ?`
    )
    .all(limit) as Record<string, unknown>[];

  return rows.map(hydrateBookingRow);
}

export function listBookingsForUser(userId: string, email: string): BookingRecord[] {
  const rows = db
    .prepare(
      `SELECT b.*, c.title as circuit_title, c.region as circuit_region, c.image_url as circuit_image_url,
              d.slot_name as darshan_slot_name, d.slot_time as darshan_slot_time,
              t.train_number as train_number, t.train_name as train_name,
              t.origin_city as train_origin, t.arrival_station as train_arrival,
              s.name as stay_name, s.distance_to_temple as stay_distance
       FROM bookings b
       JOIN circuits c ON c.id = b.circuit_id
       LEFT JOIN darshan_slots d ON d.id = b.darshan_slot_id
       LEFT JOIN train_routes t ON t.id = b.train_route_id
       LEFT JOIN stays s ON s.id = b.stay_id
       WHERE b.user_id = ? OR LOWER(b.pilgrim_email) = LOWER(?)
       ORDER BY b.created_at DESC`
    )
    .all(userId, email) as Record<string, unknown>[];

  return rows.map(hydrateBookingRow);
}

function hydrateBookingRow(row: Record<string, unknown>): BookingRecord {
  const bookingId = String(row.id);
  const updates = db
    .prepare('SELECT * FROM booking_updates WHERE booking_id = ? ORDER BY id DESC')
    .all(bookingId) as BookingUpdate[];

  const latestEmail = db
    .prepare('SELECT * FROM email_dispatches WHERE booking_id = ? ORDER BY id DESC LIMIT 1')
    .get(bookingId) as EmailDispatchRecord | undefined;

  return {
    id: bookingId,
    pnr: String(row.pnr),
    circuit_id: String(row.circuit_id),
    circuit_title: String(row.circuit_title),
    circuit_region: String(row.circuit_region),
    circuit_image_url: String(row.circuit_image_url),
    booking_mode: row.booking_mode as BookingRecord['booking_mode'],
    tier: row.tier as BookingRecord['tier'],
    pilgrim_name: String(row.pilgrim_name),
    pilgrim_email: String(row.pilgrim_email),
    pilgrim_phone: String(row.pilgrim_phone),
    travel_date: String(row.travel_date),
    pilgrim_count: Number(row.pilgrim_count),
    senior_assistance: Number(row.senior_assistance),
    prasad_box: Number(row.prasad_box),
    sankalp_gotra: String(row.sankalp_gotra),
    darshan_slot_id: row.darshan_slot_id ? String(row.darshan_slot_id) : null,
    darshan_slot_name: row.darshan_slot_name ? String(row.darshan_slot_name) : null,
    darshan_slot_time: row.darshan_slot_time ? String(row.darshan_slot_time) : null,
    train_route_id: row.train_route_id ? String(row.train_route_id) : null,
    train_number: row.train_number ? String(row.train_number) : null,
    train_name: row.train_name ? String(row.train_name) : null,
    train_origin: row.train_origin ? String(row.train_origin) : null,
    train_arrival: row.train_arrival ? String(row.train_arrival) : null,
    train_class: String(row.train_class),
    train_coach_berth: String(row.train_coach_berth),
    stay_id: row.stay_id ? String(row.stay_id) : null,
    stay_name: row.stay_name ? String(row.stay_name) : null,
    stay_distance: row.stay_distance ? String(row.stay_distance) : null,
    itinerary: JSON.parse(String(row.itinerary_json)),
    total_amount: Number(row.total_amount),
    status: String(row.status),
    created_at: String(row.created_at),
    updates,
    latest_email: latestEmail ?? null,
  };
}
