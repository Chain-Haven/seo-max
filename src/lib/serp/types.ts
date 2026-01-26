/**
 * SERP API Types for Keyword Rank Tracking
 */

export interface SerpResult {
  position: number;
  url: string;
  title: string;
  snippet: string;
  domain: string;
}

export interface SerpFeatures {
  featuredSnippet: SerpResult | null;
  peopleAlsoAsk: string[];
  localPack: boolean;
  knowledgePanel: boolean;
  imageCarousel: boolean;
  videoCarousel: boolean;
  topStories: boolean;
  shoppingResults: boolean;
}

export interface SerpResponse {
  keyword: string;
  location: string;
  device: "desktop" | "mobile";
  searchEngine: "google" | "bing";
  searchVolume?: number;
  results: SerpResult[];
  features: SerpFeatures;
  checkedAt: Date;
}

export interface RankCheckResult {
  keyword: string;
  position: number | null;
  previousPosition: number | null;
  change: number;
  url: string | null;
  title: string | null;
  snippet: string | null;
  featuredSnippet: boolean;
  peopleAlsoAsk: boolean;
  localPack: boolean;
  competitors: CompetitorRank[];
}

export interface CompetitorRank {
  domain: string;
  position: number;
  url: string;
  title: string;
}

export interface TrackedKeyword {
  id: string;
  storeId: string;
  keyword: string;
  location: string;
  language: string;
  device: "desktop" | "mobile";
  searchEngine: "google" | "bing";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Latest ranking data
  currentPosition?: number | null;
  previousPosition?: number | null;
  change?: number;
  url?: string | null;
  featuredSnippet?: boolean;
  lastChecked?: string;
}

export interface KeywordRankingHistory {
  id: string;
  trackedKeywordId: string;
  position: number | null;
  previousPosition: number | null;
  url: string | null;
  title: string | null;
  snippet: string | null;
  featuredSnippet: boolean;
  peopleAlsoAsk: boolean;
  localPack: boolean;
  searchVolume: number | null;
  checkedAt: string;
}

export interface KeywordAlert {
  id: string;
  storeId: string;
  alertType: "rank_drop" | "rank_gain" | "lost_top_10" | "entered_top_10" | "lost_first_page" | "new_ranking";
  threshold: number;
  emailNotification: boolean;
  isActive: boolean;
}

export interface AlertHistoryItem {
  id: string;
  alertId: string;
  trackedKeywordId: string;
  keyword?: string;
  oldPosition: number | null;
  newPosition: number | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}
