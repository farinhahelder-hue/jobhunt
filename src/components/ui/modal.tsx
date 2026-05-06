'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function Modal({ open, onOpenChange, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="modal fixed inset-0 z-50 mx-auto w-full max-w-2xl rounded-lg border bg-background p-0 shadow-lg backdrop:bg-black/50"
      onClose={() => onOpenChange(false)}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onOpenChange(false)
        }
      }}
    >
      {children}
    </dialog>
  )
}

export function ModalHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between border-b p-4 ${className}`}>
      {children}
    </div>
  )
}

export function ModalTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>
}

export function ModalClose({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  )
}

export function ModalContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

export function ModalFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-end gap-2 border-t p-4 ${className}`}>
      {children}
    </div>
  )
}