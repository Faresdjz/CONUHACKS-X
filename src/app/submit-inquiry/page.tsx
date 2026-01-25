"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { InquiryForm } from "@/components/inquiry-form";
import { Button } from "@/components/ui/button";

export default function SearchPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5 z-0" />
      <div className="absolute top-0 left-0 w-full h-96 bg-accent/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-full h-96 bg-purple-500/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
      
      {/* Back Button */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute top-6 left-6 z-20"
      >
        <Button variant="ghost" size="sm" asChild className="hover:bg-accent/10">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
        </Button>
      </motion.div>

      {/* Main Content */}
      <div className="w-full max-w-2xl relative z-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <InquiryForm />
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-6 text-muted-foreground/40 text-xs md:text-sm"
      >
        © 2026 ilostit Inc.
      </motion.div>
    </main>
  );
}
