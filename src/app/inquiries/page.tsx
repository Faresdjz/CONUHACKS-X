"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, Search, LucideIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { getInquiries, BackendInquiry } from "@/lib/api";

type InquiryStatus = "submitted" | "reviewed" | "follow_up" | "resolved" | "denied";

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
    status: backend.status,
    imageUrl: backend.image_url || undefined,
  };
}

const statusConfig: Record<InquiryStatus, { label: string; className: string; icon: LucideIcon }> = {
  submitted: { 
    label: "Submitted", 
    className: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    icon: Clock
  },
  reviewed: { 
    label: "Reviewed", 
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 border-blue-200 dark:border-blue-800",
    icon: Search
  },
  follow_up: { 
    label: "Follow Up", 
    className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 hover:bg-orange-500/25 border-orange-200 dark:border-orange-800",
    icon: AlertCircle
  },
  resolved: { 
    label: "Resolved", 
    className: "bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25 border-green-200 dark:border-green-800",
    icon: CheckCircle2
  },
  denied: { 
    label: "Denied", 
    className: "bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20",
    icon: XCircle
  },
};

export default function InquiriesPage() {
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

  return (
    <main className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center pt-28 pb-12 px-4 md:px-6">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5 z-0" />
      <div className="absolute top-0 left-0 w-full h-96 bg-accent/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-full h-96 bg-purple-500/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      {/* Back Button */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-6 left-6 z-20"
      >
        <Button variant="ghost" size="sm" asChild className="hover:bg-accent/10">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
        </Button>
      </motion.div>

      {/* Header */}
      <div className="w-full max-w-4xl relative z-10 mb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-2"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50 pb-1">My Inquiries</h1>
          <p className="text-muted-foreground text-lg">
            Track the status of your lost item reports.
          </p>
        </motion.div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="w-full max-w-4xl relative z-10 flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="w-full max-w-4xl relative z-10 text-center py-12">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && inquiries.length === 0 && (
        <div className="w-full max-w-4xl relative z-10 text-center py-12">
          <p className="text-muted-foreground">No inquiries yet. Submit one to get started!</p>
        </div>
      )}

      {/* List */}
      {!loading && !error && inquiries.length > 0 && (
      <div className="w-full max-w-4xl relative z-10 space-y-6">
        {inquiries.map((inquiry, index) => {
          const status = statusConfig[inquiry.status];
          const StatusIcon = status.icon;
          const isFollowUp = inquiry.status === "follow_up";

          return (
            <motion.div
              key={inquiry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <div className="flex flex-row gap-5 items-start p-5 rounded-2xl border border-border/50 backdrop-blur-sm hover:border-border/80 transition-all duration-300">
                <div className="w-20 h-20 rounded-lg bg-muted/50 flex-shrink-0 overflow-hidden relative border border-border/50">
                  {inquiry.imageUrl ? (
                    <Image 
                      src={inquiry.imageUrl} 
                      alt={inquiry.item}
                      fill
                      className={`object-cover ${isFollowUp ? "group-hover:scale-105 transition-transform duration-500" : ""}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                      <Search className="w-8 h-8" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold pr-2 leading-snug">{inquiry.item}</h3>
                    <Badge variant="outline" className={`flex-shrink-0 w-8 sm:w-28 h-7 sm:h-auto justify-center flex items-center gap-1 p-0 sm:px-2 sm:py-0.5 text-[10px] uppercase tracking-wide border ${status.className}`}>
                      <StatusIcon className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">{status.label}</span>
                    </Badge>
                  </div>
                  <p className="text-muted-foreground line-clamp-2 text-sm">{inquiry.description}</p>
                  <div className={`pt-2 flex items-center ${isFollowUp ? "justify-between" : "justify-start"} text-xs text-muted-foreground/60 mt-1`}>
                    <span>{inquiry.date}</span>
                    {isFollowUp && (
                      <Link href={`/inquiries/${inquiry.id}/follow-up`}>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-white group-hover:text-white/80 transition-colors">
                          <span>Resolve</span>
                          <ArrowLeft className="w-3.5 h-3.5 rotate-180 transition-transform group-hover:translate-x-1" />
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      )}
    </main>
  );
}
