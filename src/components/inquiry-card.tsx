"use client";

import { Clock, CheckCircle2, XCircle, AlertCircle, Search, LucideIcon, ChevronRight, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
  category?: string;
  location?: string;
  action?: React.ReactNode;
  className?: string;
  href?: string;
}

const statusConfig: Record<InquiryStatus, { label: string; className: string; icon: LucideIcon }> = {
  submitted: { 
    label: "Submitted", 
    className: "bg-secondary/20 text-secondary-foreground border-secondary/30",
    icon: Clock
  },
  under_review: { 
    label: "Reviewing", 
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    icon: Search
  },
  pending: { 
    label: "Pending", 
    className: "bg-secondary/20 text-secondary-foreground border-secondary/30",
    icon: Clock
  },
  reviewed: { 
    label: "Reviewed", 
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: Search
  },
  follow_up: { 
    label: "Follow Up", 
    className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    icon: AlertCircle
  },
  resolved: { 
    label: "Resolved", 
    className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    icon: CheckCircle2
  },
  matched: { 
    label: "Matched", 
    className: "bg-primary/10 text-primary border-primary/20",
    icon: CheckCircle2
  },
  denied: { 
    label: "Denied", 
    className: "bg-destructive/10 text-destructive border-destructive/20",
    icon: XCircle
  },
  rejected: { 
    label: "Rejected", 
    className: "bg-destructive/10 text-destructive border-destructive/20",
    icon: XCircle
  },
};

// Format description to sentence case (first letter uppercase)
function toSentenceCase(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Check if description equals category (case-insensitive)
function isDescriptionEqualToCategory(description: string | null, category: string | null | undefined): boolean {
  if (!description || !category) return false;
  return description.toLowerCase().trim() === category.toLowerCase().trim();
}

export function InquiryCard({
  id,
  title,
  description,
  date,
  status,
  imageUrl,
  imageAlt,
  userEmail,
  category,
  location,
  action,
  className,
  href
}: InquiryCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;
  const isClickable = !!href;
  
  // Format description for display
  const displayDescription = toSentenceCase(description || title);
  const showCategoryChip = category; // Always show category chip if available, even if same as description

  const rowContent = (
    <div
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
        isClickable && "hover:border-border/40 hover:bg-muted/5 active:bg-muted/10 cursor-pointer",
        !isClickable && "cursor-default",
        "border-border/20 bg-background",
        className
      )}
    >
      {/* Left: Thumbnail */}
      <div className="relative w-14 h-14 rounded-md overflow-hidden bg-muted/10 border border-border/20 shrink-0">
        {imageUrl ? (
          <Image 
            src={imageUrl} 
            alt={imageAlt || displayDescription}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
            <Search className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* Middle: Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Title + Category */}
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-2">
            {displayDescription}
          </h3>
          {showCategoryChip && (
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0 h-5 shrink-0 bg-muted/30 border-border/30 text-muted-foreground"
            >
              <Tag className="w-2.5 h-2.5 mr-1" />
              {category}
            </Badge>
          )}
        </div>

        {/* Meta Line */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <span>{date}</span>
          {location && (
            <>
              <span>•</span>
              <span>{location}</span>
            </>
          )}
        </div>
      </div>

      {/* Right: Status + Chevron */}
      <div className="flex items-center gap-2 shrink-0">
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] px-1.5 py-0 h-5 flex items-center gap-1",
            config.className
          )}
        >
          <StatusIcon className="w-2.5 h-2.5" />
          <span className="hidden sm:inline">{config.label}</span>
        </Badge>
        {isClickable && (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        {action && (
          <div onClick={(e) => e.stopPropagation()}>
            {action}
          </div>
        )}
      </div>
    </div>
  );

  // Only wrap in Link if href is provided
  if (href) {
    return (
      <Link href={href} className={cn("block w-full", className)}>
        {rowContent}
      </Link>
    );
  }

  // Otherwise, return as non-clickable div
  return rowContent;
}
