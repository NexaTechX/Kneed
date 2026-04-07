export type UserRole = 'client' | 'provider';

export type ServiceType = 'swedish' | 'deep_tissue' | 'sports' | 'thai' | 'prenatal';

export type DurationMin = 30 | 60 | 90 | 120;

export type LocationType = 'studio' | 'mobile' | 'both';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  onboarding_complete: boolean;
  created_at: string;
}

export interface Provider {
  id: string;
  license_number: string;
  license_image: string | null;
  years_exp: number;
  bio: string | null;
  studio_address: string | null;
  travel_radius_miles: number;
  lat: number | null;
  lng: number | null;
  is_verified: boolean;
  average_rating: number;
  total_reviews: number;
  created_at: string;
}

export interface Service {
  id: string;
  provider_id: string;
  type: ServiceType;
  duration_min: DurationMin;
  price_cents: number;
  location_type: LocationType;
  is_active: boolean;
  created_at: string;
}

export interface Availability {
  id: string;
  provider_id: string;
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface Booking {
  id: string;
  client_id: string;
  provider_id: string;
  service_id: string;
  scheduled_at: string;
  location_type: 'studio' | 'mobile';
  address: string | null;
  status: BookingStatus;
  price_cents: number;
  platform_fee_cents: number;
  total_cents: number;
  notes: string | null;
  created_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export interface Review {
  id: string;
  booking_id: string;
  client_id: string;
  provider_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
      };
      providers: {
        Row: Provider;
        Insert: Partial<Provider> & { id: string };
        Update: Partial<Provider>;
      };
      services: {
        Row: Service;
        Insert: Omit<Service, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Service>;
      };
      availability: {
        Row: Availability;
        Insert: Omit<Availability, 'id'> & { id?: string };
        Update: Partial<Availability>;
      };
      bookings: {
        Row: Booking;
        Insert: Omit<Booking, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Booking>;
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Review>;
      };
    };
    Functions: {
      search_providers: {
        Args: {
          user_lat: number;
          user_lng: number;
          radius_miles: number;
          filter_service_type: string | null;
        };
        Returns: {
          provider_id: string;
          distance_miles: number;
          min_price_cents: number;
          full_name: string;
          average_rating: number;
          total_reviews: number;
          is_verified: boolean;
        }[];
      };
    };
  };
}
