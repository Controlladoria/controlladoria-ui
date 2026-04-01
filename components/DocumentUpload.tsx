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

// Serializable version for localStorage persistence
interface StoredUploadFile {
  fileName: string;
  fileSize: number;
  fileType: string;
  id?: number;
  status: UploadedFile["status"];
  progress: number;
  error?: string;
  queueMessage?: string;
  storedAt: number;
}

const STORAGE_KEY = "controlladoria_upload_batch";
const STORAGE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

export default function DocumentUpload({ onUploadSuccess, onProcessingComplete }: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const completedCountRef = useRef(0);
  const failedCountRef = useRef(0);
  const totalFilesRef = useRef(0);
  const notifiedDocumentsRef = useRef<Set<number>>(new Set());
  const restoredRef = useRef(false); // Gate: don't persist until restore is done

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      pollingIntervalsRef.current.forEach(interval => clearInterval(interval));
    };
  }, []);

  // Persist full file list to localStorage on every change
  useEffect(() => {
    if (!restoredRef.current) return; // Don't persist until restore has run
    if (files.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const stored: StoredUploadFile[] = files.map(f => ({
      fileName: f.file.name,
      fileSize: f.file.size,
      fileType: f.file.type || f.file.name.split(".").pop() || "",
      id: f.id,
      status: f.status === "uploading" ? "queued" : f.status, // uploading won't survive refresh
      progress: f.progress,
      error: f.error,
      queueMessage: f.queueMessage,
      storedAt: Date.now(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [files]);

  // Restore full file list from localStorage on mount
  useEffect(() => {
    const restoreBatch = async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          restoredRef.current = true;
          return;
        }

        const stored: StoredUploadFile[] = JSON.parse(raw);
        const cutoff = Date.now() - STORAGE_MAX_AGE_MS;
        const recent = stored.filter(s => s.storedAt > cutoff);

        if (recent.length === 0) {
          localStorage.removeItem(STORAGE_KEY);
          restoredRef.current = true;
          return;
        }

        // Rebuild file list — for completed/failed, restore as-is.
        // For queued/processing, check current server status.
        const restoredFiles: UploadedFile[] = [];
        const toResumePoll: Array<{ docId: number; fileIndex: number }> = [];

        for (const s of recent) {
          const fakeFile = new File([], s.fileName, { type: s.fileType });
          // Patch size for display (File constructor doesn't accept size, so we store it separately)
          Object.defineProperty(fakeFile, "size", { value: s.fileSize, writable: false });

          const restored: UploadedFile = {
            file: fakeFile,
            id: s.id,
            status: s.status,
            progress: s.progress,
            error: s.error,
            queueMessage: s.queueMessage,
          };

          if (s.id && (s.status === "queued" || s.status === "processing")) {
            // Check server for real status
            try {
              const doc = await apiClient.getDocument(s.id);
              if (doc.status === "completed" || doc.status === "pending_validation") {
                restored.status = "completed";
                restored.progress = 100;
                completedCountRef.current += 1;
                onUploadSuccess?.(s.id);
              } else if (doc.status === "failed") {
                restored.status = "failed";
                restored.error = doc.error_message || "Erro no processamento";
              } else {
                // Still active — resume polling
                toResumePoll.push({ docId: s.id, fileIndex: restoredFiles.length });
              }
            } catch {
              // Can't reach server — keep stored status, will re-check on next poll
            }
          }

          // Skip "pending" files that were never uploaded (no id) — they'd need re-selecting
          if (s.status === "pending" && !s.id) continue;

          restoredFiles.push(restored);
        }

        if (restoredFiles.length > 0) {
          totalFilesRef.current = restoredFiles.length;
          setFiles(restoredFiles);

          // Resume polling for active docs after state is set
          setTimeout(() => {
            restoredRef.current = true; // Now allow persistence
            for (const { docId, fileIndex } of toResumePoll) {
              pollDocumentStatus(docId, fileIndex);
            }
          }, 100);
        } else {
          localStorage.removeItem(STORAGE_KEY);
          restoredRef.current = true;
        }
      } catch (error) {
        console.error("Error restoring upload batch:", error);
        localStorage.removeItem(STORAGE_KEY);
        restoredRef.current = true;
      }
    };

    restoreBatch();
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
    const maxPolls = 120; // 6 minutes max (120 * 3 seconds) — Lambda can take up to 10min for large files

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
          // In SQS queue waiting for Lambda to pick it up
          // Gently pulse progress between 5-15% to show it's alive
          const queueProgress = 5 + (pollCount % 4) * 3;
          setFiles(prev => prev.map((f, i) =>
            i === fileIndex
              ? { ...f, status: "queued", progress: queueProgress, queueMessage: "Na fila — aguardando processamento..." }
              : f
          ));
        } else if (doc.status === "processing") {
          // Lambda picked it up — progress from 20% to 90%
          const progress = 20 + Math.min(70, pollCount * 2);
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
        return "Enviando ao servidor...";
      case "queued":
        return queueMessage || "Na fila — aguardando processamento...";
      case "processing":
        return "Extraindo dados com IA...";
      case "completed":
        return "Pronto para validação";
      case "failed":
        return "Falha no processamento";
      default:
        return "Pronto para enviar";
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
