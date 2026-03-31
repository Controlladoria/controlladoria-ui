"use client"

import * as React from "react"
import { HelpCircle } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface InfoModalProps {
  title: string
  children: React.ReactNode
  iconSize?: string
}

export function InfoModal({ title, children, iconSize = "w-4 h-4" }: InfoModalProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setOpen(true)
        }}
        className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full p-0.5"
        aria-label={`Informações sobre ${title}`}
      >
        <HelpCircle className={iconSize} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground space-y-3">
              {children}
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  )
}
