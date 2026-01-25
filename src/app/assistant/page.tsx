"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ArrowLeft, Loader2, FolderOpen, ChevronRight, Mail, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  getCollections, 
  createCollection as createCollectionAPI, 
  deleteCollection as deleteCollectionAPI,
  Collection,
  checkUserOrganization
} from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Email for organization confirmation requests
const ADMIN_EMAIL = "admin@ilostit.com"; // Change this to your admin email

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [hoveredCollection, setHoveredCollection] = useState<string | null>(null);
  const [showNoOrgDialog, setShowNoOrgDialog] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkOrganizationAndFetchCollections = async () => {
      try {
        // Get current user
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserEmail(user.email || null);
          
          // Check if user has an organization
          const result = await checkUserOrganization();
          console.log("[AssistantPage] Organization check result:", result);
          
          if (!result.hasOrg) {
            console.log("[AssistantPage] User has no organization, showing dialog");
            setShowNoOrgDialog(true);
            setIsLoading(false);
            return;
          }
        }
        
        // Fetch collections if user has organization
        const data = await getCollections();
        setCollections(data.collections);
      } catch (err) {
        console.error("Failed to fetch collections:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkOrganizationAndFetchCollections();
  }, []);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    setIsCreating(true);
    try {
      const newCollection = await createCollectionAPI(newCollectionName);
      setCollections([newCollection, ...collections]);
      setNewCollectionName("");
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error("Failed to create collection:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCollection = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteCollectionAPI(id);
      setCollections(collections.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete collection:", err);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/98 z-0" />

      {/* Top App Bar */}
      <nav className="relative z-20 border-b border-border/20 bg-background/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild className="h-9 w-9">
                <Link href="/">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <h1 className="text-lg font-semibold text-foreground">
                Collections
              </h1>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsCreateModalOpen(true)}
              className="h-9 w-9"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Compact Header */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
        <p className="text-sm text-muted-foreground">
          Found items grouped by collection.
        </p>
      </div>

      {/* Collections List */}
      <div className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {collections.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-muted/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-base font-medium mb-1.5">No collections yet</h3>
                <p className="text-sm text-muted-foreground mb-6">Create your first collection to get started.</p>
                <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Collection
                </Button>
              </div>
            ) : (
              <div className="space-y-0">
                <AnimatePresence>
                  {collections.map((collection) => (
                    <motion.div
                      key={collection.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Link 
                        href={`/assistant/collection/${collection.id}`}
                        className="block"
                        onMouseEnter={() => setHoveredCollection(collection.id)}
                        onMouseLeave={() => setHoveredCollection(null)}
                      >
                        <div className="flex items-center justify-between py-4 px-0 border-b border-border/20 hover:bg-muted/30 transition-colors group cursor-pointer">
                          {/* Left: Content */}
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-base font-medium text-foreground truncate">
                                {collection.name}
                              </h3>
                              {hoveredCollection === collection.id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                  onClick={(e) => handleDeleteCollection(e, collection.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(collection.created_at)} • {collection.item_count} {collection.item_count === 1 ? 'item' : 'items'}
                            </p>
                          </div>
                          
                          {/* Right: Chevron */}
                          <div className="shrink-0">
                            <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Collection Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
            <DialogDescription>
              Enter a name for the new collection. You can add items to it later.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCollection} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Collection Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Lost Keys & Wallets" 
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!newCollectionName.trim() || isCreating}
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Collection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* No Organization Dialog */}
      <Dialog open={showNoOrgDialog} onOpenChange={setShowNoOrgDialog}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
            </div>
            <DialogTitle className="text-xl">Organization Required</DialogTitle>
            <DialogDescription className="text-center">
              Your account is not linked to an organization. To access the assistant portal, you need to be confirmed by an administrator.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center text-sm text-muted-foreground">
            Please contact the administrator to request access. Include your email address in the request.
            {userEmail && (
              <p className="mt-2 font-medium text-foreground">{userEmail}</p>
            )}
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Link>
            </Button>
            <Button asChild>
              <a 
                href={`mailto:${ADMIN_EMAIL}?subject=Organization Access Request&body=Hello,%0D%0A%0D%0AI would like to request access to the assistant portal.%0D%0A%0D%0AMy email: ${userEmail || '[your email]'}%0D%0A%0D%0AThank you.`}
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Admin
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
