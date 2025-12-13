import { useState, useCallback, useEffect } from "react";
import { ArrowRightLeft, Languages, Camera, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TranslatorPanel } from "./TranslatorPanel";
import { ImageScanner } from "./ImageScanner";
import { toast } from "sonner";
import { translateText } from "@/lib/localAiClient";

export function TranslatorApp() {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [direction, setDirection] = useState<"id-to-banjar" | "banjar-to-id">(
    "id-to-banjar"
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeTab, setActiveTab] = useState("text");

  const sourceLanguage = direction === "id-to-banjar" ? "indonesia" : "banjar";
  const targetLanguage = direction === "id-to-banjar" ? "banjar" : "indonesia";
  const sourceLabel =
    direction === "id-to-banjar" ? "Bahasa Indonesia" : "Bahasa Banjar";
  const targetLabel =
    direction === "id-to-banjar" ? "Bahasa Banjar" : "Bahasa Indonesia";

  const swapLanguages = () => {
    setDirection((prev) =>
      prev === "id-to-banjar" ? "banjar-to-id" : "id-to-banjar"
    );
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const translate = useCallback(async () => {
    if (!sourceText.trim()) {
      setTranslatedText("");
      return;
    }

    setIsTranslating(true);

    try {
      const data = await translateText(sourceText, direction);

      setTranslatedText(data.translatedText || "");
    } catch (error: any) {
      console.error("Translation error:", error);
      toast.error(error.message || "Gagal menerjemahkan. Silakan coba lagi.");
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, direction, translate]);

  // Debounce translation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceText.trim()) {
        translate();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [sourceText, direction, translate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="relative overflow-hidden py-12 md:py-20">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-translator-indonesia/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-translator-banjar/10 rounded-full blur-3xl" />
        </div>

        <div className="container relative">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                KELOMPOK 13
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight">
              <span className="gradient-text">Translator</span>
              <br />
              <span className="text-foreground">Indonesia - Banjar</span>
            </h1>

            <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
              Translator Bahasa Indo-Banjar Dengan : *Text, Spech dan Scan Foto
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="grid w-full max-w-md grid-cols-2 h-14 p-1 bg-muted/50 backdrop-blur-sm">
              <TabsTrigger
                value="text"
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg h-12 rounded-lg transition-all"
              >
                <Languages className="h-5 w-5" />
                <span>Teks</span>
              </TabsTrigger>
              <TabsTrigger
                value="image"
                className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg h-12 rounded-lg transition-all"
              >
                <Camera className="h-5 w-5" />
                <span>Scan Foto</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="text" className="mt-0">
            {/* Language Selector */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  sourceLanguage === "indonesia"
                    ? "bg-translator-indonesia/20 text-translator-indonesia border border-translator-indonesia/30"
                    : "bg-translator-banjar/20 text-translator-banjar border border-translator-banjar/30"
                }`}
              >
                {sourceLabel}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={swapLanguages}
                className="h-12 w-12 rounded-full border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 hover:scale-110"
              >
                <ArrowRightLeft className="h-5 w-5" />
              </Button>

              <div
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  targetLanguage === "indonesia"
                    ? "bg-translator-indonesia/20 text-translator-indonesia border border-translator-indonesia/30"
                    : "bg-translator-banjar/20 text-translator-banjar border border-translator-banjar/30"
                }`}
              >
                {targetLabel}
              </div>
            </div>

            {/* Translation Panels */}
            <div className="grid md:grid-cols-2 gap-6">
              <TranslatorPanel
                language={sourceLanguage}
                label={sourceLabel}
                value={sourceText}
                onChange={setSourceText}
                placeholder={
                  direction === "id-to-banjar"
                    ? "Ketik teks dalam Bahasa Indonesia..."
                    : "Ketik teks dalam Bahasa Banjar..."
                }
              />

              <TranslatorPanel
                language={targetLanguage}
                label={targetLabel}
                value={translatedText}
                placeholder="Terjemahan akan muncul di sini..."
                isOutput
                isLoading={isTranslating}
              />
            </div>

            {/* Translate Button (for manual trigger) */}
            <div className="flex justify-center mt-6">
              <Button
                onClick={translate}
                disabled={!sourceText.trim() || isTranslating}
                size="lg"
                className="glow-button bg-primary hover:bg-primary/90 text-primary-foreground px-8"
              >
                {isTranslating ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Menerjemahkan...
                  </>
                ) : (
                  <>
                    <Languages className="h-5 w-5 mr-2" />
                    Terjemahkan
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="image" className="mt-0">
            <ImageScanner />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">
            AI Translator By Team 13
          </p>
        </div>
      </footer>
    </div>
  );
}
