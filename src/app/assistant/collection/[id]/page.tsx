"use client";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Package, Calendar, Plus, MapPin, Loader2, Trash2, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InquiryCard, InquiryStatus } from "@/components/inquiry-card";
import { AddItemForm, ItemFormData } from "@/components/add-item-form";
import { 
  getCollection, 
  getCollectionItems, 
  getAllInquiries,
  createItem,
  deleteItem,
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
  const firstSentence = caption.split(/[.!?|]/)[0];
  if (firstSentence.length <= 50) return firstSentence;
  return firstSentence.slice(0, 47) + "...";
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
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<APIItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const { id } = use(params);

  useEffect(() => {
    getCollection(id)
      .then((data) => setCollection(data))
      .catch((err) => console.error("Failed to fetch collection:", err))
      .finally(() => setIsLoadingCollection(false));

    getCollectionItems(id)
      .then((data) => setItems(data.items))
      .catch((err) => console.error("Failed to fetch items:", err))
      .finally(() => setIsLoadingItems(false));

    getAllInquiries(undefined, id)
      .then((data) => setInquiries(data.inquiries))
      .catch((err) => console.error("Failed to fetch inquiries:", err))
      .finally(() => setIsLoadingInquiries(false));
  }, [id]);

  const handleAddItem = async (data: ItemFormData) => {
    if (!data.imageFile) {
      throw new Error("Image is required");
    }
    const newItem = await createItem(data.imageFile, id, data.location || undefined);
    setItems((prev) => [newItem, ...prev]);
  };

  const handleDeleteClick = (e: React.MouseEvent, item: APIItem) => {
    e.stopPropagation();
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteItem(itemToDelete.id);
      setItems((prev) => prev.filter((item) => item.id !== itemToDelete.id));
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (err) {
      console.error("Failed to delete item:", err);
      alert("Failed to delete item. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const collectionName = collection?.name || `Collection #${id}`;

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/98 z-0" />

      {/* Compact Top Bar */}
      <nav className="relative z-20 border-b border-border/20 bg-background/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="h-9 w-9">
              <Link href="/assistant">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate">
                {collectionName}
              </h1>
              {!isLoadingItems && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Found items • {items.length} {items.length === 1 ? 'item' : 'items'}
                </p>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Slim Tabs */}
      <div className="relative z-10 border-b border-border/20 bg-background/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("items")}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === "items"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Found Items
              {activeTab === "items" && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("inquiries")}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === "inquiries"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Inquiries
              {activeTab === "inquiries" && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-6">
        <AnimatePresence mode="wait">
          {activeTab === "items" ? (
            <motion.div
              key="items"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="pt-4"
            >
              {isLoadingItems ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {items.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 bg-muted/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                      <h3 className="text-base font-medium mb-1.5">No items yet</h3>
                      <p className="text-sm text-muted-foreground mb-6">Add your first found item to get started.</p>
                      <Button onClick={() => setIsAddFormOpen(true)} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* 2-Column Mobile Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {items.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.15 }}
                            className="group relative"
                            onMouseEnter={() => setHoveredItem(item.id)}
                            onMouseLeave={() => setHoveredItem(null)}
                          >
                            <div className="bg-card border border-border/30 rounded-lg overflow-hidden transition-all duration-200 hover:border-border/50 hover:shadow-md cursor-pointer">
                              {/* Thumbnail */}
                              <div className="relative aspect-square w-full bg-muted/20 overflow-hidden">
                                {item.image_url ? (
                                  <Image 
                                    src={item.image_url} 
                                    alt={getItemTitle(item.caption)}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                    <Package className="w-8 h-8" />
                                  </div>
                                )}
                                {/* Status Badge */}
                                <div className="absolute top-2 right-2">
                                  <Badge 
                                    variant={item.status === "available" ? "default" : "secondary"} 
                                    className="text-[10px] px-1.5 py-0.5 capitalize font-medium"
                                  >
                                    {item.status === "matched" || item.status === "claimed" ? "taken" : item.status}
                                  </Badge>
                                </div>
                                {/* Delete Button on Hover */}
                                {hoveredItem === item.id && (
                                  <div className="absolute top-2 left-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 bg-background/90 hover:bg-destructive/10 hover:text-destructive border border-border/50"
                                      onClick={(e) => handleDeleteClick(e, item)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              
                              {/* Content */}
                              <div className="p-3 space-y-1.5">
                                <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                                  {getItemTitle(item.caption)}
                                </h3>
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{formatDate(item.created_at)}</span>
                                  {item.category && (
                                    <>
                                      <span className="text-muted-foreground/50">•</span>
                                      <span className="truncate">{item.category}</span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Add Button */}
                      <div className="flex justify-center pt-6">
                        <Button onClick={() => setIsAddFormOpen(true)} size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Found Item
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="inquiries"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="pt-4 space-y-4"
            >
              {isLoadingInquiries ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {inquiries.length === 0 ? (
                    <div className="py-16 text-center">
                      <h3 className="text-base font-medium mb-1.5">No inquiries found</h3>
                      <p className="text-sm text-muted-foreground">No inquiries have been submitted for this collection yet.</p>
                    </div>
                  ) : (
                    inquiries.map((inquiry) => (
                      <motion.div
                        key={inquiry.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
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
                    ))
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Found Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone and will remove the item from the collection permanently.
            </DialogDescription>
          </DialogHeader>
          {itemToDelete && (
            <div className="py-4">
              <p className="text-sm font-medium">{getItemTitle(itemToDelete.caption)}</p>
              {itemToDelete.caption && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{itemToDelete.caption}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setItemToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
