import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ParkingSession {
  id: string;
  location: string;
  zone: string;
  started_at: string;
  expires_at: string;
  reminder_enabled: boolean;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
  lat?: number;
  lng?: number;
  payment_due?: number;
  spot_note?: string;
  ended_at?: string | null;
  image_url?: string | null;
}
