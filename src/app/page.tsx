"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/98 z-0" />

      {/* Top Bar */}
      <nav className="relative z-20 border-b border-border/20 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              ilostit
            </h1>
          </div>
        </div>
      </nav>

      {/* Hero Section - Mobile Optimized */}
      <div className="flex-1 flex flex-col justify-center relative z-10 px-6 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-md mx-auto w-full space-y-8"
        >
          {/* Headline */}
          <div className="space-y-3 text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
              Find your lost item.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              Private matches. Verified before anything is revealed.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button asChild className="w-full h-12 text-base font-medium" size="lg">
              <Link href="/inquiries">
                Start Search
              </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full h-12 text-base" size="lg">
              <Link href="/assistant">
                Assistant Portal
              </Link>
            </Button>
          </div>

          {/* Trust Strip */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span>Private</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span>Verified</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span>Fast</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/20 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-center">
            <p className="text-xs text-muted-foreground/60">
              © 2026 ilostit
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
