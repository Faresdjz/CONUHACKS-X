"use client";

import { useEffect, useState, use } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search, 
  LucideIcon, 
  Loader2,
  FileSearch,
  Check,
  X,
  Sparkles,
  ImageIcon,
  FileText,
  Zap,
  Eye,
  Info,
  MessageCircleQuestion,
  Plus,
  Send,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import { 
  getInquiry, 
  getInquiryMatches, 
  updateInquiryStatus, 
  approveMatch, 
  rejectMatch,
  triggerSearch,
  BackendInquiry, 
  Match, 
  InquiryStatus,
  MatchStatus
} from "@/lib/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const statusConfig: Record<InquiryStatus, { label: string; className: string; icon: LucideIcon }> = {
  submitted: { 
    label: "Submitted", 
    className: "bg-secondary text-secondary-foreground",
    icon: Clock
  },
  under_review: {
    label: "Under Review",
    className: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    icon: FileSearch
  },
  reviewed: { 
    label: "Reviewed", 
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: Search
  },
  follow_up: { 
    label: "Follow Up", 
    className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    icon: AlertCircle
  },
  matched: {
    label: "Matched",
    className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    icon: CheckCircle2
  },
  resolved: { 
    label: "Resolved", 
    className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
    icon: CheckCircle2
  },
  denied: { 
    label: "Denied", 
    className: "bg-destructive/15 text-destructive border-destructive/20",
    icon: XCircle
  },
};

const matchStatusConfig: Record<MatchStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  },
  approved: {
    label: "Approved",
    className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/15 text-destructive border-destructive/20",
  },
};

const statusOptions: InquiryStatus[] = [
  "submitted",
  "under_review",
  "reviewed",
  "follow_up",
  "matched",
  "resolved",
  "denied",
];

export default function InquiryReviewPage({ params }: PageProps) {
  const { id } = use(params);
  
  const [inquiry, setInquiry] = useState<BackendInquiry | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Follow-up state
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  
  // Match selection state
  const [selectedMatchForAction, setSelectedMatchForAction] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getInquiry(id),
      getInquiryMatches(id),
    ])
      .then(([inquiryData, matchesData]) => {
        setInquiry(inquiryData);
        setMatches(matchesData.matches);
      })
      .catch((err) => {
        console.error("Failed to fetch data:", err);
        setError("Failed to load inquiry details");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleStatusChange = async (newStatus: InquiryStatus) => {
    if (!inquiry) return;
    try {
      await updateInquiryStatus(id, newStatus);
      setInquiry({ ...inquiry, status: newStatus });
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleTriggerSearch = async () => {
    setSearchLoading(true);
    try {
      // Set status to under_review while searching
      await updateInquiryStatus(id, "under_review");
      setInquiry(prev => prev ? { ...prev, status: "under_review" } : null);
      
      // Trigger the search
      await triggerSearch(id);
      const matchesData = await getInquiryMatches(id);
      setMatches(matchesData.matches);
      
      // Auto-transition to matched if matches found
      if (matchesData.matches.length > 0) {
        await updateInquiryStatus(id, "matched");
        setInquiry(prev => prev ? { ...prev, status: "matched" } : null);
      }
    } catch (err) {
      console.error("Failed to trigger search:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleMatchAction = async (matchId: string, action: "approve" | "reject") => {
    setActionLoading(matchId);
    try {
      if (action === "approve") {
        await approveMatch(matchId);
        // Auto-resolve the inquiry when a match is confirmed
        await updateInquiryStatus(id, "resolved");
        setInquiry(prev => prev ? { ...prev, status: "resolved" } : null);
      } else {
        await rejectMatch(matchId);
      }
      const matchesData = await getInquiryMatches(id);
      setMatches(matchesData.matches);
    } catch (err) {
      console.error(`Failed to ${action} match:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (error || !inquiry) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || "Inquiry not found"}</p>
        <Button asChild variant="outline">
          <Link href="/assistant">Back to Dashboard</Link>
        </Button>
      </main>
    );
  }

  const status = statusConfig[inquiry.status];
  const StatusIcon = status.icon;

  return (
    <ScrollArea className="h-screen">
    <main className="min-h-screen bg-background relative flex flex-col items-center pt-28 pb-12 px-4 md:px-6">
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
          <Link href="/assistant">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Portal
          </Link>
        </Button>
      </motion.div>

      {/* Header */}
      <div className="w-full max-w-5xl relative z-10 mb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50 pb-1">
            Review Inquiry
          </h1>
          <p className="text-muted-foreground text-lg">
            Submitted on {formatDate(inquiry.created_at)}
          </p>
        </motion.div>
      </div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-5xl relative z-10"
      >
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap bg-muted/50 p-1 mb-8">
            <TabsTrigger 
              value="details"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2"
            >
              <Info className="w-4 h-4" />
              Inquiry Details
            </TabsTrigger>
            {inquiry.status !== "denied" && (
              <>
                <TabsTrigger 
                  value="matches"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  AI Matches
                  {matches.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {matches.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="followup"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center gap-2"
                >
                  <MessageCircleQuestion className="w-4 h-4" />
                  Follow Up
                  {followUpQuestions.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {followUpQuestions.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Inquiry Details Tab */}
          <TabsContent value="details">
            <div className="rounded-2xl border border-border/50 backdrop-blur-sm overflow-hidden">
              <div className="grid md:grid-cols-[320px_1fr]">
                {/* Left: Image */}
                <div className="p-4 flex items-center justify-center bg-muted/30">
                  <AspectRatio ratio={1} className="overflow-hidden rounded-xl border border-border/50">
                    {inquiry.image_url ? (
                      <Image
                        src={inquiry.image_url}
                        alt="Inquiry image"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted/50">
                        <div className="text-center text-muted-foreground/50">
                          <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                          <p className="text-sm">No image</p>
                        </div>
                      </div>
                    )}
                  </AspectRatio>
                </div>

                {/* Right: Details */}
                <div className="p-6 space-y-5 flex flex-col justify-center">
                  {/* Header with Status */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">Inquiry Details</h3>
                      <p className="text-sm text-muted-foreground font-mono">{inquiry.id}</p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 text-sm ${status.className}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {status.label}
                    </Badge>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
                    <p className="text-sm leading-relaxed text-foreground/90 mt-2">
                      {inquiry.description || "No description provided"}
                    </p>
                  </div>

                  <Separator />

                  {/* Pipeline Progress */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                    <div className="mt-4 flex items-center w-full">
                      {(() => {
                        // Define pipeline steps based on current status
                        const isDenied = inquiry.status === "denied";
                        const isResolved = inquiry.status === "resolved";
                        
                        // Pipeline order for calculating "past" status
                        const pipelineOrder = ["submitted", "under_review", "follow_up", "matched", "resolved"];
                        const currentIndex = pipelineOrder.indexOf(inquiry.status);
                        
                        const steps = [
                          { status: "submitted", label: "Submitted", icon: Clock, color: "bg-secondary text-secondary-foreground" },
                          { status: "under_review", label: "Reviewing", icon: FileSearch, color: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
                          { status: "follow_up", label: "Follow Up", icon: MessageCircleQuestion, color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" },
                          { status: "matched", label: "Matched", icon: CheckCircle2, color: "bg-green-500/15 text-green-600 dark:text-green-400" },
                          ...(isDenied ? [] : [{ status: "resolved", label: "Resolved", icon: CheckCircle2, color: "bg-primary/15 text-primary" }]),
                          ...(isDenied ? [{ status: "denied", label: "Denied", icon: XCircle, color: "bg-destructive/15 text-destructive" }] : []),
                        ];
                        
                        return steps.map((step, index, arr) => {
                          const StepIcon = step.icon;
                          const isCurrent = inquiry.status === step.status;
                          const stepIndex = pipelineOrder.indexOf(step.status);
                          
                          // isPast: step comes before current in pipeline, or we're denied (all other steps are past)
                          const isPast = isDenied 
                            ? step.status !== "denied"  // When denied, ALL other steps are past/disabled
                            : stepIndex < currentIndex && stepIndex !== -1;
                          
                          const isLast = index === arr.length - 1;
                          
                          return (
                            <div key={step.status} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
                              <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium transition-all shrink-0 ${
                                isCurrent 
                                  ? step.color
                                  : isPast
                                    ? "bg-muted/50 text-muted-foreground"
                                    : "bg-transparent text-muted-foreground/40 border border-border/50"
                              }`}>
                                <StepIcon className="w-3 h-3 shrink-0" />
                                <span className="hidden sm:inline">{step.label}</span>
                              </div>
                              {!isLast && (
                                <div className={`flex-1 h-0.5 mx-1 ${
                                  step.status === "matched" && isDenied
                                    ? "bg-destructive/50"
                                    : isPast || isCurrent 
                                      ? "bg-muted-foreground/30" 
                                      : "bg-border/50"
                                }`} />
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <Separator />

                  {/* Status-Based Actions */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</label>
                    <div className="mt-4">
                    {/* Submitted - Start Review */}
                    {inquiry.status === "submitted" && (
                      <Button 
                        onClick={handleTriggerSearch} 
                        disabled={searchLoading}
                        className="w-full"
                      >
                        {searchLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Starting Review...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Start Review (Run AI Search)
                          </>
                        )}
                      </Button>
                    )}

                    {/* Under Review - Show loading */}
                    {inquiry.status === "under_review" && (
                      <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                        <span className="text-sm text-yellow-600 dark:text-yellow-400">AI is analyzing matches...</span>
                      </div>
                    )}

                    {/* Matched - Confirm, Follow Up, or Deny */}
                    {inquiry.status === "matched" && (
                      selectedMatchForAction ? (
                        <div className="grid sm:grid-cols-3 gap-3">
                          <Button 
                            onClick={() => handleStatusChange("resolved")}
                            className="w-full bg-green-500/15 text-green-600 hover:bg-green-500/25 dark:text-green-400"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Confirm Match
                          </Button>
                          <Button 
                            onClick={() => handleStatusChange("follow_up")}
                            className="w-full bg-orange-500/15 text-orange-600 hover:bg-orange-500/25 dark:text-orange-400"
                          >
                            <MessageCircleQuestion className="w-4 h-4 mr-2" />
                            Request Follow Up
                          </Button>
                          <Button 
                            onClick={() => handleStatusChange("denied")}
                            className="w-full bg-destructive/15 text-destructive hover:bg-destructive/25"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Deny
                          </Button>
                        </div>
                      ) : (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>No match selected</AlertTitle>
                          <AlertDescription>
                            Please select a match from the AI Matches tab before confirming or taking action.
                          </AlertDescription>
                        </Alert>
                      )
                    )}

                    {/* Follow Up - Re-run search or Deny */}
                    {inquiry.status === "follow_up" && (
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Button 
                          onClick={handleTriggerSearch}
                          disabled={searchLoading}
                          className="w-full"
                        >
                          {searchLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Searching...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Re-run AI Search
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={() => handleStatusChange("denied")}
                          className="w-full bg-destructive/15 text-destructive hover:bg-destructive/25"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Deny Inquiry
                        </Button>
                      </div>
                    )}

                    {/* Reviewed - Similar to Matched */}
                    {inquiry.status === "reviewed" && (
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Button 
                          onClick={handleTriggerSearch}
                          disabled={searchLoading}
                          className="w-full"
                        >
                          {searchLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Searching...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Run AI Search
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={() => handleStatusChange("follow_up")}
                          className="w-full bg-orange-500/15 text-orange-600 hover:bg-orange-500/25 dark:text-orange-400"
                        >
                          <MessageCircleQuestion className="w-4 h-4 mr-2" />
                          Request Follow Up
                        </Button>
                      </div>
                    )}

                    {/* Resolved - End state */}
                    {inquiry.status === "resolved" && (
                      <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-green-500/10 border border-green-500/20 h-10">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400 font-medium">Inquiry Resolved</span>
                      </div>
                    )}

                    {/* Denied - End state */}
                    {inquiry.status === "denied" && (
                      <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-destructive/10 border border-destructive/20 h-10">
                        <XCircle className="w-4 h-4 text-destructive" />
                        <span className="text-sm text-destructive font-medium">Inquiry Denied</span>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* AI Matches Tab */}
          <TabsContent value="matches" className="space-y-6">
            {/* Search Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">AI Match Results</h2>
                  <p className="text-sm text-muted-foreground">
                    {matches.length > 0 
                      ? `${matches.length} potential match${matches.length > 1 ? "es" : ""} found`
                      : "No matches found yet"
                    }
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleTriggerSearch} 
                disabled={searchLoading}
                size="sm"
                variant="outline"
              >
                {searchLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {/* Empty State */}
            {matches.length === 0 && (
              <div className="text-center py-16 rounded-2xl border border-border/50 bg-muted/20">
                <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">No matches found</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Click &quot;Search&quot; to find potential matches
                </p>
              </div>
            )}

            {/* Matches List */}
            {matches.length > 0 && (
              <div className="space-y-4">
                {/* Filter matches: show only selected or all if none selected */}
                {(selectedMatchForAction 
                  ? matches.filter(m => m.id === selectedMatchForAction)
                  : matches
                ).map((match, index) => {
                  const matchStatus = matchStatusConfig[match.status];
                  const scorePercent = Math.round(match.combined_score * 100);
                  const isLoading = actionLoading === match.id;
                  const isSelected = selectedMatchForAction === match.id;

                  return (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-5 rounded-2xl border backdrop-blur-sm transition-all cursor-pointer ${
                        isSelected 
                          ? "border-green-500 bg-green-500/5" 
                          : "border-border/50 bg-card/30 hover:border-accent/50 hover:bg-accent/5"
                      }`}
                      onClick={() => { setSelectedMatch(match); setDialogOpen(true); }}
                    >
                      <div className="flex flex-col items-center md:grid md:grid-cols-[280px_1fr] md:items-stretch">
                        {/* Left Column: Images + Buttons */}
                        <div className="flex flex-col w-full max-w-md md:max-w-none md:h-full md:justify-between md:pr-5 md:border-r md:border-border/50">
                          {/* Images Side by Side */}
                          <div className="flex gap-3">
                            {/* Inquiry Image */}
                            <div className="flex-1">
                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1.5 text-center">Inquiry</span>
                              <AspectRatio ratio={1} className="rounded-xl overflow-hidden border border-border/50 bg-muted/30">
                                {inquiry.image_url ? (
                                  <Image
                                    src={inquiry.image_url}
                                    alt="Inquiry"
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                                  </div>
                                )}
                              </AspectRatio>
                            </div>

                            {/* Match Image */}
                            <div className="flex-1">
                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block mb-1.5 text-center">Match</span>
                              <AspectRatio ratio={1} className="rounded-xl overflow-hidden border border-border/50 bg-muted/30">
                                {match.item?.image_url ? (
                                  <Image
                                    src={match.item.image_url}
                                    alt="Matched item"
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                                  </div>
                                )}
                              </AspectRatio>
                            </div>
                          </div>

                          {/* Select/Deselect Button - Desktop Only */}
                          {match.status === "pending" && (
                            <div className="hidden md:block mt-4">
                              <Button
                                className={`w-full ${
                                  isSelected 
                                    ? "bg-destructive/15 text-destructive hover:bg-destructive/25" 
                                    : "bg-green-500/15 text-green-600 hover:bg-green-500/25 dark:text-green-400"
                                }`}
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setSelectedMatchForAction(isSelected ? null : match.id);
                                }}
                              >
                                {isSelected ? (
                                  <>
                                    <X className="w-4 h-4 mr-2" />
                                    Deselect
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Select Match
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Right Column: Details */}
                        <div className="w-full max-w-md md:max-w-none mt-5 md:mt-0 md:pl-5 space-y-3 md:flex md:flex-col md:justify-center">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm line-clamp-2 text-center md:text-left">
                                {match.item?.caption || "Unknown item"}
                              </p>
                              {match.item?.category && (
                                <p className="text-xs text-muted-foreground mt-0.5 text-center md:text-left">
                                  {match.item.category}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isSelected && (
                                <Badge className="text-[10px] uppercase bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30">
                                  <Check className="w-3 h-3 mr-1" />
                                  Selected
                                </Badge>
                              )}
                              <Badge variant="outline" className={`text-[10px] uppercase ${matchStatus.className}`}>
                                {matchStatus.label}
                              </Badge>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Match Confidence</span>
                              <span className="font-bold text-lg">{scorePercent}%</span>
                            </div>
                            <Progress value={scorePercent} className="h-2" />
                          </div>

                          {/* Score Breakdown */}
                          <div className="flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {match.img_to_img_score !== null && (
                              <span className="flex items-center gap-1">
                                <ImageIcon className="w-3 h-3 text-blue-500" />
                                Img→Img: {Math.round(match.img_to_img_score * 100)}%
                              </span>
                            )}
                            {match.img_to_caption_score !== null && (
                              <span className="flex items-center gap-1">
                                <ImageIcon className="w-3 h-3 text-purple-500" />
                                Img→Cap: {Math.round(match.img_to_caption_score * 100)}%
                              </span>
                            )}
                            {match.desc_to_img_score !== null && (
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3 text-green-500" />
                                Desc→Img: {Math.round(match.desc_to_img_score * 100)}%
                              </span>
                            )}
                            {match.desc_to_caption_score !== null && (
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3 text-orange-500" />
                                Desc→Cap: {Math.round(match.desc_to_caption_score * 100)}%
                              </span>
                            )}
                          </div>

                          {/* Select/Deselect Button - Mobile Only */}
                          {match.status === "pending" && (
                            <div className="md:hidden pt-2 w-full max-w-md mx-auto">
                              <Button
                                className={`w-full ${
                                  isSelected 
                                    ? "bg-destructive/15 text-destructive hover:bg-destructive/25" 
                                    : "bg-green-500/15 text-green-600 hover:bg-green-500/25 dark:text-green-400"
                                }`}
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setSelectedMatchForAction(isSelected ? null : match.id);
                                }}
                              >
                                {isSelected ? (
                                  <>
                                    <X className="w-4 h-4 mr-2" />
                                    Deselect
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Select Match
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Follow Up Tab */}
          <TabsContent value="followup" className="space-y-6">
            <div className="rounded-2xl border border-border/50 backdrop-blur-sm p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <MessageCircleQuestion className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Follow Up Questions</h2>
                    <p className="text-sm text-muted-foreground">
                      Request additional information from the user
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    setGeneratingQuestions(true);
                    // TODO: Call API to generate questions
                    setTimeout(() => {
                      setFollowUpQuestions([
                        "Can you describe any unique markings or scratches on the item?",
                        "What was the approximate location where you last had the item?",
                        "Are there any stickers, engravings, or personal modifications?",
                      ]);
                      setGeneratingQuestions(false);
                    }, 1500);
                  }}
                  disabled={generatingQuestions}
                >
                  {generatingQuestions ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Questions
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              {/* Add Custom Question */}
              <div className="flex gap-3">
                <Input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Add a custom question..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newQuestion.trim()) {
                      setFollowUpQuestions(prev => [...prev, newQuestion.trim()]);
                      setNewQuestion("");
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newQuestion.trim()) {
                      setFollowUpQuestions(prev => [...prev, newQuestion.trim()]);
                      setNewQuestion("");
                    }
                  }}
                  disabled={!newQuestion.trim()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {/* Questions List */}
              <div className="space-y-3">
                {followUpQuestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircleQuestion className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No follow-up questions yet</p>
                    <p className="text-sm mt-1">Generate AI questions or add your own above</p>
                  </div>
                ) : (
                  followUpQuestions.map((question, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50"
                    >
                      <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 text-xs font-medium flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="flex-1 text-sm leading-relaxed">{question}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive h-8 w-8 flex-shrink-0"
                        onClick={() => {
                          setFollowUpQuestions(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Send Button */}
              <Separator />
              {inquiry.status === "follow_up" ? (
                <Button
                  className="w-full bg-green-500/15 text-green-600 dark:text-green-400"
                  disabled
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Request Sent
                </Button>
              ) : (
                <Button
                  className="w-full bg-orange-500/15 text-orange-600 hover:bg-orange-500/25 dark:text-orange-400"
                  onClick={async () => {
                    setSendingFollowUp(true);
                    try {
                      await updateInquiryStatus(id, "follow_up");
                      setInquiry(prev => prev ? { ...prev, status: "follow_up" } : null);
                      // TODO: Save questions to backend
                    } catch (err) {
                      console.error("Failed to send follow-up:", err);
                    } finally {
                      setSendingFollowUp(false);
                    }
                  }}
                  disabled={sendingFollowUp || followUpQuestions.length === 0}
                >
                  {sendingFollowUp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Follow Up to User
                    </>
                  )}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Match Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          {selectedMatch && (
            <ScrollArea className="max-h-[90vh]">
              <div className="p-6 space-y-6">
                <DialogHeader>
                  <DialogTitle className="text-xl">Match Comparison</DialogTitle>
                  <DialogDescription>
                    Compare the inquiry with the potential match
                  </DialogDescription>
                </DialogHeader>

                {/* Side by Side Comparison */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Inquiry Image */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Inquiry</label>
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted/30 border border-border/50">
                      {inquiry.image_url ? (
                        <Image
                          src={inquiry.image_url}
                          alt="Inquiry"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Match Image */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Matched Item</label>
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted/30 border border-border/50">
                      {selectedMatch.item?.image_url ? (
                        <Image
                          src={selectedMatch.item.image_url}
                          alt="Matched item"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match Status */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant="outline" className={matchStatusConfig[selectedMatch.status].className}>
                    {matchStatusConfig[selectedMatch.status].label}
                  </Badge>
                </div>

                {/* Item Details */}
                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Item Caption</label>
                  <p className="text-sm p-3 rounded-lg bg-muted/30 border border-border/50">
                    {selectedMatch.item?.caption || "No caption available"}
                  </p>
                </div>

                {selectedMatch.item?.extracted_text && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Extracted Text</label>
                    <p className="text-sm p-3 rounded-lg bg-muted/30 border border-border/50 font-mono">
                      {selectedMatch.item.extracted_text}
                    </p>
                  </div>
                )}

                {/* Confidence Score */}
                <div className="space-y-4">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Match Confidence</label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{Math.round(selectedMatch.combined_score * 100)}%</span>
                      <span className="text-sm text-muted-foreground">Combined Score</span>
                    </div>
                    <Progress value={selectedMatch.combined_score * 100} className="h-3" />
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Score Breakdown</label>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedMatch.img_to_img_score !== null && (
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <ImageIcon className="w-4 h-4 text-blue-500" />
                          <span className="text-xs text-muted-foreground">Image to Image</span>
                        </div>
                        <span className="text-lg font-semibold">{Math.round(selectedMatch.img_to_img_score * 100)}%</span>
                        <Progress value={selectedMatch.img_to_img_score * 100} className="h-1.5 mt-2" />
                      </div>
                    )}
                    {selectedMatch.img_to_caption_score !== null && (
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <ImageIcon className="w-4 h-4 text-purple-500" />
                          <span className="text-xs text-muted-foreground">Image to Caption</span>
                        </div>
                        <span className="text-lg font-semibold">{Math.round(selectedMatch.img_to_caption_score * 100)}%</span>
                        <Progress value={selectedMatch.img_to_caption_score * 100} className="h-1.5 mt-2" />
                      </div>
                    )}
                    {selectedMatch.desc_to_img_score !== null && (
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-green-500" />
                          <span className="text-xs text-muted-foreground">Desc to Image</span>
                        </div>
                        <span className="text-lg font-semibold">{Math.round(selectedMatch.desc_to_img_score * 100)}%</span>
                        <Progress value={selectedMatch.desc_to_img_score * 100} className="h-1.5 mt-2" />
                      </div>
                    )}
                    {selectedMatch.desc_to_caption_score !== null && (
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-orange-500" />
                          <span className="text-xs text-muted-foreground">Desc to Caption</span>
                        </div>
                        <span className="text-lg font-semibold">{Math.round(selectedMatch.desc_to_caption_score * 100)}%</span>
                        <Progress value={selectedMatch.desc_to_caption_score * 100} className="h-1.5 mt-2" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedMatch.status === "pending" && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      size="lg"
                      className={`flex-1 ${
                        selectedMatchForAction === selectedMatch.id
                          ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                          : "bg-green-500/15 text-green-600 hover:bg-green-500/25 dark:text-green-400"
                      }`}
                      onClick={() => { 
                        setSelectedMatchForAction(
                          selectedMatchForAction === selectedMatch.id ? null : selectedMatch.id
                        ); 
                        setDialogOpen(false); 
                      }}
                    >
                      {selectedMatchForAction === selectedMatch.id ? (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Deselect
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Select Match
                        </>
                      )}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setDialogOpen(false); }}
                    >
                      Close
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </main>
    </ScrollArea>
  );
}
