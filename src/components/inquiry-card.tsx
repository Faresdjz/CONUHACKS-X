"use client";

import { Clock, CheckCircle2, XCircle, AlertCircle, Search, LucideIcon } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type InquiryStatus = "submitted" | "under_review" | "reviewed" | "follow_up" | "resolved" | "denied" | "pending" | "matched" | "rejected";

interface InquiryCardProps {
  id: string;
  title: string;
  description: string;
  date: string;
  status: InquiryStatus;
  imageUrl?: string;
  imageAlt?: string;
  userEmail?: string;
  action?: React.ReactNode;
  className?: string;
}

const statusConfig: Record<InquiryStatus, { label: string; className: string; icon: LucideIcon }> = {
  submitted: { 
    label: "Submitted", 
    className: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    icon: Clock
  },
  under_review: { 
    label: "Under Review", 
    className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 hover:bg-orange-500/25 border-orange-200 dark:border-orange-800",
    icon: Search
  },
  pending: { 
    label: "Pending", 
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
  matched: { 
    label: "Matched", 
    className: "bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25 border-green-200 dark:border-green-800",
    icon: CheckCircle2
  },
  denied: { 
    label: "Denied", 
    className: "bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20",
    icon: XCircle
  },
  rejected: { 
    label: "Rejected", 
    className: "bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20",
    icon: XCircle
  },
};

export function InquiryCard({
  title,
  description,
  date,
  status,
  imageUrl,
  imageAlt,
  userEmail,
  action,
  className
}: InquiryCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const isInteractive = !!action || status === "follow_up";

  return (
    <div className={cn("group flex flex-row gap-5 items-start p-5 rounded-2xl border border-border/50 backdrop-blur-sm hover:border-border/80 transition-all duration-300", className)}>
      <div className="w-20 h-20 rounded-lg bg-muted/50 flex-shrink-0 overflow-hidden relative border border-border/50">
        {imageUrl ? (
          <Image 
            src={imageUrl} 
            alt={imageAlt || title}
            fill
            className={cn(
               "object-cover transition-transform duration-500",
               isInteractive ? "group-hover:scale-105" : ""
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <Search className="w-8 h-8" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold pr-2 leading-snug">{title}</h3>
          <Badge variant="outline" className={cn("flex-shrink-0 w-8 sm:w-28 h-7 sm:h-auto justify-center flex items-center gap-1 p-0 sm:px-2 sm:py-0.5 text-[10px] uppercase tracking-wide border", config.className)}>
            <StatusIcon className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
            <span className="hidden sm:inline">{config.label}</span>
          </Badge>
        </div>
        <p className="text-muted-foreground line-clamp-2 text-sm">{description}</p>
        <div className={cn("pt-2 flex items-center text-xs text-muted-foreground/60 mt-1", action ? "justify-between" : "justify-start gap-2")}>
          <div className="flex items-center gap-2">
             <span>{date}</span>
             {userEmail && (
                 <>
                    <span>•</span>
                    <span>{userEmail}</span>
                 </>
             )}
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}
