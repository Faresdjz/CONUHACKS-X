"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InquiryCard, InquiryStatus } from "@/components/inquiry-card";

interface Inquiry {
  id: string;
  item: string;
  description: string;
  date: string;
  status: InquiryStatus;
  imageUrl?: string;
}

const inquiries: Inquiry[] = [
  {
    id: "1",
    item: "Black Leather Wallet",
    description: "Lost near the cafeteria. Contains ID and credit cards.",
    date: "Oct 24, 2025",
    status: "resolved",
    imageUrl: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    id: "2",
    item: "AirPods Pro Case",
    description: "White case with a small scratch on the front.",
    date: "Jan 12, 2026",
    status: "follow_up",
  },
  {
    id: "3",
    item: "Blue Water Bottle",
    description: "Hydroflask with stickers on it.",
    date: "Dec 15, 2025",
    status: "denied",
  },
];


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
          className="space-y-2"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50 pb-1">My Inquiries</h1>
          <p className="text-muted-foreground text-lg">
            Track the status of your lost item reports.
          </p>
        </motion.div>
      </div>

      {/* List */}
      <div className="w-full max-w-4xl relative z-10 space-y-6">
        {inquiries.map((inquiry, index) => {
          const isFollowUp = inquiry.status === "follow_up";

          return (
            <motion.div
              key={inquiry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <InquiryCard 
                id={inquiry.id}
                title={inquiry.item}
                description={inquiry.description}
                date={inquiry.date}
                status={inquiry.status}
                imageUrl={inquiry.imageUrl}
                action={
                  isFollowUp && (
                    <Link href={`/inquiries/${inquiry.id}/follow-up`}>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-white group-hover:text-white/80 transition-colors">
                        <span>Resolve</span>
                        <ArrowLeft className="w-3.5 h-3.5 rotate-180 transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  )
                }
              />
            </motion.div>
          );
        })}
      </div>
    </main>
  );
}
