import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ============== Status Types ==============

export type InquiryStatus = 
  | "submitted" 
  | "under_review" 
  | "reviewed" 
  | "follow_up" 
  | "matched" 
  | "resolved" 
  | "denied";

export type ItemStatus = "available" | "matched" | "claimed";

export type MatchStatus = "pending" | "approved" | "rejected";

// ============== Data Types ==============

export interface BackendInquiry {
  id: string;
  user_id: string | null;
  image_url: string | null;
  description: string | null;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  image_url: string;
  caption: string | null;
  extracted_text: string | null;
  category: string | null;
  collection_id: string | null;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  name: string;
  created_at: string;
  item_count: number;
}

export interface MatchScores {
  img_to_img: number | null;
  img_to_caption: number | null;
  desc_to_img: number | null;
  desc_to_caption: number | null;
  total: number;
}

export interface Match {
  id: string;
  inquiry_id: string;
  item_id: string;
  img_to_img_score: number | null;
  img_to_caption_score: number | null;
  desc_to_img_score: number | null;
  desc_to_caption_score: number | null;
  combined_score: number;
  status: MatchStatus;
  reviewed_by: string | null;
  created_at: string;
  item: Item | null;
}

export interface SearchResult {
  item_id: string;
  scores: MatchScores;
  item: Item | null;
}

// ============== Response Types ==============

export interface InquiriesResponse {
  inquiries: BackendInquiry[];
  total: number;
}

export interface MatchesResponse {
  matches: Match[];
  total: number;
}

export interface SearchResponse {
  inquiry_id: string;
  results: SearchResult[];
  total: number;
}

export interface CollectionsResponse {
  collections: Collection[];
  total: number;
}

export interface ItemsResponse {
  items: Item[];
  total: number;
}

// ============== Auth Helpers ==============

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    return {
      Authorization: `Bearer ${session.access_token}`,
    };
  }
  return {};
}

// ============== User Inquiry Functions ==============

export async function createInquiry(description: string, image?: File, collectionName?: string) {
  const formData = new FormData();
  formData.append("description", description);
  if (image) {
    formData.append("image", image);
  }
  if (collectionName) {
    formData.append("collection_name", collectionName);
  }

  const headers = await getAuthHeaders();

  const res = await fetch(`${API_BASE}/inquiries`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to submit inquiry");
  }

  return res.json() as Promise<BackendInquiry>;
}

export async function getInquiries() {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_BASE}/inquiries`, {
    headers,
  });

  if (!res.ok) {
    throw new Error("Failed to fetch inquiries");
  }

  return res.json() as Promise<InquiriesResponse>;
}

// ============== Admin/Assistant Functions ==============

export async function getAllInquiries(status?: InquiryStatus, collectionId?: string) {
  const params = new URLSearchParams();
  if (status) {
    params.append("status", status);
  }
  if (collectionId) {
    params.append("collection_id", collectionId);
  }

  const url = `${API_BASE}/admin/inquiries${params.toString() ? `?${params}` : ""}`;
  
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch inquiries");
  }

  return res.json() as Promise<InquiriesResponse>;
}

export async function getInquiry(inquiryId: string) {
  const res = await fetch(`${API_BASE}/inquiries/${inquiryId}`);

  if (!res.ok) {
    throw new Error("Failed to fetch inquiry");
  }

  return res.json() as Promise<BackendInquiry>;
}

export async function getInquiryMatches(inquiryId: string) {
  const res = await fetch(`${API_BASE}/inquiries/${inquiryId}/matches`);

  if (!res.ok) {
    throw new Error("Failed to fetch matches");
  }

  return res.json() as Promise<MatchesResponse>;
}

export async function triggerSearch(inquiryId: string, topK: number = 10) {
  const res = await fetch(`${API_BASE}/inquiries/${inquiryId}/search?top_k=${topK}`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error("Failed to trigger search");
  }

  return res.json() as Promise<SearchResponse>;
}

export async function searchWithFollowUpResponses(inquiryId: string, topK: number = 10) {
  const res = await fetch(`${API_BASE}/inquiries/${inquiryId}/search-with-responses?top_k=${topK}`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error("Failed to search with follow-up responses");
  }

  return res.json() as Promise<SearchResponse>;
}

export async function updateInquiryStatus(inquiryId: string, status: InquiryStatus) {
  const res = await fetch(`${API_BASE}/inquiries/${inquiryId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error("Failed to update inquiry status");
  }

  return res.json();
}

// ============== Match Management Functions ==============

export async function approveMatch(matchId: string) {
  const res = await fetch(`${API_BASE}/matches/${matchId}/approve`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error("Failed to approve match");
  }

  return res.json();
}

export async function rejectMatch(matchId: string) {
  const res = await fetch(`${API_BASE}/matches/${matchId}/reject`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error("Failed to reject match");
  }

  return res.json();
}

export async function getPendingMatches() {
  const res = await fetch(`${API_BASE}/matches/pending`);

  if (!res.ok) {
    throw new Error("Failed to fetch pending matches");
  }

  return res.json() as Promise<MatchesResponse>;
}

// ============== Follow-Up Functions ==============

export interface FollowUpQuestion {
  id: string;
  inquiry_id: string;
  question: string;
  response: string | null;
  created_at: string;
}

export interface FollowUpQuestionsResponse {
  questions: FollowUpQuestion[];
  total: number;
}

export interface GeneratedQuestionsResponse {
  questions: string[];
}

export async function generateFollowUpQuestions(inquiryId: string) {
  const res = await fetch(`${API_BASE}/inquiries/${inquiryId}/generate-questions`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error("Failed to generate follow-up questions");
  }

  return res.json() as Promise<GeneratedQuestionsResponse>;
}

export async function sendFollowUpQuestions(inquiryId: string, questions: string[]) {
  const res = await fetch(`${API_BASE}/inquiries/${inquiryId}/follow-up`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ questions }),
  });

  if (!res.ok) {
    throw new Error("Failed to send follow-up questions");
  }

  return res.json();
}

export async function getFollowUpQuestions(inquiryId: string) {
  const res = await fetch(`${API_BASE}/inquiries/${inquiryId}/follow-up`);

  if (!res.ok) {
    throw new Error("Failed to fetch follow-up questions");
  }

  return res.json() as Promise<FollowUpQuestionsResponse>;
}

export async function submitFollowUpResponse(questionId: string, response: string) {
  const res = await fetch(`${API_BASE}/follow-up/${questionId}/respond`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ response }),
  });

  if (!res.ok) {
    throw new Error("Failed to submit follow-up response");
  }

  return res.json();
}

// ============== Collection Functions ==============

export async function getCollections() {
  const res = await fetch(`${API_BASE}/collections`);

  if (!res.ok) {
    throw new Error("Failed to fetch collections");
  }

  return res.json() as Promise<CollectionsResponse>;
}

export async function getCollection(collectionId: string) {
  const res = await fetch(`${API_BASE}/collections/${collectionId}`);

  if (!res.ok) {
    throw new Error("Failed to fetch collection");
  }

  return res.json() as Promise<Collection>;
}

export async function getCollectionByName(name: string): Promise<Collection | null> {
  const res = await fetch(`${API_BASE}/collections/by-name/${encodeURIComponent(name)}`);

  if (res.status === 404) {
    return null; // Collection not found
  }

  if (!res.ok) {
    throw new Error("Failed to fetch collection");
  }

  return res.json() as Promise<Collection>;
}

export async function createCollection(name: string) {
  const res = await fetch(`${API_BASE}/collections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    throw new Error("Failed to create collection");
  }

  return res.json() as Promise<Collection>;
}

export async function deleteCollection(collectionId: string) {
  const res = await fetch(`${API_BASE}/collections/${collectionId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed to delete collection");
  }

  return res.json();
}

export async function getCollectionItems(collectionId: string) {
  const res = await fetch(`${API_BASE}/collections/${collectionId}/items`);

  if (!res.ok) {
    throw new Error("Failed to fetch collection items");
  }

  return res.json() as Promise<ItemsResponse>;
}

export async function createItem(image: File, collectionId: string, category?: string) {
  const formData = new FormData();
  formData.append("image", image);
  formData.append("collection_id", collectionId);
  if (category) {
    formData.append("category", category);
  }

  console.log("Creating item with collection_id:", collectionId);

  const res = await fetch(`${API_BASE}/inventory/items`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("Create item error:", error);
    throw new Error("Failed to create item");
  }

  return res.json() as Promise<Item>;
}
