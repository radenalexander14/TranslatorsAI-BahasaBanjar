import { useState, useRef, useCallback } from "react";
import { Upload, Camera, X, Loader2, ImageIcon, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { analyzeImage } from "@/lib/localAiClient";

interface ScanResult {
  success: boolean;
  extractedText?: string;
  detectedLanguage?: "indonesian" | "banjar";
  translatedText?: string;
  direction?: string;
  error?: string;
}

export function ImageScanner() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    setIsProcessing(true);
    setResult(null);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File harus berupa gambar');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Ukuran gambar maksimal 10MB');
      }

      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const imageBase64 = await base64Promise;

      // Set preview
      setPreviewUrl(imageBase64);

      // Call edge function
      const data = await analyzeImage(imageBase64);

      setResult(data as any);

      if (data.success) {
        toast.success('Gambar berhasil dianalisis dan diterjemahkan!');
      } else {
        toast.error(data.error || 'Gagal menganalisis gambar');
      }

    } catch (error: any) {
      console.error('Image processing error:', error);
      setResult({
        success: false,
        error: error.message || 'Gagal memproses gambar'
      });
      toast.error(error.message || 'Gagal memproses gambar');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processImage(file);
    }
  }, [processImage]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const clearImage = () => {
    setPreviewUrl(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`scan-zone cursor-pointer ${isDragging ? 'active' : ''} ${previewUrl ? 'border-solid' : ''}`}
        onClick={() => !previewUrl && fileInputRef.current?.click()}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
              <Camera className="absolute inset-0 m-auto h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">Menganalisis gambar...</p>
              <p className="text-sm text-muted-foreground">AI sedang mendeteksi dan menerjemahkan teks</p>
            </div>
          </div>
        ) : previewUrl ? (
          <div className="relative w-full p-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                clearImage();
              }}
              className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-background/80 hover:bg-background"
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-[250px] mx-auto rounded-lg object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              {isDragging && (
                <div className="pulse-ring w-20 h-20 border-2 border-primary" />
              )}
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">
                {isDragging ? 'Lepaskan gambar di sini' : 'Unggah atau seret gambar'}
              </p>
              <p className="text-sm text-muted-foreground">
                Gambar akan dianalisis untuk mendeteksi teks Indonesia atau Banjar
              </p>
            </div>
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-2"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Pilih Gambar
            </Button>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className={`translator-card p-6 ${result.success ? '' : 'border-destructive/50'}`}>
          <div className="flex items-start gap-4">
            {result.success ? (
              <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
            )}
            
            <div className="flex-1 space-y-4">
              {result.success ? (
                <>
                  {/* Detected Text */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`language-badge ${
                        result.detectedLanguage === 'indonesian' 
                          ? 'language-badge-indonesia' 
                          : 'language-badge-banjar'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-current" />
                        {result.detectedLanguage === 'indonesian' ? 'Bahasa Indonesia' : 'Bahasa Banjar'}
                      </span>
                      <span className="text-xs text-muted-foreground">(Terdeteksi)</span>
                    </div>
                    <p className="text-foreground bg-muted/50 rounded-lg p-4">
                      {result.extractedText}
                    </p>
                  </div>

                  {/* Translation */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`language-badge ${
                        result.detectedLanguage === 'indonesian' 
                          ? 'language-badge-banjar' 
                          : 'language-badge-indonesia'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-current" />
                        {result.detectedLanguage === 'indonesian' ? 'Bahasa Banjar' : 'Bahasa Indonesia'}
                      </span>
                      <span className="text-xs text-muted-foreground">(Terjemahan)</span>
                    </div>
                    <p className="text-foreground bg-primary/10 rounded-lg p-4 border border-primary/20">
                      {result.translatedText}
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <p className="font-medium text-destructive">Tidak dapat memproses gambar</p>
                  <p className="text-sm text-muted-foreground mt-1">{result.error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
