"use client";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Package, Calendar, Plus, MapPin, Loader2 } from "lucide-react";
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
import { 
  getCollection, 
  getCollectionItems, 
  getAllInquiries,
  createItem,
  Item as APIItem,
  BackendInquiry,
  Collection
} from "@/lib/api";

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function getItemTitle(caption: string | null): string {
  if (!caption) return "Found Item";
  // Take first sentence or first 40 chars
  const firstSentence = caption.split(/[.!?|]/)[0];
  if (firstSentence.length <= 40) return firstSentence;
  return firstSentence.slice(0, 37) + "...";
}

function getInquiryTitle(description: string | null): string {
  if (!description) return "Lost Item";
  const firstSentence = description.split(/[.!?]/)[0];
  if (firstSentence.length <= 40) return firstSentence;
  return firstSentence.slice(0, 37) + "...";
}

export default function CollectionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [activeTab, setActiveTab] = useState("items");
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  
  // Data states
  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<APIItem[]>([]);
  const [inquiries, setInquiries] = useState<BackendInquiry[]>([]);
  
  // Loading states
  const [isLoadingCollection, setIsLoadingCollection] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isLoadingInquiries, setIsLoadingInquiries] = useState(true);

  // Unwrap params safely using React.use() as required in Next.js 15+
  const { id } = use(params);

  useEffect(() => {
    // Fetch collection details
    getCollection(id)
      .then((data) => setCollection(data))
      .catch((err) => console.error("Failed to fetch collection:", err))
      .finally(() => setIsLoadingCollection(false));

    // Fetch items for this collection
    getCollectionItems(id)
      .then((data) => setItems(data.items))
      .catch((err) => console.error("Failed to fetch items:", err))
      .finally(() => setIsLoadingItems(false));

    // Fetch all inquiries (not filtered by collection for now)
    getAllInquiries()
      .then((data) => setInquiries(data.inquiries))
      .catch((err) => console.error("Failed to fetch inquiries:", err))
      .finally(() => setIsLoadingInquiries(false));
  }, [id]);

  const handleAddItem = async (data: ItemFormData) => {
    if (!data.imageFile) {
      throw new Error("Image is required");
    }
    
    console.log("Adding item to collection:", id);
    
    const newItem = await createItem(data.imageFile, id, data.location || undefined);
    console.log("Item created:", newItem);
    setItems((prev) => [newItem, ...prev]);
  };

  const collectionName = collection?.name || `Collection #${id}`;

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
                    {isLoadingItems ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {items.map((item) => (
                                     <Card key={item.id} className="h-full border-muted-foreground/20 bg-transparent hover:border-primary/50 transition-colors backdrop-blur-sm group overflow-hidden flex flex-col p-0 gap-0">
                                        <div className="relative aspect-square w-full bg-muted/50 overflow-hidden border-b border-muted-foreground/10">
                                            {item.image_url ? (
                                                <Image 
                                                    src={item.image_url} 
                                                    alt={getItemTitle(item.caption)}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                                    <Package className="w-8 h-8" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2">
                                                 <Badge variant={item.status === "available" ? "default" : "secondary"} className="capitalize">
                                                    {item.status}
                                                 </Badge>
                                            </div>
                                        </div>
                                         <CardHeader className="pb-2 pt-4 px-4 md:px-6">
                                            <CardTitle className="text-lg">{getItemTitle(item.caption)}</CardTitle>
                                            <CardDescription className="flex items-center gap-3 text-xs">
                                                 <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> {formatDate(item.created_at)}
                                                 </div>
                                                 {item.category && (
                                                     <div className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" /> {item.category}
                                                     </div>
                                                 )}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-grow pb-4 md:pb-6 px-4 md:px-6">
                                            <p className="text-sm text-muted-foreground line-clamp-2">{item.caption || "No description available"}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {items.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    No items found in this collection.
                                </div>
                            )}

                            <div className="relative z-10 w-full flex justify-center mt-8">
                                <Button className="gap-2" onClick={() => setIsAddFormOpen(true)}>
                                    <Plus className="w-4 h-4" /> Add Found Item
                                </Button>
                            </div>
                        </>
                    )}
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
                    {isLoadingInquiries ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            {inquiries.map((inquiry) => (
                                <motion.div
                                    key={inquiry.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <InquiryCard 
                                        id={inquiry.id}
                                        title={getInquiryTitle(inquiry.description)}
                                        description={inquiry.description || ""}
                                        date={formatDate(inquiry.created_at)}
                                        status={inquiry.status as InquiryStatus}
                                        imageUrl={inquiry.image_url || undefined}
                                        action={
                                            <Link href={`/assistant/inquiries/${inquiry.id}`} className="group flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                                                <span>Review</span>
                                                <ArrowLeft className="w-3.5 h-3.5 rotate-180 transition-transform group-hover:translate-x-1" />
                                            </Link>
                                        }
                                    />
                                </motion.div>
                            ))}
                            {inquiries.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    No inquiries found.
                                </div>
                            )}
                        </>
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
