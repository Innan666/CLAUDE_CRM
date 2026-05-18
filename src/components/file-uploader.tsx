"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X, FileText, Download } from "lucide-react"

interface Attachment {
  id: string
  name: string
  filename: string
  path: string
  size: number
  mimeType: string
  createdAt: string
}

interface FileUploaderProps {
  contractId?: string
  invoiceId?: string
  attachments: Attachment[]
  onUpload: () => void
  onDelete: (id: string) => void
}

export function FileUploader({ contractId, invoiceId, attachments, onUpload, onDelete }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      if (contractId) formData.append("contractId", contractId)
      if (invoiceId) formData.append("invoiceId", invoiceId)

      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData
      })

      if (res.ok) {
        onUpload()
      } else {
        const data = await res.json()
        alert(data.error || "上传失败")
      }
    } catch (error) {
      console.error("Upload error:", error)
      alert("上传失败")
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个文件吗？")) return

    try {
      const res = await fetch(`/api/attachments/${id}`, {
        method: "DELETE"
      })

      if (res.ok) {
        onDelete(id)
      } else {
        alert("删除失败")
      }
    } catch (error) {
      console.error("Delete error:", error)
      alert("删除失败")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="w-4 h-4 mr-1" />
          {uploading ? "上传中..." : "上传文件"}
        </Button>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-2 border rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{attachment.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.size)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  asChild
                >
                  <a href={`/api/uploads/${attachment.filename}`} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 text-red-500 hover:text-red-600"
                  onClick={() => handleDelete(attachment.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && (
        <p className="text-sm text-muted-foreground">暂无附件</p>
      )}
    </div>
  )
}
