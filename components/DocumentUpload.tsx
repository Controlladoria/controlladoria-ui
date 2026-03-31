"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, FileUp, X } from "lucide-react";

interface DocumentUploadProps {
  onUploadSuccess?: (documentId?: number) => void;
  onProcessingComplete?: (documentId: number) => void;
}

interface UploadedFile {
  file: File;
  id?: number;
  status: "pending" | "uploading" | "queued" | "processing" | "completed" | "failed";
  progress: number;
  error?: string;
  queuePosition?: number;
  queueMessage?: string;
}

export default function DocumentUpload({ onUploadSuccess, onProcessingComplete }: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const completedCountRef = useRef(0);
  const failedCountRef = useRef(0);
  const totalFilesRef = useRef(0);
  const notifiedDocumentsRef = useRef<Set<number>>(new Set()); // Track which docs already showed notifications

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      pollingIntervalsRef.current.forEach(interval => clearInterval(interval));
    };
  }, []);

  // Persist active uploads to localStorage
  useEffect(() => {
    const activeUploads = files
      .filter(f => (f.status === "processing" || f.status === "queued") && f.id)
      .map(f => ({ id: f.id!, fileName: f.file.name, startedAt: Date.now() }));

    if (activeUploads.length > 0) {
      localStorage.setItem('activeUploads', JSON.stringify(activeUploads));
    } else {
      localStorage.removeItem('activeUploads');
    }
  }, [files]);

  // Resume polling for active uploads on mount
  useEffect(() => {
    const resumeActiveUploads = async () => {
      try {
        const stored = localStorage.getItem('activeUploads');
        if (!stored) return;

        const activeUploads: Array<{ id: number; fileName: string; startedAt: number }> = JSON.parse(stored);

        // Filter out stale uploads (older than 10 minutes)
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        const recentUploads = activeUploads.filter(u => u.startedAt > tenMinutesAgo);

        if (recentUploads.length === 0) {
          localStorage.removeItem('activeUploads');
          return;
        }

        // Query server for current status of these documents
        const apiClient = (await import('@/lib/api')).apiClient;

        for (const upload of recentUploads) {
          try {
            const doc = await apiClient.getDocument(upload.id);

            if (doc.status === "processing") {
              // Add to files list and resume polling
              const fileObj = new File([], upload.fileName);
              const uploadedFile: UploadedFile = {
                file: fileObj,
                id: upload.id,
                status: "processing",
                progress: 50,
              };

              setFiles(prev => [...prev, uploadedFile]);

              // Resume polling
              const fileIndex = files.length;
              pollDocumentStatus(upload.id, fileIndex);
            } else {
              // Already completed or failed, remove from localStorage
              const remaining = recentUploads.filter(u => u.id !== upload.id);
              if (remaining.length > 0) {
                localStorage.setItem('activeUploads', JSON.stringify(remaining));
              } else {
                localStorage.removeItem('activeUploads');
              }
            }
          } catch (error) {
            console.error(`Error checking status of document ${upload.id}:`, error);
          }
        }
      } catch (error) {
        console.error('Error resuming active uploads:', error);
        localStorage.removeItem('activeUploads');
      }
    };

    resumeActiveUploads();
  }, []); // Run once on mount

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        status: "pending" as const,
        progress: 0
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/xml",
        "text/xml",
        // V2 additions (Item 2)
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/x-ofx",
        "application/x-ofc",
      ];

      // Also allow by extension for formats browsers may not recognize MIME types for
      const allowedExtensions = [
        ".pdf", ".xlsx", ".xls", ".xml", ".jpg", ".jpeg", ".png", ".webp",
        ".txt", ".doc", ".docx", ".ofc", ".ofx",
      ];

      const validFiles: UploadedFile[] = [];
      const invalidFiles: string[] = [];

      Array.from(droppedFiles).forEach(file => {
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (allowedTypes.includes(file.type) || allowedExtensions.includes(ext)) {
          validFiles.push({
            file,
            status: "pending",
            progress: 0
          });
        } else {
          invalidFiles.push(file.name);
        }
      });

      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles]);
      }

      if (invalidFiles.length > 0) {
        toast.error(`Arquivos inválidos: ${invalidFiles.join(", ")}`);
      }
    }
  };

  const handleClickUploadArea = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const pollDocumentStatus = async (documentId: number, fileIndex: number) => {
    let pollCount = 0;
    const maxPolls = 60; // 3 minutes max (60 * 3 seconds)

    const interval = setInterval(async () => {
      pollCount++;

      // Get current file state
      const currentFile = files[fileIndex];
      if (!currentFile) return;

      try {
        const doc = await apiClient.getDocument(documentId);

        if (doc.status === "completed" || doc.status === "pending_validation") {
          clearInterval(interval);
          pollingIntervalsRef.current.delete(documentId);

          // Show progress at 100% briefly before marking as completed
          setFiles(prev => prev.map((f, i) =>
            i === fileIndex
              ? { ...f, status: "processing", progress: 100 }
              : f
          ));

          // After a brief delay, transition to completed so user sees the full bar
          await new Promise(resolve => setTimeout(resolve, 800));

          setFiles(prev => prev.map((f, i) =>
            i === fileIndex
              ? { ...f, status: "completed", progress: 100 }
              : f
          ));

          // Prevent duplicate notifications for same document
          if (notifiedDocumentsRef.current.has(documentId)) {
            return; // Already notified for this document
          }
          notifiedDocumentsRef.current.add(documentId);

          // Track completion
          completedCountRef.current += 1;

          // Only show individual toast for first few files, then batch notification
          if (completedCountRef.current <= 3 || totalFilesRef.current <= 5) {
            const isPendingValidation = doc.status === "pending_validation";
            toast.success(
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium">{currentFile.file.name}</p>
                  <p className="text-sm text-slate-600">
                    {isPendingValidation
                      ? "Processado! Aguardando validação."
                      : "Processado com sucesso!"}
                  </p>
                </div>
              </div>,
              { duration: 2000 }
            );
          } else if (completedCountRef.current === totalFilesRef.current) {
            // Show batch summary when all complete
            toast.success(
              `${completedCountRef.current} arquivos processados! Verifique a aba de validação.`,
              { duration: 4000 }
            );
          }

          onProcessingComplete?.(documentId);
          onUploadSuccess?.(documentId);
        } else if (doc.status === "failed") {
          clearInterval(interval);
          pollingIntervalsRef.current.delete(documentId);

          const errorMsg = doc.error_message || "Erro desconhecido";

          setFiles(prev => prev.map((f, i) =>
            i === fileIndex
              ? { ...f, status: "failed", error: errorMsg }
              : f
          ));

          // Prevent duplicate notifications for same document
          if (notifiedDocumentsRef.current.has(documentId)) {
            return; // Already notified for this document
          }
          notifiedDocumentsRef.current.add(documentId);

          // Track failures
          failedCountRef.current += 1;

          // Only show individual error for first few failures
          if (failedCountRef.current <= 2) {
            toast.error(
              <div>
                <p className="font-medium">Erro ao processar {currentFile.file.name}</p>
                <p className="text-sm text-slate-600">{errorMsg}</p>
              </div>,
              { duration: 5000 }
            );
          } else if (completedCountRef.current + failedCountRef.current === totalFilesRef.current) {
            // Show batch error summary at the end
            toast.error(
              `❌ ${failedCountRef.current} arquivos falharam no processamento. Verifique os detalhes acima.`,
              { duration: 6000 }
            );
          }
        } else if (doc.status === "pending") {
          // Still in queue - update queue display
          setFiles(prev => prev.map((f, i) =>
            i === fileIndex
              ? { ...f, status: "queued", progress: 10 }
              : f
          ));
        } else if (doc.status === "processing") {
          // Update progress indicator (may have just transitioned from queued)
          const progress = 30 + (pollCount * 0.5); // Simulated progress
          setFiles(prev => prev.map((f, i) =>
            i === fileIndex
              ? { ...f, status: "processing", progress: Math.min(90, progress), queueMessage: undefined }
              : f
          ));
        }

        if (pollCount >= maxPolls) {
          clearInterval(interval);
          pollingIntervalsRef.current.delete(documentId);
          toast.warning(`Processamento de ${currentFile.file.name} ainda em andamento. Verifique a aba de documentos.`);
        }
      } catch (error) {
        console.error(`Erro ao verificar status do documento ${documentId}:`, error);

        if (pollCount >= maxPolls) {
          clearInterval(interval);
          pollingIntervalsRef.current.delete(documentId);
        }
      }
    }, 3000); // Poll every 3 seconds (reduced from 1s to prevent overwhelming browser)

    pollingIntervalsRef.current.set(documentId, interval);
  };

  const uploadFile = async (fileIndex: number) => {
    const fileItem = files[fileIndex];

    setFiles(prev => prev.map((f, i) =>
      i === fileIndex
        ? { ...f, status: "uploading", progress: 10 }
        : f
    ));

    try {
      const response = await apiClient.uploadDocument(fileItem.file);

      if (response.id) {
        // Check if document was queued or processing immediately
        const isQueued = response.status === "pending";

        if (isQueued) {
          // Document is queued - waiting for a processing slot
          setFiles(prev => prev.map((f, i) =>
            i === fileIndex
              ? {
                  ...f,
                  id: response.id,
                  status: "queued",
                  progress: 10,
                  queueMessage: response.message,
                }
              : f
          ));

          // Show queue notification for first few files
          if (totalFilesRef.current <= 3 || files.filter(f => f.status === "queued").length <= 1) {
            toast.info(
              <div className="flex items-center gap-2">
                <span className="text-xl">☕</span>
                <div>
                  <p className="font-medium">{fileItem.file.name}</p>
                  <p className="text-sm text-slate-600">{response.message}</p>
                </div>
              </div>,
              { duration: 4000 }
            );
          }
        } else {
          // Processing immediately
          setFiles(prev => prev.map((f, i) =>
            i === fileIndex
              ? { ...f, id: response.id, status: "processing", progress: 30 }
              : f
          ));

          // Only show individual "Processing" toast for first 3 files or if total is small
          if (totalFilesRef.current <= 3 || files.filter(f => f.status === "processing").length <= 3) {
            toast.info(
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <div>
                  <p className="font-medium">{fileItem.file.name}</p>
                  <p className="text-sm text-slate-600">Processando com IA...</p>
                </div>
              </div>,
              { duration: 2000 }
            );
          }
        }

        // Start polling for status (works for both queued and processing)
        pollDocumentStatus(response.id, fileIndex);
      }
    } catch (error: any) {
      console.error("Erro no upload:", error);

      // Retry on 429 (rate limit) with exponential backoff
      if (error.response?.status === 429) {
        const retryAttempt = (fileItem as any)._retryCount || 0;
        if (retryAttempt < 5) {
          const delay = Math.min(2000 * Math.pow(2, retryAttempt), 30000); // 2s, 4s, 8s, 16s, 30s
          setFiles(prev => prev.map((f, i) =>
            i === fileIndex
              ? { ...f, status: "pending" as const, _retryCount: retryAttempt + 1 } as any
              : f
          ));
          await new Promise(resolve => setTimeout(resolve, delay));
          return uploadFile(fileIndex);
        }
      }

      const errorMsg = error.response?.status === 429
        ? "Muitos arquivos enviados de uma vez. Tente novamente em alguns instantes."
        : error.response?.data?.detail || "Erro ao fazer upload do documento";

      setFiles(prev => prev.map((f, i) =>
        i === fileIndex
          ? { ...f, status: "failed", error: errorMsg }
          : f
      ));

      toast.error(
        <div>
          <p className="font-medium">Erro ao enviar {fileItem.file.name}</p>
          <p className="text-sm text-slate-600">{errorMsg}</p>
        </div>,
        { duration: 5000 }
      );
    }
  };

  const handleUploadAll = async () => {
    if (files.length === 0) {
      toast.error("Por favor, selecione ao menos um arquivo");
      return;
    }

    // Upload all pending files
    const pendingFiles = files
      .map((f, index) => ({ file: f, index }))
      .filter(({ file }) => file.status === "pending");

    if (pendingFiles.length === 0) {
      toast.info("Todos os arquivos já foram enviados");
      return;
    }

    // Reset counters for new batch
    completedCountRef.current = 0;
    failedCountRef.current = 0;
    totalFilesRef.current = pendingFiles.length;
    notifiedDocumentsRef.current.clear(); // Reset notification tracking

    // Show single batch start notification
    if (pendingFiles.length > 3) {
      toast.info(`📤 Enviando ${pendingFiles.length} arquivos...`, { duration: 2000 });
    }

    // Upload in batches of 3 to balance speed vs server load
    const BATCH_SIZE = 3;
    for (let i = 0; i < pendingFiles.length; i += BATCH_SIZE) {
      const batch = pendingFiles.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(({ index }) => uploadFile(index)));
      // Small delay between batches
      if (i + BATCH_SIZE < pendingFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
      case "processing":
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      case "queued":
        return <span className="text-lg">☕</span>;
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FileUp className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
      case "processing":
        return "bg-[#0d767b]/10 dark:bg-[#0d767b]/20 text-[#0d767b] dark:text-[#1E40AF] border-[#0d767b]/30 dark:border-[#1E40AF]";
      case "queued":
        return "bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30";
      case "completed":
        return "bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-500 border-green-500/30";
      case "failed":
        return "bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-500 border-red-500/30";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const getStatusText = (status: UploadedFile["status"], queueMessage?: string) => {
    switch (status) {
      case "uploading":
        return "Enviando...";
      case "queued":
        return queueMessage || "Na fila de processamento...";
      case "processing":
        return "Processando com IA...";
      case "completed":
        return "✓ Enviado - Aguardando validação";
      case "failed":
        return "Falha";
      default:
        return "Pronto";
    }
  };

  const hasActiveUploads = files.some(f => f.status === "uploading" || f.status === "processing" || f.status === "queued");

  return (
    <div className="space-y-4">
      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClickUploadArea}
        className={`border-3 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-[#0d767b] dark:border-[#f86a15] bg-[#0d767b]/10 dark:bg-[#f86a15]/20"
            : "border-border hover:border-[#0d767b] dark:hover:border-[#f86a15] hover:bg-accent"
        } ${hasActiveUploads ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div className="space-y-4">
          <div className="text-7xl">📄</div>
          <p className="text-2xl font-semibold text-foreground">
            {isDragging
              ? "Solte os arquivos aqui"
              : "Arraste e solte arquivos ou clique para selecionar"}
          </p>
          <p className="text-lg text-muted-foreground">
            Formatos aceitos: PDF, Excel, XML, Word, TXT, OFX, OFC, JPG, PNG (máx. 30MB)
          </p>
          <p className="text-base text-muted-foreground">
            Você pode enviar múltiplos arquivos de uma vez
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.xlsx,.xls,.xml,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx,.ofc,.ofx"
        onChange={handleFileChange}
        disabled={hasActiveUploads}
        multiple
        className="hidden"
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Arquivos ({files.length})
            </h3>
            <Button
              onClick={handleUploadAll}
              disabled={hasActiveUploads || files.every(f => f.status !== "pending")}
              size="lg"
              className="gap-2 text-base px-6 py-6 bg-gradient-to-r from-[#0d767b] to-[#f86a15] hover:from-[#f86a15] hover:to-[#0d767b] text-white"
            >
              <FileUp className="w-5 h-5" />
              Enviar Todos
            </Button>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {files.map((fileItem, index) => (
              <div
                key={index}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${getStatusColor(
                  fileItem.status
                )}`}
              >
                {getStatusIcon(fileItem.status)}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base truncate">{fileItem.file.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>{formatFileSize(fileItem.file.size)}</span>
                    <span>•</span>
                    <span>{getStatusText(fileItem.status, fileItem.queueMessage)}</span>
                  </div>

                  {/* Progress bar */}
                  {(fileItem.status === "uploading" || fileItem.status === "processing" || fileItem.status === "queued") && (
                    <div className="mt-3 w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          fileItem.status === "queued"
                            ? "bg-amber-500 dark:bg-amber-400"
                            : "bg-[#0d767b] dark:bg-[#0d767b]"
                        }`}
                        style={{ width: `${fileItem.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Error message */}
                  {fileItem.status === "failed" && fileItem.error && (
                    <p className="mt-2 text-sm text-red-700 dark:text-red-500 font-medium">{fileItem.error}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {fileItem.file.type.split("/")[1]?.toUpperCase()}
                  </Badge>

                  {fileItem.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="h-10 w-10 p-0"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
