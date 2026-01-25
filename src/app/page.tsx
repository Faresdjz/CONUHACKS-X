"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Search, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "../components/ui/separator";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5 z-0" />
      <div className="absolute top-0 left-0 w-full h-96 bg-accent/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-full h-96 bg-purple-500/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 mb-12 md:mb-16 text-center space-y-4"
      >
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
          ilostit.
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-md mx-auto">
          Recover what matters.
        </p>
      </motion.header>

      <Separator className="w-24 mb-12 opacity-20" />

      {/* Main Options */}
      <div className="relative z-10 grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl w-full px-4">

        {/* Regular Search Option */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          className="h-full"
        >
          <Card className="h-full border-muted/20 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
             <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-foreground">
                  <Search className="w-5 h-5" />
                </div>
                Search for lost items
              </CardTitle>
              <CardDescription>
                Find what you lost.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Tell us what you lost and we will help you find it quickly.
              </p>
            </CardContent>
            <CardFooter className="pt-4">
              <Button asChild className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors" variant="outline">
                <Link href="/inquiries">
                  Start Searching <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Assistant Portal Option */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className="h-full"
        >
          <Card className="h-full border-muted/20 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                Assistant Portal
              </CardTitle>
              <CardDescription>
                Authorized personnel only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Verify items, confirm matches against the database, and manage lost inventory.
              </p>
            </CardContent>
            <CardFooter className="pt-4">
              <Button asChild className="w-full group-hover:bg-accent group-hover:text-accent-foreground transition-colors" variant="outline">
                <Link href="/assistant">
                  Access Portal <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

      </div>

      {/* Footer / Credits */}
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

