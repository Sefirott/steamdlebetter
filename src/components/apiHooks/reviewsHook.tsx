import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Minimal TypeScript types for the Steam app reviews endpoint
// Reference: https://store.steampowered.com/appreviews/<appid>?json=1
export interface SteamReviewAuthor {
  steamid: string;
  num_games_owned?: number;
  num_reviews?: number;
  playtime_forever?: number;
  playtime_last_two_weeks?: number;
  playtime_at_review?: number;
  last_played?: number;
}

export interface SteamReview {
  recommendationid: string;
  author: SteamReviewAuthor;
  language: string;
  review: string; // textual review content
  timestamp_created: number; // unix seconds
  timestamp_updated: number; // unix seconds
  voted_up: boolean;
  votes_up?: number;
  votes_funny?: number;
  weighted_vote_score?: string;
  comment_count?: number;
  steam_purchase?: boolean;
  received_for_free?: boolean;
  written_during_early_access?: boolean;
  hidden_in_steam_china?: boolean;
  steam_china_location?: string;
}

export interface SteamQuerySummary {
  num_reviews: number;
  review_score: number;
  review_score_desc: string;
  total_positive: number;
  total_negative: number;
  total_reviews: number;
}

export interface SteamReviewsResponse {
  success: number; // 1 for success
  query_summary: SteamQuerySummary;
  reviews: SteamReview[];
  cursor: string; // use this to paginate
}

export type SteamReviewFilter = 'all' | 'recent' | 'updated' | 'funny';
export type SteamPurchaseType = 'all' | 'steam' | 'non_steam';

export interface UseSteamReviewsOptions {
  language?: string; // default 'english'
  filter?: SteamReviewFilter; // default 'recent'
  purchase_type?: SteamPurchaseType; // default 'all'
  day_range?: number; // optional
  review_type?: 'all' | 'positive' | 'negative';
  num_per_page?: number; // default 20
  include_review?: boolean; // default true
  cursor?: string; // start cursor; if omitted, starts from '*'
  fetchOnMount?: boolean; // default true
}

export interface UseSteamReviewsResult {
  reviews: SteamReview[];
  querySummary?: SteamQuerySummary;
  loading: boolean;
  error?: string;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  lastUpdatedAt?: number;
}

function buildReviewsUrl(appId: string | number, params: Record<string, string | number | boolean | undefined>): string {
  // Use Vite dev proxy to avoid CORS during development
  const isDev = import.meta.env.DEV;
  const base = isDev ? `${window.location.origin}/steam` : 'https://store.steampowered.com';
  const url = new URL(`${base}/appreviews/${appId}`);
  url.searchParams.set('json', '1');
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, String(v));
    }
  });
  return url.toString();
}

export const useSteamReviews =(appId: string | number, options: UseSteamReviewsOptions = {}): UseSteamReviewsResult => {
  const {
    language = 'english',
    filter = 'recent',
    purchase_type = 'all',
    day_range,
    review_type,
    num_per_page = 5,
    include_review = true,
    cursor: initialCursor,
    fetchOnMount = true,
  } = options;

  const [reviews, setReviews] = useState<SteamReview[]>([]);
  const [querySummary, setQuerySummary] = useState<SteamQuerySummary | undefined>(undefined);
  const [cursor, setCursor] = useState<string | undefined>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | undefined>(undefined);

  const abortRef = useRef<AbortController | null>(null);

  // Reset when appId or core options change
  useEffect(() => {
    setReviews([]);
    setQuerySummary(undefined);
    setCursor(initialCursor);
    setHasMore(true);
    setError(undefined);
  }, [appId, language, filter, purchase_type, day_range, review_type, num_per_page, include_review, initialCursor]);

  const fetchPage = useCallback(async () => {
    if (loading) return;

    // Cancel previous
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(undefined);

    const effectiveCursor = cursor ?? '*';

    const url = buildReviewsUrl(appId, {
      language,
      filter,
      purchase_type,
      day_range,
      review_type,
      num_per_page,
      include_review,
      cursor: effectiveCursor,
    });

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          // Note: Steam endpoint may restrict CORS. In such case, set up a dev proxy in Vite.
        },
        signal: controller.signal,
      });

      const data: SteamReviewsResponse = await res.json();

      setQuerySummary(data.query_summary);
      setReviews(prev => [...prev, ...(data.reviews ?? [])]);
      setCursor(data.cursor);
      setHasMore(Boolean(data.cursor && data.cursor !== '')); // Steam uses empty to indicate end
      setLastUpdatedAt(Date.now());
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'name' in e && (e as { name?: string }).name === 'AbortError') return;
      const message = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : 'Failed to fetch reviews';
      setError(message);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [appId, cursor, day_range, filter, include_review, language, loading, num_per_page, purchase_type, review_type]);

  // Auto-fetch first page
  useEffect(() => {
    if (fetchOnMount) {
      fetchPage();
    }
    // Cleanup when unmount
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOnMount, appId, language, filter, purchase_type, day_range, review_type, num_per_page, include_review]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPage();
    }
  }, [fetchPage, hasMore, loading]);

  const refresh = useCallback(() => {
    setReviews([]);
    setCursor(undefined);
    setHasMore(true);
    setError(undefined);
    fetchPage();
  }, [fetchPage]);

  return useMemo(() => ({
    reviews,
    querySummary,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    lastUpdatedAt,
  }), [error, hasMore, lastUpdatedAt, loading, querySummary, refresh, reviews, loadMore]);
}
