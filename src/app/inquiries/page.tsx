"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InquiriesList } from "@/components/inquiries-list";

export default function InquiriesPage() {
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
          className="space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50 pb-1">My Inquiries</h1>
          <p className="text-muted-foreground text-lg">
            Track the status of your lost item reports.
          </p>
        </motion.div>
      </div>

      {/* Content */}
      <div className="w-full max-w-4xl relative z-10">
        <InquiriesList />
      </div>
    </main>
  );
}
