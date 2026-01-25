"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Search, Package, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; 
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Mock Data
interface Collection {
  id: string;
  name: string;
  itemCount: number;
  createdAt: string;
}

const initialCollections: Collection[] = [
  { id: "1", name: "October 2025 Lost Items", itemCount: 12, createdAt: "2025-10-01" },
  { id: "2", name: "Electronics", itemCount: 5, createdAt: "2025-09-15" },
  { id: "3", name: "Clothing & Accessories", itemCount: 28, createdAt: "2025-09-10" },
];

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    setIsCreating(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newCollection: Collection = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCollectionName,
      itemCount: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setCollections([newCollection, ...collections]);
    setNewCollectionName("");
    setIsCreating(false);
    setIsCreateModalOpen(false);
  };

  const handleDeleteCollection = (id: string) => {
    setCollections(collections.filter((c) => c.id !== id));
  };

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
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50 pb-1">
            Collections
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage collections of lost found items.
          </p>
        </motion.div>
      </div>



      {/* Collections Grid */}
      <div className="w-full max-w-4xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {collections.map((collection) => (
              <motion.div
                key={collection.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                layout
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full border-muted-foreground/20 hover:border-primary/50 transition-colors bg-transparent hover:shadow-lg group relative overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between gap-2">
                        <span className="truncate">{collection.name}</span>
                        <div className="flex shrink-0">
                            {/* Delete Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-1 -mr-2"
                                onClick={() => handleDeleteCollection(collection.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardTitle>
                    <CardDescription>Created on {collection.createdAt}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="w-4 h-4" />
                        <span>{collection.itemCount} items</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                        <Button variant="outline" className="w-full group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors" asChild>
                            <Link href={`/assistant/collection/${collection.id}`}>View Items</Link>
                        </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {collections.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 opacity-50" />
                </div>
                <p className="text-lg font-medium">No collections found</p>
                <p className="text-sm">Try creating a new one or adjusting your search.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Button */}
      <div className="relative z-10 w-full max-w-4xl flex justify-center mt-8">
        <Button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="gap-2"
        >
            <Plus className="w-4 h-4" /> Create New Collection
        </Button>
      </div>

      {/* Create Catalog Modal (Custom simplified version or use Dialog if available) */}
      <AnimatePresence>
        {isCreateModalOpen && (
            <>
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsCreateModalOpen(false)}
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-8 border bg-background p-10 shadow-lg duration-200 sm:rounded-xl"
                >
                    <div className="flex flex-col space-y-2 text-center">
                        <h2 className="text-xl font-semibold leading-none tracking-tight">Create New Collection</h2>
                        <p className="text-sm text-muted-foreground">
                            Enter a name for the new collection. You can add items to it later.
                        </p>
                    </div>
                    
                    <form onSubmit={handleCreateCollection} className="space-y-8">
                        <div className="space-y-3">
                            <Label htmlFor="name" className="text-md">Collection Name</Label>
                            <Input 
                                id="name" 
                                placeholder="e.g. Lost Keys & Wallets" 
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                autoFocus
                                className="h-11"
                            />
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row justify-center gap-4">
                            <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)} className="px-8">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!newCollectionName.trim() || isCreating} className="px-8">
                                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Collection
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </>
        )}
      </AnimatePresence>
    </main>
  );
}
