"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InquiriesList } from "@/components/inquiries-list";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { InquiryForm } from "@/components/inquiry-form";

export default function InquiriesPage() {
  const [activeTab, setActiveTab] = useState("new");

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

      {/* Header & Tabs */}
      <div className="w-full max-w-4xl relative z-10 mb-8 text-center space-y-6">
        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="space-y-4"
        >
          <div className="space-y-2">
            <div className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-2">Inquiries</div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50 pb-1">
              My Inquiries
            </h1>
          </div>
          
          <div className="flex justify-center pt-2">
            <CustomTabs 
                tabs={[
                    { id: "new", label: "New Inquiry" },
                    { id: "history", label: "History" }
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
                className="w-full max-w-md"
            />
          </div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="w-full max-w-4xl relative z-10">
        <AnimatePresence mode="wait">
            {activeTab === "new" ? (
                <motion.div
                    key="new"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    <InquiryForm />
                </motion.div>
            ) : (
                <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    <InquiriesList />
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </main>
  );
}
