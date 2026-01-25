"use client";

import { useState, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Package, Calendar, Plus, MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CustomTabs } from "@/components/ui/custom-tabs";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InquiryCard, InquiryStatus } from "@/components/inquiry-card";
import { AddItemForm, ItemFormData } from "@/components/add-item-form";

interface Item {
  id: string;
  name: string;
  description: string;
  status: "stored" | "claimed" | "disposed";
  foundDate: string;
  location: string;
  imageUrl?: string;
}

interface Inquiry {
  id: string;
  item: string;
  description: string;
  date: string;
  status: InquiryStatus;
  imageUrl?: string;
  userEmail?: string;
}

// Mock Data
const mockItems: Item[] = [
  {
    id: "1",
    name: "Blue Umbrella",
    description: "Dark blue umbrella with wooden handle. Found near the main entrance.",
    status: "stored",
    foundDate: "2025-10-02",
    location: "Main Entrance",
    imageUrl: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800&auto=format&fit=crop&q=60"
  },
  {
    id: "2",
    name: "Math Textbook",
    description: "Advanced Calculus 3rd Edition. Found in Room 302.",
    status: "claimed",
    foundDate: "2025-10-05",
    location: "Room 302",
  },
  {
    id: "3",
    name: "Silver Watch",
    description: "Silver wristwatch with metal band. Found in the library.",
    status: "stored",
    foundDate: "2025-10-08",
    location: "Library",
    imageUrl: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&auto=format&fit=crop&q=60"
  }
];

const mockInquiries: Inquiry[] = [
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

export default function CollectionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [activeTab, setActiveTab] = useState("items");
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [items, setItems] = useState<Item[]>(mockItems);

  const handleAddItem = (data: ItemFormData) => {
    const newItem: Item = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.name,
      description: data.description,
      status: "stored", // Default state
      foundDate: data.foundDate ? format(data.foundDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      location: data.location,
      imageUrl: data.imageUrl,
    };
    setItems((prev) => [newItem, ...prev]);
  };

  // Unwrap params safely using React.use() as required in Next.js 15+
  const { id } = use(params);

  // Mock lookup for collection details
  const collectionNames: Record<string, string> = {
    "1": "October 2025 Lost Items",
    "2": "Electronics",
    "3": "Clothing & Accessories",
  };

  const collectionName = collectionNames[id] || `Collection #${id}`;

  return (
    <main className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center pt-28 pb-12 px-4 md:px-6">
       {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/5 z-0" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />

      {/* Back Button */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-6 left-6 z-20"
      >
         <Button variant="ghost" size="sm" asChild className="hover:bg-accent/10">
          <Link href="/assistant">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Collections
          </Link>
        </Button>
      </motion.div>

       {/* Header */}
      <div className="w-full max-w-5xl relative z-10 mb-8 text-center space-y-6">
        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           className="space-y-2"
        >
          <div className="uppercase tracking-widest text-xs font-medium text-muted-foreground mb-2">Collection</div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50 pb-1">
            {collectionName}
          </h1>
        </motion.div>
        
        <div className="flex justify-center">
            <CustomTabs 
                tabs={[
                    { id: "items", label: "Found Items" },
                    { id: "inquiries", label: "Inquiries" }
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
                className="w-full max-w-md"
            />
        </div>
      </div>

      {/* Content Area */}
      <div className="w-full max-w-5xl relative z-10">
        <AnimatePresence mode="wait">
            {activeTab === "items" ? (
                <motion.div
                    key="items"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map((item) => (
                             <Card key={item.id} className="h-full border-muted-foreground/20 bg-transparent hover:border-primary/50 transition-colors backdrop-blur-sm group overflow-hidden flex flex-col p-0 gap-0">
                                <div className="relative aspect-square w-full bg-muted/50 overflow-hidden border-b border-muted-foreground/10">
                                    {item.imageUrl ? (
                                        <Image 
                                            src={item.imageUrl} 
                                            alt={item.name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                            <Package className="w-8 h-8" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                         <Badge variant={item.status === "stored" ? "default" : "secondary"} className="capitalize">
                                            {item.status}
                                         </Badge>
                                    </div>
                                </div>
                                 <CardHeader className="pb-2 pt-4 px-4 md:px-6">
                                    <CardTitle className="text-lg">{item.name}</CardTitle>
                                    <CardDescription className="flex items-center gap-3 text-xs">
                                         <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {item.foundDate}
                                         </div>
                                         <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {item.location}
                                         </div>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow pb-4 md:pb-6 px-4 md:px-6">
                                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="relative z-10 w-full flex justify-center mt-8">
                        <Button className="gap-2" onClick={() => setIsAddFormOpen(true)}>
                            <Plus className="w-4 h-4" /> Add Found Item
                        </Button>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    key="inquiries"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                >
                    {mockInquiries.map((inquiry) => (
                        <motion.div
                            key={inquiry.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <InquiryCard 
                                id={inquiry.id}
                                title={inquiry.item}
                                description={inquiry.description}
                                date={inquiry.date}
                                status={inquiry.status}
                                imageUrl={inquiry.imageUrl}
                                userEmail={inquiry.userEmail}
                                action={
                                    <Link href="#" className="group flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                                        <span>Review</span>
                                        <ArrowLeft className="w-3.5 h-3.5 rotate-180 transition-transform group-hover:translate-x-1" />
                                    </Link>
                                }
                            />
                        </motion.div>
                    ))}
                    {mockInquiries.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            No inquiries found for this collection.
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      <AddItemForm 
        isOpen={isAddFormOpen} 
        onClose={() => setIsAddFormOpen(false)} 
        onSubmit={handleAddItem} 
      />
    </main>
  );
}
