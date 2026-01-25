"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getInquiries, BackendInquiry } from "@/lib/api";
import { InquiryCard, InquiryStatus } from "@/components/inquiry-card";

interface Inquiry {
  id: string;
  item: string;
  description: string;
  date: string;
  status: InquiryStatus;
  imageUrl?: string;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getItemTitle(description: string | null): string {
  if (!description) return "Lost Item";
  // Take first sentence or first 30 chars
  const firstSentence = description.split(/[.!?]/)[0];
  if (firstSentence.length <= 40) return firstSentence;
  return firstSentence.slice(0, 37) + "...";
}

function mapBackendInquiry(backend: BackendInquiry): Inquiry {
  return {
    id: backend.id,
    item: getItemTitle(backend.description),
    description: backend.description || "",
    date: formatDate(backend.created_at),
    status: backend.status as InquiryStatus,
    imageUrl: backend.image_url || undefined,
  };
}

export function InquiriesList() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInquiries()
      .then((data) => {
        setInquiries(data.inquiries.map(mapBackendInquiry));
      })
      .catch((err) => {
        console.error("Failed to fetch inquiries:", err);
        setError("Failed to load inquiries");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="w-full flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full text-center py-12">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (inquiries.length === 0) {
    return (
      <div className="w-full text-center py-12 space-y-6">
        <p className="text-muted-foreground">No inquiries yet. Submit one to get started!</p>
        <Button asChild>
          <Link href="/submit-inquiry">
            Report Lost Item <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {inquiries.map((inquiry, index) => {
        const isFollowUp = inquiry.status === "follow_up";

        return (
          <motion.div
            key={inquiry.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <InquiryCard 
              id={inquiry.id}
              title={inquiry.item}
              description={inquiry.description}
              date={inquiry.date}
              status={inquiry.status}
              imageUrl={inquiry.imageUrl}
              action={
                isFollowUp && (
                  <Link href={`/inquiries/${inquiry.id}/follow-up`}>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-white group-hover:text-white/80 transition-colors">
                      <span>Resolve</span>
                      <ArrowLeft className="w-3.5 h-3.5 rotate-180 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                )
              }
            />
          </motion.div>
        );
      })}
    </div>
  );
}
