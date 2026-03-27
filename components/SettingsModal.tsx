"use client"

import { useCallback, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Clock,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  Settings,
  Sparkles,
  Upload,
  X,
} from "lucide-react"
import { useDropzone } from "react-dropzone"

import Image from "next/image"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  slideImage: string | null
  setSlideImage: (img: string | null) => void
  extractedStyle: string
  setExtractedStyle: (style: string) => void
  lectureDuration: number
  setLectureDuration: (duration: number) => void
}

export default function SettingsModal({
  isOpen,
  onClose,
  slideImage,
  setSlideImage,
  extractedStyle,
  setExtractedStyle,
  lectureDuration,
  setLectureDuration,
}: SettingsModalProps) {
  const [isExtracting, setIsExtracting] = useState(false)

  const handleExtractStyle = useCallback(async (imageData: string) => {
    setIsExtracting(true)

    try {
      const response = await fetch("/api/slides/style", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageDataUrl: imageData }),
      })

      const data = (await response.json()) as { style?: unknown; error?: unknown }

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to extract visual style",
        )
      }

      const styleText = typeof data.style === "string" ? data.style : "Could not extract style."
      setExtractedStyle(styleText)
    } catch (error) {
      console.error("Style extraction error:", error)
      setExtractedStyle("Error extracting style from image.")
    } finally {
      setIsExtracting(false)
    }
  }, [setExtractedStyle])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]

    if (file) {
      const reader = new FileReader()

      reader.onload = (event) => {
        const result = event.target?.result as string
        setSlideImage(result)
        handleExtractStyle(result)
      }

      reader.readAsDataURL(file)
    }
  }, [handleExtractStyle, setSlideImage])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  })

  const clearCache = () => {
    setSlideImage(null)
    setExtractedStyle("")
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-zinc-900">Visual Settings</h2>
                  <p className="text-xs text-zinc-500">Configure slide themes & styles</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-zinc-200 flex items-center justify-center text-zinc-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 hide-scrollbar">
              <section>
                <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Lecture Duration
                </h3>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={lectureDuration}
                      onChange={(e) => setLectureDuration(Number(e.target.value))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-3 outline-none focus:border-zinc-400 focus:bg-white transition-colors text-lg font-medium"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-medium">minutes</span>
                  </div>
                  <div className="flex-1 text-xs text-zinc-500 leading-relaxed">
                    Set the target duration for your lecture. We&apos;ll use this to estimate if you have enough content.
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Reference Slide
                </h3>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  {slideImage ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl shadow-md group">
                      <Image
                        src={slideImage}
                        alt="Sample slide"
                        fill
                        className="object-cover w-full h-full"
                        unoptimized
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-zinc-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-sm font-medium">Click to replace</p>
                      </div>
                      {isExtracting && (
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                          <Loader2 className="w-8 h-8 text-zinc-900 animate-spin" />
                          <p className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Analyzing Style...</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10">
                      <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                        <Upload className="w-6 h-6 text-zinc-400" />
                      </div>
                      <p className="text-sm font-medium text-zinc-900">Upload a slide for style extraction</p>
                      <p className="text-xs text-zinc-500 mt-1">Drag and drop or click to browse</p>
                    </div>
                  )}
                </div>
                
                {slideImage && !isExtracting && (
                  <button
                    onClick={() => handleExtractStyle(slideImage)}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-zinc-50 border border-zinc-200 text-zinc-600 px-6 py-2 rounded-xl text-sm font-medium hover:bg-zinc-100 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Re-analyze Visual Theme
                  </button>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold text-zinc-900 mb-2 flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4" /> Style Prompt
                </h3>
                <p className="text-xs text-zinc-500 mb-4">This prompt will guide the slide generation engine.</p>
                <div className="relative">
                  <textarea
                    className="w-full h-40 bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-sm text-zinc-700 outline-none focus:border-zinc-400 focus:bg-white transition-all resize-none shadow-inner"
                    placeholder="Describe the visual style manually or extract it from an image above..."
                    value={extractedStyle}
                    onChange={(e) => setExtractedStyle(e.target.value)}
                  />
                  {isExtracting && (
                    <div className="absolute inset-0 bg-zinc-50/50 flex items-center justify-center">
                      <div className="flex gap-1">
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-zinc-300 rounded-full" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-zinc-300 rounded-full" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-zinc-300 rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
              <button
                onClick={clearCache}
                className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
              >
                Clear Visual Cache
              </button>
              <button
                onClick={onClose}
                className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-zinc-800 transition-all shadow-md"
              >
                Save & Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
