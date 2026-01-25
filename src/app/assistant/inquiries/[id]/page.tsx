"use client";

import { useEffect, useState, use } from "react";
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Check,
  X,
  Sparkles,
  ImageIcon,
  FileText,
  Loader2,
  MessageCircleQuestion,
  Plus,
  Send,
  Trash2,
  ChevronRight,
  ChevronDown,
  Search,
  Eye
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  getInquiry, 
  getInquiryMatches, 
  updateInquiryStatus, 
  approveMatch, 
  rejectMatch,
  triggerSearch,
  generateFollowUpQuestions,
  sendFollowUpQuestions,
  getFollowUpQuestions,
  searchWithFollowUpResponses,
  BackendInquiry, 
  Match, 
  InquiryStatus,
  MatchStatus,
  FollowUpQuestion
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

function formatDateShort(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric"
  });
}

const statusConfig: Record<InquiryStatus, { label: string; className: string }> = {
  submitted: { 
    label: "Submitted", 
    className: "bg-secondary/20 text-secondary-foreground border-secondary/30",
  },
  under_review: {
    label: "Reviewing",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  reviewed: { 
    label: "Reviewed", 
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  follow_up: { 
    label: "Follow Up", 
    className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  },
  matched: {
    label: "Matched",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  resolved: { 
    label: "Resolved", 
    className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  denied: { 
    label: "Denied", 
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

const matchStatusConfig: Record<MatchStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  },
  approved: {
    label: "Approved",
    className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

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
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  
  // Follow-up state
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [savedFollowUpQuestions, setSavedFollowUpQuestions] = useState<FollowUpQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [reSearching, setReSearching] = useState(false);
  
  // Match selection state
  const [selectedMatchForAction, setSelectedMatchForAction] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getInquiry(id),
      getInquiryMatches(id),
      getFollowUpQuestions(id).catch(() => ({ questions: [], total: 0 })),
    ])
      .then(([inquiryData, matchesData, followUpData]) => {
        setInquiry(inquiryData);
        setMatches(matchesData.matches);
        setSavedFollowUpQuestions(followUpData.questions);
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
      await updateInquiryStatus(id, "under_review");
      setInquiry(prev => prev ? { ...prev, status: "under_review" } : null);
      await triggerSearch(id);
      const matchesData = await getInquiryMatches(id);
      setMatches(matchesData.matches);
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
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-destructive">{error || "Inquiry not found"}</p>
        <Button asChild variant="outline">
          <Link href="/assistant">Back to Portal</Link>
        </Button>
      </main>
    );
  }

  const status = statusConfig[inquiry.status];
  const hasMatches = matches.length > 0;
  const showMatches = inquiry.status === "matched" || inquiry.status === "under_review" || hasMatches;
  const showFollowUp = inquiry.status === "follow_up" || inquiry.status === "matched";

  // Get title from description (first few words)
  const getTitle = () => {
    if (!inquiry.description) return "Lost Item";
    const words = inquiry.description.split(" ");
    if (words.length <= 5) return inquiry.description;
    return words.slice(0, 5).join(" ") + "...";
  };

  // Determine if there are actionable buttons
  const hasActions = inquiry.status === "submitted" || 
                     inquiry.status === "matched" || 
                     inquiry.status === "follow_up" ||
                     inquiry.status === "reviewed";

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Top Bar - Fixed */}
      <nav className="border-b border-border/10 bg-background/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
                <Link href="/assistant">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <h1 className="text-base font-medium text-foreground truncate">Inquiry</h1>
            </div>
            <Badge variant="outline" className={`shrink-0 text-xs px-2 py-0.5 ${status.className}`}>
              {status.label}
            </Badge>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 relative">
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="px-4 py-4 space-y-4">
            {/* Compact Inquiry Header */}
            <div className="flex gap-3">
              {/* Small Thumbnail */}
              <button
                onClick={() => setImageDialogOpen(true)}
                className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted/10 border border-border/20 shrink-0"
              >
                {inquiry.image_url ? (
                  <Image
                    src={inquiry.image_url}
                    alt="Lost item"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                )}
              </button>

              {/* Stacked Info */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <h2 className="text-base font-semibold text-foreground line-clamp-2">
                  {getTitle()}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {formatDate(inquiry.created_at)}
                </p>
                
                {/* Status Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.className}`}>
                      {status.label}
                    </Badge>
                  </div>
                  {showMatches && (
                    <>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="text-xs text-muted-foreground">
                        AI Matches: {matches.length}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Separator className="bg-border/20" />

            {/* AI Matches Section - Dense Review Table */}
            {showMatches && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">AI Matches</h3>
                  <Button 
                    onClick={handleTriggerSearch} 
                    disabled={searchLoading}
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                  >
                    {searchLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 mr-1" />
                        Search
                      </>
                    )}
                  </Button>
                </div>

                {matches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground/60">
                    <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No matches found</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {matches.map((match) => {
                      const matchStatus = matchStatusConfig[match.status];
                      const scorePercent = Math.round(match.combined_score * 100);
                      const isSelected = selectedMatchForAction === match.id;
                      const item = match.item;

                      return (
                        <div
                          key={match.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors ${
                            isSelected 
                              ? "border-primary/30 bg-primary/5" 
                              : "border-border/20 hover:border-border/30 bg-background"
                          }`}
                        >
                          {/* Small Thumbnail */}
                          <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted/10 border border-border/20 shrink-0">
                            {item?.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={item.caption || "Match"}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-muted-foreground/20" />
                              </div>
                            )}
                          </div>

                          {/* Content - Info Dense */}
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Title + Confidence */}
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-medium text-foreground line-clamp-2 flex-1">
                                {item?.caption || "Unknown item"}
                              </h4>
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] px-1.5 py-0 shrink-0 ${matchStatus.className}`}
                              >
                                {scorePercent}%
                              </Badge>
                            </div>

                            {/* Attributes Inline */}
                            <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                              {item?.category && (
                                <>
                                  <span>{item.category}</span>
                                  <span className="text-muted-foreground/30">•</span>
                                </>
                              )}
                              {match.created_at && (
                                <>
                                  <span>Found {formatDateShort(match.created_at)}</span>
                                  <span className="text-muted-foreground/30">•</span>
                                </>
                              )}
                              {matchStatus.label !== "Pending" && (
                                <span className={matchStatus.className}>
                                  {matchStatus.label}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right Action Area */}
                          <div className="flex items-center gap-1 shrink-0">
                            {match.status === "pending" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMatchForAction(isSelected ? null : match.id);
                                }}
                                className={`p-1.5 rounded transition-colors ${
                                  isSelected
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-muted/50 text-muted-foreground"
                                }`}
                              >
                                {isSelected ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <X className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => { setSelectedMatch(match); setDialogOpen(true); }}
                              className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Follow Up Section */}
            {showFollowUp && (
              <>
                <Separator className="bg-border/20" />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground">Follow Up</h3>
                  
                  {savedFollowUpQuestions.length > 0 && (
                    <div className="space-y-2">
                      {savedFollowUpQuestions.map((q) => (
                        <div key={q.id} className="p-3 rounded-lg bg-muted/5 border border-border/20 space-y-2">
                          <p className="text-sm font-medium">{q.question}</p>
                          {q.response ? (
                            <div className="p-2 rounded bg-muted/10 border border-border/10">
                              <p className="text-xs text-muted-foreground mb-1">Response:</p>
                              <p className="text-sm">{q.response}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Awaiting response...</p>
                          )}
                        </div>
                      ))}
                      
                      {savedFollowUpQuestions.some(q => q.response) && (
                        <Button
                          variant="outline"
                          className="w-full h-9 text-xs"
                          onClick={async () => {
                            setReSearching(true);
                            try {
                              await searchWithFollowUpResponses(id);
                              const matchesData = await getInquiryMatches(id);
                              setMatches(matchesData.matches);
                              setInquiry(prev => prev ? { ...prev, status: "matched" } : null);
                            } catch (err) {
                              console.error("Failed to re-search:", err);
                            } finally {
                              setReSearching(false);
                            }
                          }}
                          disabled={reSearching}
                        >
                          {reSearching ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              Searching...
                            </>
                          ) : (
                            <>
                              <Search className="w-3.5 h-3.5 mr-1.5" />
                              Re-run Search
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Add a question..."
                      className="flex-1 h-9 text-sm"
                      disabled={inquiry.status === "follow_up"}
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
                      disabled={!newQuestion.trim() || inquiry.status === "follow_up"}
                      size="icon"
                      className="h-9 w-9"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {followUpQuestions.length === 0 && (
                    <Button
                      variant="outline"
                      className="w-full h-9 text-xs"
                      onClick={async () => {
                        setGeneratingQuestions(true);
                        try {
                          const response = await generateFollowUpQuestions(id);
                          setFollowUpQuestions(response.questions);
                        } catch (err) {
                          console.error("Failed to generate questions:", err);
                        } finally {
                          setGeneratingQuestions(false);
                        }
                      }}
                      disabled={generatingQuestions || inquiry.status === "follow_up"}
                    >
                      {generatingQuestions ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          Generate AI Questions
                        </>
                      )}
                    </Button>
                  )}

                  {followUpQuestions.length > 0 && (
                    <div className="space-y-1.5">
                      {followUpQuestions.map((question, index) => (
                        <div key={index} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/5 border border-border/20">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-medium shrink-0">
                            {index + 1}
                          </div>
                          <p className="flex-1 text-sm">{question}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => {
                              setFollowUpQuestions(prev => prev.filter((_, i) => i !== index));
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {inquiry.status === "follow_up" && followUpQuestions.length === 0 ? (
                    <Button className="w-full h-9 text-xs" disabled>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Follow-up Sent
                    </Button>
                  ) : (
                    <Button
                      className="w-full h-9 text-xs"
                      onClick={async () => {
                        setSendingFollowUp(true);
                        try {
                          const response = await sendFollowUpQuestions(id, followUpQuestions);
                          setInquiry(prev => prev ? { ...prev, status: "follow_up" } : null);
                          setSavedFollowUpQuestions(prev => [...prev, ...response.questions]);
                          setFollowUpQuestions([]);
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
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          Send Follow Up
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Bottom Actions Bar */}
      {hasActions && (
        <div className="sticky bottom-0 z-30 border-t border-border/10 bg-background/95 backdrop-blur-sm p-4">
          <div className="space-y-2">
            {/* Submitted - Start Review */}
            {inquiry.status === "submitted" && (
              <Button 
                onClick={handleTriggerSearch} 
                disabled={searchLoading}
                className="w-full h-11"
              >
                {searchLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting Review...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Review
                  </>
                )}
              </Button>
            )}

            {/* Under Review - Loading */}
            {inquiry.status === "under_review" && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                <span className="text-sm text-orange-600 dark:text-orange-400">AI is analyzing matches...</span>
              </div>
            )}

            {/* Matched - Confirm, Follow Up, or Deny */}
            {inquiry.status === "matched" && (
              selectedMatchForAction ? (
                <div className="space-y-2">
                  <Button 
                    onClick={() => handleMatchAction(selectedMatchForAction, "approve")}
                    disabled={actionLoading === selectedMatchForAction}
                    className="w-full h-11"
                  >
                    {actionLoading === selectedMatchForAction ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Confirm Match
                      </>
                    )}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={() => handleStatusChange("follow_up")}
                      variant="outline"
                      className="h-10"
                    >
                      <MessageCircleQuestion className="w-4 h-4 mr-2" />
                      Follow Up
                    </Button>
                    <Button 
                      onClick={() => handleStatusChange("denied")}
                      variant="outline"
                      className="h-10"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Deny
                    </Button>
                  </div>
                </div>
              ) : (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertTitle>No match selected</AlertTitle>
                  <AlertDescription>
                    Select a match from the list above to confirm.
                  </AlertDescription>
                </Alert>
              )
            )}

            {/* Follow Up - Re-run search or Deny */}
            {inquiry.status === "follow_up" && (
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handleTriggerSearch}
                  disabled={searchLoading}
                  variant="outline"
                  className="h-11"
                >
                  {searchLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Re-run Search
                </Button>
                <Button 
                  onClick={() => handleStatusChange("denied")}
                  variant="outline"
                  className="h-11"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Deny
                </Button>
              </div>
            )}

            {/* Reviewed - Run search */}
            {inquiry.status === "reviewed" && (
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handleTriggerSearch}
                  disabled={searchLoading}
                  className="h-11"
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
                  variant="outline"
                  className="h-11"
                >
                  <MessageCircleQuestion className="w-4 h-4 mr-2" />
                  Follow Up
                </Button>
              </div>
            )}

            {/* Resolved - Subtle disabled state */}
            {inquiry.status === "resolved" && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">Inquiry Resolved</span>
              </div>
            )}

            {/* Denied - Subtle disabled state */}
            {inquiry.status === "denied" && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <XCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive font-medium">Inquiry Denied</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-md p-0">
          {inquiry.image_url && (
            <div className="relative aspect-square">
              <Image
                src={inquiry.image_url}
                alt="Lost item"
                fill
                className="object-cover rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                      className={`flex-1 h-11 ${
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
                      variant="outline"
                      className="flex-1 h-11"
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
  );
}
