"use client"

import * as React from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, X, Loader2, CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createInquiry, getCollectionByName } from "@/lib/api" 

export function InquiryForm() {
  const [step, setStep] = React.useState(1)
  const [collectionName, setCollectionName] = React.useState("")
  const [nameError, setNameError] = React.useState("")
  const [validatingName, setValidatingName] = React.useState(false)
  
  const [description, setDescription] = React.useState("")
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!collectionName.trim()) {
      setNameError("Please enter a collection name")
      return
    }
    
    setValidatingName(true)
    setNameError("")
    
    try {
      const collection = await getCollectionByName(collectionName.trim())
      
      if (!collection) {
        setNameError("Collection not found. Please check the name and try again.")
        return
      }
      
      setStep(2)
    } catch (error) {
      console.error("Failed to validate collection:", error)
      setNameError("Failed to validate collection. Please try again.")
    } finally {
      setValidatingName(false)
    }
  }

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
    
    try {
      await createInquiry(description, selectedImage || undefined, collectionName.trim())
      setIsSuccess(true)
    } catch (error) {
      console.error("Failed to submit inquiry:", error)
      alert("Failed to submit inquiry. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setStep(1)
    setCollectionName("")
    setNameError("")
    setValidatingName(false)
    setDescription("")
    handleRemoveImage()
    setIsSuccess(false)
  }

  if (isSuccess) {
    return (
      <div className="w-full flex flex-col items-center text-center space-y-4 py-8">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500"
        >
          <CheckCircle2 className="w-8 h-8" />
        </motion.div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Inquiry Submitted</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            We&apos;ve received your inquiry. We&apos;ll verify it against our database and notify you if we find a match.
          </p>
        </div>
        <Button onClick={handleReset} variant="outline" className="mt-2">
          Submit Another Inquiry
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Compact Heading */}
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Where did you last see it?</h2>
              <p className="text-sm text-muted-foreground">
                Enter the collection name where you saw the item.
              </p>
            </div>
            
            {/* Form */}
            <form id="step1-form" onSubmit={handleNameSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="collection-name" className="text-sm font-medium">
                  Collection name
                </Label>
                <Input
                  id="collection-name"
                  placeholder="E.g. Lost Items at Central Park"
                  value={collectionName}
                  onChange={(e) => {
                    setCollectionName(e.target.value)
                    if (nameError) setNameError("")
                  }}
                  className={nameError ? "border-destructive" : ""}
                />
                {nameError && (
                  <p className="text-sm text-destructive">{nameError}</p>
                )}
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Back Button */}
            <button
              onClick={() => setStep(1)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1"
            >
              ← Back
            </button>

            {/* Form */}
            <form id="step2-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Description Field */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="E.g. Black leather wallet brands Tommy Hilfiger. Lost near the cafeteria entrance around 2 PM. It contains my ID and a credit card."
                  className="min-h-[120px] resize-y"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Image Upload Field */}
              <div className="space-y-2">
                <Label htmlFor="image" className="text-sm font-medium">
                  Photo of the item
                </Label>
                
                <AnimatePresence mode="wait">
                  {previewUrl ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative h-48 rounded-lg overflow-hidden border border-border/30 group"
                    >
                      <Image 
                        src={previewUrl} 
                        alt="Preview" 
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button 
                          type="button" 
                          variant="destructive" 
                          onClick={handleRemoveImage}
                          size="sm"
                          className="gap-2"
                        >
                          <X className="w-4 h-4" /> Remove
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
                        className="border border-dashed border-border/30 hover:border-border/50 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-muted/5"
                      >
                        <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                          <Upload className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium mb-1">
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
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Bottom CTA */}
      {step === 1 ? (
        <div className="sticky bottom-0 z-10 border-t border-border/10 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-4 mt-6">
          <Button 
            type="submit"
            form="step1-form"
            className="w-full h-11" 
            disabled={validatingName}
          >
            {validatingName ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="sticky bottom-0 z-10 border-t border-border/10 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-4 mt-6">
          <Button 
            type="submit"
            form="step2-form"
            className="w-full h-11"
            disabled={!description.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
