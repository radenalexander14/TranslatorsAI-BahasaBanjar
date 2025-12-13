import { useState, useRef } from "react";
import { Volume2, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TranslatorPanelProps {
  language: "indonesia" | "banjar";
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder: string;
  isOutput?: boolean;
  isLoading?: boolean;
}

export function TranslatorPanel({
  language,
  label,
  value,
  onChange,
  placeholder,
  isOutput = false,
  isLoading = false,
}: TranslatorPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = async () => {
    if (!value) return;
    
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Teks berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin teks");
    }
  };

  const handleSpeak = () => {
    if (!value || isSpeaking) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(value);
    
    // Set language - Indonesian for both as Banjar doesn't have specific voice
    utterance.lang = "id-ID";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast.error("Gagal memutar audio");
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const badgeClass = language === "indonesia" 
    ? "language-badge-indonesia" 
    : "language-badge-banjar";

  return (
    <div className="translator-card flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <span className={badgeClass}>
          <span className="w-2 h-2 rounded-full bg-current" />
          {label}
        </span>
        
        <div className="flex items-center gap-2">
          {value && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={isSpeaking ? stopSpeaking : handleSpeak}
                className="h-8 w-8 rounded-lg hover:bg-muted"
                title={isSpeaking ? "Berhenti" : "Dengarkan"}
              >
                <Volume2 className={`h-4 w-4 ${isSpeaking ? "text-primary animate-pulse" : ""}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-8 w-8 rounded-lg hover:bg-muted"
                title="Salin"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Menerjemahkan...</span>
            </div>
          </div>
        )}
        
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          readOnly={isOutput}
          className={`translator-input placeholder:text-muted-foreground/50 ${
            isOutput ? "cursor-default" : ""
          }`}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          {value.length} karakter
        </span>
      </div>
    </div>
  );
}
