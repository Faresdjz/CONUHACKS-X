"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, ChevronRight, MessageCircleQuestion, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFollowUpQuestions, submitFollowUpResponse, FollowUpQuestion } from "@/lib/api";

interface Question {
  id: string;
  question: string;
  description: string;
  placeholder?: string;
}

export default function FollowUpPage() {
  const params = useParams();
  const inquiryId = params.id as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch questions on mount
  useEffect(() => {
    async function fetchQuestions() {
      if (!inquiryId) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await getFollowUpQuestions(inquiryId);
        
        // Filter to only show unanswered questions
        const unansweredQuestions = response.questions.filter((q: FollowUpQuestion) => !q.response);
        
        if (response.questions.length === 0) {
          setError("No follow-up questions found for this inquiry.");
          return;
        }

        // If all questions are already answered, mark as completed
        if (unansweredQuestions.length === 0) {
          setIsCompleted(true);
          return;
        }

        // Transform only unanswered questions to our format
        const transformedQuestions: Question[] = unansweredQuestions.map((q: FollowUpQuestion) => ({
          id: q.id,
          question: q.question,
          description: "Please provide your answer below.",
          placeholder: "Type your answer here...",
        }));

        setQuestions(transformedQuestions);
      } catch (err) {
        console.error("Failed to fetch follow-up questions:", err);
        setError("Failed to load follow-up questions. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchQuestions();
  }, [inquiryId]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const handleNext = async () => {
    if (!inputValue || !currentQuestion) return;
    
    try {
      setSubmitting(true);
      
      // Submit the answer to the API
      await submitFollowUpResponse(currentQuestion.id, inputValue);
      
      // Save answer locally
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: inputValue }));
      
      if (currentIndex < totalQuestions - 1) {
        // Load next question's existing answer if any
        const nextQuestion = questions[currentIndex + 1];
        setInputValue(answers[nextQuestion.id] || "");
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsCompleted(true);
      }
    } catch (err) {
      console.error("Failed to submit answer:", err);
      setError("Failed to submit your answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const prevQuestion = questions[currentIndex - 1];
      setInputValue(answers[prevQuestion.id] || "");
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5 z-0" />
        <div className="flex flex-col items-center gap-4 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error && questions.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5 z-0" />
        <div className="w-full max-w-lg mx-auto relative overflow-hidden p-10 flex flex-col items-center text-center space-y-6 z-10">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <AlertCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">No Questions Found</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              {error}
            </p>
          </div>
          <Button size="lg" asChild className="mt-4 w-full" variant="outline">
            <Link href="/inquiries">Return to Inquiries</Link>
          </Button>
        </div>
      </main>
    );
  }

  // Completed state
  if (isCompleted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5 z-0" />
        
        <div className="w-full max-w-lg mx-auto relative overflow-hidden p-10 flex flex-col items-center text-center space-y-6 z-10">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 relative z-10"
          >
            <CheckCircle2 className="w-10 h-10" />
          </motion.div>
          <div className="space-y-2 relative z-10">
            <h3 className="text-2xl font-bold">Inquiry Updated</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
              We have updated your inquiry with the additional details. We will process this new information and get back to you shortly.
            </p>
          </div>
          <Button size="lg" asChild className="mt-4 relative z-10 w-full" variant="outline">
            <Link href="/inquiries">Return to Inquiries</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5 z-0" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Back Button */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-6 left-6 z-20"
      >
        <Button variant="ghost" size="sm" asChild className="hover:bg-accent/10">
          <Link href="/inquiries">
            <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
          </Link>
        </Button>
      </motion.div>

      {/* Progress indicator */}
      <div className="absolute top-6 right-6 z-20 text-sm text-muted-foreground">
        Question {currentIndex + 1} of {totalQuestions}
      </div>

      {/* Main Card */}
      <div className="w-full max-w-lg relative z-10">
        {currentQuestion && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 flex-shrink-0">
                <MessageCircleQuestion className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold leading-tight mb-2">{currentQuestion.question}</h2>
                <p className="text-muted-foreground">{currentQuestion.description}</p>
              </div>
            </div>

            <div className="space-y-6">
              <Input
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={currentQuestion.placeholder}
                className="h-12 text-lg bg-background/50 border-white/20 focus:border-primary/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inputValue && !submitting) handleNext();
                }}
                disabled={submitting}
              />

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={handleBack}
                  disabled={currentIndex === 0 || submitting}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleNext}
                  disabled={!inputValue || submitting}
                  className="flex-[2] text-base"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      {currentIndex === totalQuestions - 1 ? "Submit" : "Next Question"}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
