const API_BASE = "http://localhost:8000";

export interface BackendInquiry {
  id: string;
  user_id: string | null;
  image_url: string | null;
  description: string | null;
  status: "submitted" | "reviewed" | "follow_up" | "resolved" | "denied";
  created_at: string;
  updated_at: string;
}

export interface InquiriesResponse {
  inquiries: BackendInquiry[];
  total: number;
}

export async function createInquiry(description: string, image?: File) {
  const formData = new FormData();
  formData.append("description", description);
  if (image) {
    formData.append("image", image);
  }

  const res = await fetch(`${API_BASE}/inquiries`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Failed to submit inquiry");
  }

  return res.json() as Promise<BackendInquiry>;
}

export async function getInquiries() {
  const res = await fetch(`${API_BASE}/inquiries`);

  if (!res.ok) {
    throw new Error("Failed to fetch inquiries");
  }

  return res.json() as Promise<InquiriesResponse>;
}
