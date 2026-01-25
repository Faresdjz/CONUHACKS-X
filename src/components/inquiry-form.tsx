"use client"

import * as React from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, X, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input" 

export function InquiryForm() {
  const [description, setDescription] = React.useState("")
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith("image/")) {
        setSelectedImage(file)
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      } else {
        alert("Please upload an image file.")
      }
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return

    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log("Submitted:", { description, image: selectedImage })
    setIsSubmitting(false)
    setIsSuccess(true)
  }

  const handleReset = () => {
    setDescription("")
    handleRemoveImage()
    setIsSuccess(false)
  }

  if (isSuccess) {
    return (
      <div className="w-full max-w-lg mx-auto relative overflow-hidden p-10 flex flex-col items-center text-center space-y-6">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 relative z-10"
        >
          <CheckCircle2 className="w-10 h-10" />
        </motion.div>
        <div className="space-y-2 relative z-10">
          <h3 className="text-2xl font-bold">Inquiry Submitted</h3>
          <p className="text-muted-foreground max-w-xs mx-auto">
            We&apos;ve received your inquiry. We&apos;ll verify it against our database and notify you if we find a match.
          </p>
        </div>
        <Button onClick={handleReset} variant="outline" className="mt-4 relative z-10">
          Submit Another Inquiry
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-8">
      <div className="space-y-2 text-center pb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
          What did you lose?
        </h1>
        <p className="text-muted-foreground text-md">
          Provide as many details as possible to help us identify your item.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-medium">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="E.g. Black leather wallet brands Tommy Hilfiger. Lost near the cafeteria entrance around 2 PM. It contains my ID and a credit card."
              className="min-h-[120px] resize-y bg-background/50 focus:bg-background transition-colors"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Image Upload Field */}
          <div className="space-y-2">
            <Label htmlFor="image" className="text-base font-medium">
              <span>Photo of the item</span>
            </Label>
            
            <AnimatePresence mode="wait">
              {previewUrl ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative h-64 rounded-lg overflow-hidden border border-border group"
                >
                  <Image 
                    src={previewUrl} 
                    alt="Preview" 
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={handleRemoveImage}
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
            
            <Input
              ref={fileInputRef}
              id="image"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full text-lg h-12"
            disabled={!description.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </Button>
      </form>
    </div>
  )
}
