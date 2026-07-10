export interface AdTargeting {
  countries: string[];
  cities: string[];
  languages: string[];
  ageGroups: string[];
  genders: string[];
  genres: string[];
  interests: string[];
  creatorFollowers: string[];
  devices: string[];
  os: string[];
}

export interface AdCreative {
  id: string;
  campaignId: string;
  format: "banner" | "native" | "feed" | "song" | "video" | "live" | "carousel" | "fullscreen" | "search" | "marketplace";
  title: string;
  description: string;
  mediaUrl: string;
  destinationUrl: string;
  assets?: string[]; // For Carousel formats
}

export interface AdCampaign {
  id: string;
  advertiserId: string;
  name: string;
  objective: "promote_song" | "promote_album" | "promote_video" | "promote_live" | "promote_creator" | "promote_marketplace" | "promote_event" | "promote_business" | "promote_app" | "promote_website";
  status: "pending" | "approved" | "rejected" | "active" | "paused" | "completed";
  budget: number;
  dailyBudget: number;
  lifetimeBudget: number;
  spent: number;
  startDate: string;
  endDate: string;
  targeting: AdTargeting;
  creative: AdCreative;
  createdAt: string;
  changeRequests?: string; // Admin feedback for changes
}

export interface AdPayment {
  id: string;
  advertiserId: string;
  amount: number;
  currency: string;
  status: "succeeded" | "pending" | "failed";
  stripePaymentIntentId: string;
  createdAt: string;
  method?: string;
  cardLast4?: string;
}

export interface AdBilling {
  id: string;
  advertiserId: string;
  balance: number;
  paymentMethod?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

export interface AdReport {
  id: string;
  campaignId: string;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  conversions: number;
  downloads: number;
  followersGained: number;
  videoViews: number;
  songPlays: number;
  livestreamViews: number;
  cost: number;
  cpc: number;
  cpm: number;
  cpa: number;
  date: string;
}

export interface AdNotification {
  id: string;
  advertiserId: string;
  type: "campaign_started" | "campaign_ended" | "budget_exhausted" | "ad_approved" | "ad_rejected" | "payment_success";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AdReview {
  id: string;
  campaignId: string;
  status: "pending" | "approved" | "rejected" | "changes_requested";
  reviewerId: string;
  notes: string;
  reviewedAt: string;
}
