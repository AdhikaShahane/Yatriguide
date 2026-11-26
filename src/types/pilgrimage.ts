export type PackageTier = 'SEVA' | 'PARIVAR' | 'RAJASI';

export type BookingWindowStatus = 'LIVE_NOW' | 'PRE_BOOKING' | 'FILLING_FAST';

export type PilgrimCareMode = 'SOLO_YOUTH' | 'ELDERLY_CARE' | 'FAMILY_KIDS';

export type TraditionScope = 'Hindu' | 'Buddhist' | 'Universal / Multi-Faith';

export type CircuitCategory =
  | 'Ashtavinayak'
  | 'Jyotirlinga'
  | 'Char Dham'
  | 'Buddhist Circuit'
  | 'Regional Teerth'
  | 'South Divya Desam';

export interface TempleStop {
  order: number;
  name: string;
  town: string;
  deity: string;
  highlight: string;
}

export interface DarshanSlot {
  id: string;
  circuit_id: string;
  slot_name: string;
  slot_time: string;
  tier_access: 'ALL' | 'PARIVAR_PLUS' | 'RAJASI_VIP';
  surcharge: number;
  seats_remaining: number;
  is_vip: number;
}

export interface TrainClassOption {
  code: 'SL' | '3A' | '2A' | '1A' | 'CC' | 'EC';
  label: string;
  fare: number;
  available: number;
}

export interface TrainRoute {
  id: string;
  circuit_id: string;
  train_number: string;
  train_name: string;
  origin_city: string;
  arrival_station: string;
  departure_time: string;
  arrival_time: string;
  duration_text: string;
  classes: TrainClassOption[];
  live_status: string;
}

export interface StayOption {
  id: string;
  circuit_id: string;
  name: string;
  tier: PackageTier;
  stay_type: string;
  distance_to_temple: string;
  meal_plan: string;
  price_per_night: number;
}

export interface ItineraryDay {
  day: number;
  title: string;
  morning_ritual: string;
  darshan_window: string;
  evening_program: string;
  included: boolean;
  custom_note?: string;
}

export interface CircuitSummary {
  id: string;
  slug: string;
  title: string;
  category: CircuitCategory;
  region: string;
  deity: string;
  temples: TempleStop[];
  duration_days: number;
  image_url: string;
  booking_status: BookingWindowStatus;
  window_label: string;
  window_opens_at: string;
  slots_total: number;
  slots_remaining: number;
  price_seva: number;
  price_parivar: number;
  price_rajasi: number;
  summary: string;
  highlights: string[];
  default_itinerary: ItineraryDay[];
}

export interface CircuitDetail extends CircuitSummary {
  darshan_slots: DarshanSlot[];
  train_routes: TrainRoute[];
  stays: StayOption[];
}

export interface TempleFaq {
  question: string;
  answer: string;
}

export interface TempleDirectoryEntry {
  id: string;
  name: string;
  tradition: TraditionScope;
  location: string;
  state: string;
  deity_or_focus: string;
  darshan_timings: string;
  aarti_timings: string;
  opening_closing: string;
  online_booking_info: string;
  entry_requirements: string;
  dress_code: string;
  photography_rules: string;
  festivals: string[];
  official_website: string;
  source_authority: string;
  crowd_weekday: string;
  crowd_weekend: string;
  crowd_festival: string;
  recommended_visit_window: string;
  special_darshan_notes: string;
  wheelchair_accessible: number;
  ramps_and_lifts: string;
  walking_distance_note: string;
  resting_zones: string;
  medical_facility: string;
  nearby_pharmacy: string;
  emergency_contact: string;
  history_summary: string;
  significance_summary: string;
  rituals_summary: string;
  faqs: TempleFaq[];
  image_url: string;
}

export interface PlannedDayItem {
  day: number;
  headline: string;
  temples_covered: string[];
  verified_darshan_window: string;
  walking_and_rest_plan: string;
  transport_note: string;
  meal_and_hydration: string;
}

export interface PlannedItineraryResult {
  title: string;
  care_mode_summary: string;
  recommended_circuit_id?: string;
  estimated_budget_inr: {
    stay: number;
    transport: number;
    darshan_and_seva: number;
    meals_and_local: number;
    total: number;
  };
  days: PlannedDayItem[];
  accessibility_and_care_notes: string[];
  precautions: string[];
  offline_ready_contacts: string[];
}

export interface BookingUpdate {
  id: number;
  booking_id: string;
  event_type: string;
  message: string;
  created_at: string;
}

export interface EmailDispatchRecord {
  id: number;
  booking_id: string;
  recipient_email: string;
  subject: string;
  delivery_mode: 'SMTP_SENT' | 'LOCAL_DISPATCH_VERIFIED';
  html_body: string;
  sent_at: string;
}

export interface BookingRecord {
  id: string;
  pnr: string;
  circuit_id: string;
  circuit_title: string;
  circuit_region: string;
  circuit_image_url: string;
  booking_mode: 'LIVE_BOOKING' | 'PRE_BOOKING';
  tier: PackageTier;
  pilgrim_name: string;
  pilgrim_email: string;
  pilgrim_phone: string;
  travel_date: string;
  pilgrim_count: number;
  senior_assistance: number;
  prasad_box: number;
  sankalp_gotra: string;
  darshan_slot_id: string | null;
  darshan_slot_name: string | null;
  darshan_slot_time: string | null;
  train_route_id: string | null;
  train_number: string | null;
  train_name: string | null;
  train_origin: string | null;
  train_arrival: string | null;
  train_class: string;
  train_coach_berth: string;
  stay_id: string | null;
  stay_name: string | null;
  stay_distance: string | null;
  itinerary: ItineraryDay[];
  total_amount: number;
  status: string;
  created_at: string;
  updates: BookingUpdate[];
  latest_email?: EmailDispatchRecord | null;
}

export interface LiveFeedEvent {
  id: string;
  type: 'BOOKING_CREATED' | 'PREBOOK_CREATED' | 'STATUS_SYNC' | 'HEARTBEAT';
  pnr?: string;
  circuit_id?: string;
  circuit_title?: string;
  slots_remaining?: number;
  message: string;
  timestamp: string;
}
