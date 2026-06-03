export type UserRole = 'client' | 'creator' | 'admin';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  onboarding_complete: boolean;
  is_age_verified?: boolean;
  accepted_content_policy_at?: string | null;
  account_status?: 'active' | 'under_review' | 'suspended' | 'banned';
  is_kyc_verified?: boolean;
  kyc_verified_at?: string | null;
  gender?: string | null;
  headline?: string | null;
  creator_bio?: string | null;
  cover_image_url?: string | null;
  private_room_lat?: number | null;
  private_room_lng?: number | null;
  private_room_rate_cents?: number;
  private_room_location_updated_at?: string | null;
  created_at: string;
}

export interface CreatorPost {
  id: string;
  creator_id: string;
  title: string | null;
  body: string | null;
  media_type: 'none' | 'image' | 'video' | null;
  media_url: string | null;
  thumbnail_url: string | null;
  visibility: 'public' | 'private';
  is_paid: boolean;
  price_cents: number;
  monetization_status: 'none' | 'pending_review' | 'approved' | 'rejected';
  status: 'draft' | 'published' | 'removed' | 'flagged' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface SocialFollow {
  follower_id: string;
  followed_id: string;
  created_at: string;
}

export interface PrivateRoomSession {
  id: string;
  booked_user_id: string;
  booker_user_id: string;
  starts_at: string;
  duration_min: number;
  notes: string | null;
  amount_cents: number;
  platform_fee_cents: number;
  payee_net_cents: number;
  status: 'pending' | 'accepted' | 'declined' | 'paid' | 'completed' | 'cancelled';
  created_at: string;
}

export interface WalletAccount {
  owner_id: string;
  owner_type: 'user' | 'creator' | 'platform';
  available_cents: number;
  pending_cents: number;
  lifetime_earned_cents: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  owner_id: string;
  direction: 'credit' | 'debit';
  entry_type: 'purchase' | 'tip' | 'private_room' | 'fee' | 'refund' | 'withdrawal' | 'adjustment';
  amount_cents: number;
  status: 'pending' | 'posted' | 'reversed';
  reference: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount_cents: number;
  destination: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'cancelled';
  admin_reason: string | null;
  payout_reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type ModerationReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export interface ModerationReport {
  id: string;
  reporter_id: string;
  target_type: 'post' | 'profile' | 'session' | 'message';
  target_id: string;
  reason: string;
  details: string | null;
  status: ModerationReportStatus;
  created_at: string;
}

export interface KycApplication {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  full_legal_name: string;
  dob: string;
  id_doc_path: string;
  selfie_path: string | null;
  admin_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'purchase'
  | 'booking'
  | 'kyc'
  | 'moderation'
  | 'system';

export interface AppNotification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  actor_id: string | null;
  post_id: string | null;
  session_id: string | null;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface ContentPurchase {
  id: string;
  post_id: string;
  buyer_id: string;
  creator_id: string;
  amount_cents: number;
  platform_fee_cents: number;
  net_cents: number;
  status: string;
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
      creator_posts: {
        Row: CreatorPost;
        Insert: Partial<CreatorPost> & { id?: string; creator_id: string };
        Update: Partial<CreatorPost>;
      };
      social_follows: {
        Row: SocialFollow;
        Insert: SocialFollow;
        Update: Partial<SocialFollow>;
      };
      private_room_sessions: {
        Row: PrivateRoomSession;
        Insert: Partial<PrivateRoomSession> & { id?: string };
        Update: Partial<PrivateRoomSession>;
      };
      wallet_accounts: {
        Row: WalletAccount;
        Insert: Partial<WalletAccount> & { owner_id: string };
        Update: Partial<WalletAccount>;
      };
      wallet_transactions: {
        Row: WalletTransaction;
        Insert: Partial<WalletTransaction> & { id?: string };
        Update: Partial<WalletTransaction>;
      };
      withdrawal_requests: {
        Row: WithdrawalRequest;
        Insert: Partial<WithdrawalRequest> & { id?: string };
        Update: Partial<WithdrawalRequest>;
      };
      content_purchases: {
        Row: ContentPurchase;
        Insert: Partial<ContentPurchase> & { id?: string };
        Update: Partial<ContentPurchase>;
      };
      notifications: {
        Row: AppNotification;
        Insert: Partial<AppNotification> & { recipient_id: string; type: NotificationType; title: string };
        Update: Partial<AppNotification>;
      };
      kyc_applications: {
        Row: KycApplication;
        Insert: Partial<KycApplication> & {
          user_id: string;
          full_legal_name: string;
          dob: string;
          id_doc_path: string;
        };
        Update: Partial<KycApplication>;
      };
    };
  };
}
