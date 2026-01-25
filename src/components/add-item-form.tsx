"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface AddItemFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ItemFormData) => Promise<void>;
}

export interface ItemFormData {
  foundDate: Date | undefined;
  location: string;
  imageFile?: File;
  imageUrl?: string;
}

export function AddItemForm({ isOpen, onClose, onSubmit }: AddItemFormProps) {
  const [formData, setFormData] = useState<ItemFormData>({
    foundDate: new Date(),
    location: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, imageFile: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit({
        ...formData,
        imageUrl: imagePreview || undefined
      });
      
      resetForm();
      onClose();
    } catch (error) {
      console.error("Failed to add item:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      foundDate: new Date(),
      location: "",
    });
    setImagePreview(null);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none"
          >
            <div className="w-full max-w-lg bg-background border rounded-xl shadow-lg pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="flex items-center justify-between p-6">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Add Found Item</h2>
                  <p className="text-sm text-muted-foreground">Upload a photo and AI will generate the description.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto p-6 pt-2 space-y-4">
                
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label className="text-base font-medium">Item Photo</Label>
                  <AnimatePresence mode="wait">
                    {imagePreview ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative h-64 rounded-lg overflow-hidden border border-border group"
                      >
                        <Image 
                          src={imagePreview} 
                          alt="Preview" 
                          fill 
                          className="object-cover"
                        />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button 
                            type="button" 
                            variant="destructive" 
                            onClick={() => {
                              setImagePreview(null);
                              setFormData(prev => ({ ...prev, imageFile: undefined }));
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            size="sm"
                            className="gap-2"
                          >
                            <X className="w-4 h-4" /> Remove Photo
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/5 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group text-center"
                        >
                          <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <p className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">
                            Click to upload a photo
                          </p>
                          <p className="text-xs text-muted-foreground">
                            JPG, PNG or WEBP (Max 5MB)
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="foundDate" className="text-base font-medium">Date Found</Label>
                    <div className="relative">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal bg-background/50 focus:bg-background transition-colors border-input h-10",
                              !formData.foundDate && "text-muted-foreground"
                            )}
                          >
                            {formData.foundDate ? (
                              format(formData.foundDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.foundDate}
                            onSelect={(date) => setFormData((prev) => ({ ...prev, foundDate: date }))}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-base font-medium">Location Found</Label>
                    <div className="relative">
                      <Input
                        id="location"
                        name="location"
                        placeholder="e.g. Library"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="pl-9 bg-background/50 focus:bg-background transition-colors"
                        required
                      />
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-6 pt-2 flex justify-center gap-3 bg-muted/5">
                <Button variant="outline" onClick={onClose} type="button">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || !formData.imageFile}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Item"
                  )}
                </Button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
