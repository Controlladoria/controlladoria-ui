"use client";

import { useState, useRef } from "react";
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
  status: "pending" | "uploading" | "uploaded" | "upload_failed";
  error?: string;
}

const ALLOWED_EXTENSIONS = [
  ".pdf", ".xlsx", ".xls", ".xml", ".jpg", ".jpeg", ".png", ".webp",
  ".txt", ".doc", ".docx", ".ofc", ".ofx",
];

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg", "image/jpg", "image/png", "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/xml", "text/xml",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/x-ofx", "application/x-ofc",
];

export default function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: UploadedFile[] = Array.from(e.target.files).map(file => ({
        file,
        status: "pending" as const,
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
    if (!droppedFiles || droppedFiles.length === 0) return;

    const validFiles: UploadedFile[] = [];
    const invalidFiles: string[] = [];

    Array.from(droppedFiles).forEach(file => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext)) {
        validFiles.push({ file, status: "pending" });
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (validFiles.length > 0) setFiles(prev => [...prev, ...validFiles]);
    if (invalidFiles.length > 0) toast.error(`Arquivos inválidos: ${invalidFiles.join(", ")}`);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const uploadFile = async (fileIndex: number): Promise<boolean> => {
    const fileItem = files[fileIndex];

    setFiles(prev => prev.map((f, i) =>
      i === fileIndex ? { ...f, status: "uploading" as const } : f
    ));

    try {
      const response = await apiClient.uploadDocument(fileItem.file);

      setFiles(prev => prev.map((f, i) =>
        i === fileIndex ? { ...f, id: response.id, status: "uploaded" as const } : f
      ));
      return true;
    } catch (error: any) {
      // Retry on 429 (rate limit)
      if (error.response?.status === 429) {
        const retryAttempt = (fileItem as any)._retryCount || 0;
        if (retryAttempt < 5) {
          const delay = Math.min(2000 * Math.pow(2, retryAttempt), 30000);
          (fileItem as any)._retryCount = retryAttempt + 1;
          await new Promise(resolve => setTimeout(resolve, delay));
          return uploadFile(fileIndex);
        }
      }

      const errorMsg = error.response?.status === 429
        ? "Limite de envio atingido. Tente novamente em instantes."
        : error.response?.data?.detail || "Erro ao enviar arquivo";

      setFiles(prev => prev.map((f, i) =>
        i === fileIndex ? { ...f, status: "upload_failed" as const, error: errorMsg } : f
      ));
      return false;
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = files
      .map((f, index) => ({ file: f, index }))
      .filter(({ file }) => file.status === "pending");

    if (pendingFiles.length === 0) {
      toast.info("Nenhum arquivo para enviar");
      return;
    }

    setIsUploading(true);

    let successCount = 0;
    let failCount = 0;

    // Upload in batches of 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < pendingFiles.length; i += BATCH_SIZE) {
      const batch = pendingFiles.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(({ index }) => uploadFile(index)));
      successCount += results.filter(Boolean).length;
      failCount += results.filter(r => !r).length;

      if (i + BATCH_SIZE < pendingFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      onUploadSuccess?.();
    }

    // Summary toast
    if (failCount === 0) {
      toast.success(
        <div>
          <p className="font-medium">{successCount} arquivo{successCount !== 1 ? 's' : ''} enviado{successCount !== 1 ? 's' : ''}</p>
          <p className="text-sm text-slate-600">
            Os documentos aparecerão automaticamente em Validação.
          </p>
        </div>,
        { duration: 5000 }
      );
    } else if (successCount === 0) {
      toast.error(`Falha ao enviar todos os ${failCount} arquivos`);
    } else {
      toast.warning(
        `${successCount} enviado${successCount !== 1 ? 's' : ''}, ${failCount} falha${failCount !== 1 ? 's' : ''}. Reenvie os que falharam.`,
        { duration: 5000 }
      );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      case "uploaded":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "upload_failed":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FileUp className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
        return "bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30";
      case "uploaded":
        return "bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-500 border-green-500/30";
      case "upload_failed":
        return "bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-500 border-red-500/30";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  const getStatusText = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
        return "Enviando...";
      case "uploaded":
        return "Enviado — processamento na fila";
      case "upload_failed":
        return "Falha no envio";
      default:
        return "Pronto para enviar";
    }
  };

  const uploadedCount = files.filter(f => f.status === "uploaded").length;
  const failedCount = files.filter(f => f.status === "upload_failed").length;
  const pendingCount = files.filter(f => f.status === "pending").length;
  const allDone = files.length > 0 && pendingCount === 0 && !isUploading;

  return (
    <div className="space-y-4">
      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-3 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-[#0d767b] dark:border-[#f86a15] bg-[#0d767b]/10 dark:bg-[#f86a15]/20"
            : "border-border hover:border-[#0d767b] dark:hover:border-[#f86a15] hover:bg-accent"
        } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
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

      <Input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS.join(",")}
        onChange={handleFileChange}
        disabled={isUploading}
        multiple
        className="hidden"
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          {/* Summary bar when uploads are done */}
          {allDone && uploadedCount > 0 && (
            <div className="bg-green-500/10 dark:bg-green-500/20 border-2 border-green-500/30 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-green-800 dark:text-green-300">
                    {uploadedCount} arquivo{uploadedCount !== 1 ? 's' : ''} enviado{uploadedCount !== 1 ? 's' : ''} com sucesso
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
                    O processamento acontece em segundo plano — você pode fechar esta página.
                    Os documentos aparecerão automaticamente em <strong>Validação</strong> conforme ficarem prontos.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Arquivos ({files.length})
              {isUploading && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — enviando...
                </span>
              )}
            </h3>
            <div className="flex items-center gap-3">
              <Button
                onClick={clearAll}
                variant="outline"
                size="lg"
                disabled={isUploading}
                className="gap-2 text-base px-6 py-6 text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
              >
                <X className="w-5 h-5" />
                Limpar
              </Button>
              {pendingCount > 0 && (
                <Button
                  onClick={handleUploadAll}
                  disabled={isUploading}
                  size="lg"
                  className="gap-2 text-base px-6 py-6 bg-gradient-to-r from-[#0d767b] to-[#f86a15] hover:from-[#f86a15] hover:to-[#0d767b] text-white"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileUp className="w-5 h-5" />
                  )}
                  {isUploading ? "Enviando..." : `Enviar ${pendingCount > 1 ? `Todos (${pendingCount})` : ""}`}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {files.map((fileItem, index) => (
              <div
                key={index}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${getStatusColor(fileItem.status)}`}
              >
                {getStatusIcon(fileItem.status)}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base truncate">{fileItem.file.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <span>{formatFileSize(fileItem.file.size)}</span>
                    <span>·</span>
                    <span>{getStatusText(fileItem.status)}</span>
                  </div>

                  {fileItem.status === "upload_failed" && fileItem.error && (
                    <p className="mt-2 text-sm text-red-700 dark:text-red-500 font-medium">{fileItem.error}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {(fileItem.file.name.split(".").pop() || "?").toUpperCase()}
                  </Badge>

                  {fileItem.status !== "uploading" && (
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                      className="h-10 w-10 p-0 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
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
