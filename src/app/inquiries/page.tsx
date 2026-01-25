"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InquiriesList } from "@/components/inquiries-list";
import { InquiryForm } from "@/components/inquiry-form";

export default function InquiriesPage() {
  const [activeTab, setActiveTab] = useState("new");

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Top App Bar */}
      <nav className="border-b border-border/10 bg-background/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0">
              <Link href="/">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <h1 className="text-base font-medium text-foreground">Inquiries</h1>
          </div>
        </div>
      </nav>

      {/* Segmented Control */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex rounded-lg bg-muted/10 p-1 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab("new")}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "new"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            New
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "history"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        <div className="px-4 pb-6">
          <AnimatePresence mode="wait">
            {activeTab === "new" ? (
              <motion.div
                key="new"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="max-w-2xl mx-auto"
              >
                <InquiryForm />
              </motion.div>
            ) : (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="max-w-2xl mx-auto"
              >
                <InquiriesList />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
