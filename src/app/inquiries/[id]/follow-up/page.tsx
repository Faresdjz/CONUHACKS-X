"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, ChevronRight, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Mock questions for the demo
const questions = [
  {
    id: 1,
    type: "text",
    question: "What specific brand is the item?",
    description: "If you know the brand name or manufacturer, please specify it.",
    placeholder: "e.g. Apple, Nike, Hydro Flask",
  },
  {
    id: 2,
    type: "choice",
    question: "What is the primary material?",
    description: "Select the material that best describes your item.",
    options: ["Plastic", "Metal", "Fabric/Leather", "Glass", "Other"],
  },
  {
    id: 3,
    type: "text",
    question: "Are there any distinguishing marks?",
    description: "Scratches, stickers, engravings, or unique features.",
    placeholder: "e.g. Small dent on the bottom left corner",
  },
  {
    id: 4,
    type: "choice",
    question: "Where exactly did you check for it last?",
    description: "Help us narrow down the search area.",
    options: ["Cafeteria", "Library", "Gym", "Classroom", "Common Area"],
  },
];

export default function FollowUpPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;


  const handleNext = () => {
    if (!inputValue) return;
    
    // Save answer
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: inputValue }));
    
    if (currentIndex < totalQuestions - 1) {
      setInputValue(""); // Clear input or load existing answer for next Q if implemented
      setCurrentIndex(prev => prev + 1);
    } else {
      console.log("Completed with answers:", { ...answers, [currentQuestion.id]: inputValue });
      setIsCompleted(true);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      // Ideally load the previous answer back into inputValue here if we want persistent editing
      setInputValue(""); 
    }
  };

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

      {/* Main Card */}
      <div className="w-full max-w-lg relative z-10">


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
            {currentQuestion.type === "text" && (
              <Input
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={currentQuestion.placeholder}
                className="h-12 text-lg bg-background/50 border-white/20 focus:border-primary/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inputValue) handleNext();
                }}
              />
            )}

            {currentQuestion.type === "choice" && (
              <RadioGroup value={inputValue} onValueChange={setInputValue} className="gap-3">
                {currentQuestion.options?.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={option} className="peer sr-only" />
                    <Label
                      htmlFor={option}
                      className="flex-1 flex items-center justify-between p-4 rounded-xl border border-white/10 peer-data-[state=checked]:border-primary/50 peer-data-[state=checked]:bg-primary/5 hover:bg-accent/5 cursor-pointer transition-all"
                    >
                      {option}
                      {inputValue === option && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={handleBack}
                disabled={currentIndex === 0}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleNext}
                disabled={!inputValue}
                className="flex-[2] text-base"
              >
                {currentIndex === totalQuestions - 1 ? "Submit Support" : "Next Question"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
