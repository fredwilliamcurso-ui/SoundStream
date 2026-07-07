export interface Agency {
  id: string;
  ownerId: string;
  name: string;
  type: "record_label" | "talent_agency" | "music_publisher" | "management_company";
  description: string;
  website: string;
  logoUrl: string;
  createdAt: string;
  status: "pending" | "approved" | "suspended";
  verificationStatus: "unverified" | "pending" | "verified";
  withdrawableBalance: number;
  totalRevenue: number;
  totalArtists: number;
  totalStreams: number;
}

export interface AgencyMember {
  id: string;
  agencyId: string;
  userId: string;
  email: string;
  role: "owner" | "manager" | "editor" | "moderator" | "accountant" | "marketing_staff" | "support_staff";
  permissions: string[]; // e.g., ["manage_artists", "view_analytics", "manage_releases", "manage_contracts", "manage_finances", "manage_team"]
  invitedAt: string;
  joinedAt?: string;
  status: "invited" | "active" | "suspended";
}

export interface AgencyArtist {
  id: string;
  agencyId: string;
  artistId: string; // references uid of User / Artist
  artistName: string;
  artistPhoto: string;
  joinedAt: string;
  status: "pending" | "active" | "removed";
  managerId?: string; // Point to agency member userId who manages this artist
  splits: {
    artist: number;     // e.g. 70
    agency: number;     // e.g. 20
    manager: number;    // e.g. 5
    producer: number;   // e.g. 5
  };
}

export interface AgencyContract {
  id: string;
  agencyId: string;
  artistId: string;
  artistName: string;
  terms: string;
  startDate: string;
  endDate: string;
  splits: {
    artist: number;
    agency: number;
    manager: number;
    producer: number;
  };
  status: "pending" | "signed" | "rejected" | "expired";
  signatureUrl?: string; // Electronic signature string/name
  signedAt?: string;
  createdAt: string;
  history: {
    action: string;
    userId: string;
    timestamp: string;
    notes?: string;
  }[];
}

export interface AgencyPermission {
  id: string;
  roleName: string;
  permissions: string[];
}

export interface AgencyRevenue {
  id: string;
  agencyId: string;
  artistId?: string;
  amount: number;
  category: "music" | "video" | "live" | "gift" | "marketplace" | "subscription" | "advertising" | "creator";
  splits: {
    artist: number;
    agency: number;
    manager: number;
    producer: number;
  };
  splitAmounts: {
    artist: number;
    agency: number;
    manager: number;
    producer: number;
  };
  description: string;
  createdAt: string;
}

export interface AgencyNotification {
  id: string;
  agencyId: string;
  type: "artist_upload" | "revenue_received" | "withdrawal_processed" | "contract_signed" | "verification_approved" | "livestream_started";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AgencyVerification {
  id: string;
  agencyId: string;
  type: "agency" | "label" | "partner_badge";
  documents: string[]; // document names / file URLs
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  notes?: string;
}
