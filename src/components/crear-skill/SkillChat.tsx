import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Loader2, Paperclip, Link2, X, FileText, Image, Film, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { streamChat, type Msg } from "@/lib/streaming";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Attachment {
  id: string;
  type: "file" | "url";
  name: string;
  file?: File;
  url?: string;
  extractedText?: string;
  processing?: boolean;
}

interface SkillChatProps {
  messages: Msg[];
  setMessages: (msgs: Msg[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  userId?: string;
}

export default function SkillChat({ messages, setMessages, onGenerate, isGenerating, userId }: SkillChatProps) {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Start conversation on mount
  useEffect(() => {
    if (messages.length === 0) {
      startConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }, [input]);

  const startConversation = async () => {
    setStreaming(true);
    let assistantText = "";
    const updateAssistant = (chunk: string) => {
      assistantText += chunk;
      setMessages([{ role: "assistant", content: assistantText }]);
    };

    await streamChat({
      messages: [],
      onDelta: updateAssistant,
      onDone: () => setStreaming(false),
      onError: () => setStreaming(false),
    });
  };

  const processAttachment = useCallback(async (attachment: Attachment): Promise<string> => {
    try {
      if (attachment.type === "url") {
        const { data, error } = await supabase.functions.invoke("process-attachment", {
          body: { type: "url", url: attachment.url },
        });
        if (error) throw error;
        return data.extracted_text || "";
      } else if (attachment.file && userId) {
        const storagePath = `${userId}/${Date.now()}-${attachment.name}`;
        const { error: uploadError } = await supabase.storage
          .from("skill-uploads")
          .upload(storagePath, attachment.file);
        if (uploadError) throw uploadError;

        const { data, error } = await supabase.functions.invoke("process-attachment", {
          body: { type: "file", file_path: storagePath, user_id: userId },
        });
        if (error) throw error;
        return data.extracted_text || "";
      }
      return "";
    } catch (e) {
      console.error("Error processing attachment:", e);
      toast.error(`Error procesando ${attachment.name}`);
      return `[Error procesando: ${attachment.name}]`;
    }
  }, [userId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      type: "file" as const,
      name: file.name,
      file,
      processing: false,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    const attachment: Attachment = {
      id: crypto.randomUUID(),
      type: "url",
      name: url.length > 40 ? url.slice(0, 40) + "..." : url,
      url,
      processing: false,
    };
    setAttachments((prev) => [...prev, attachment]);
    setUrlInput("");
    setShowUrlInput(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const [processingAttachments, setProcessingAttachments] = useState(false);

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || streaming || processingAttachments) return;

    const currentAttachments = [...attachments];
    const displayContent = text + (currentAttachments.length > 0 ? `\n\n📎 ${currentAttachments.map((a) => a.name).join(", ")}` : "");

    // Show user message immediately with attachments
    const displayMsg: Msg = { role: "user", content: displayContent };
    const displayMessages = [...messages, displayMsg];
    setMessages(displayMessages);
    setInput("");
    setAttachments([]);

    // Process attachments in background
    let contextParts: string[] = [];
    if (currentAttachments.length > 0) {
      setProcessingAttachments(true);
      try {
        const results = await Promise.all(
          currentAttachments.map((att) => processAttachment(att))
        );
        contextParts = results.filter(Boolean);
      } catch (e) {
        console.error("Error processing attachments:", e);
        toast.error("Error al procesar algunos archivos");
      } finally {
        setProcessingAttachments(false);
      }
    }

    let fullMessage = text;
    if (contextParts.length > 0) {
      const context = contextParts.join("\n\n---\n\n");
      fullMessage = text
        ? `${text}\n\n[Contexto extraído de archivos adjuntos]:\n${context}`
        : context;
    }

    const userMsg: Msg = { role: "user", content: fullMessage };
    const newMessages = [...messages, userMsg];
    setStreaming(true);

    let assistantText = "";
    const updateAssistant = (chunk: string) => {
      assistantText += chunk;
      setMessages([...displayMessages, { role: "assistant", content: assistantText }]);
    };

    await streamChat({
      messages: newMessages,
      onDelta: updateAssistant,
      onDone: () => setStreaming(false),
      onError: () => setStreaming(false),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getAttachmentIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return <Image className="w-3 h-3" />;
    if (["mp4", "mov", "avi", "webm"].includes(ext)) return <Film className="w-3 h-3" />;
    if (name.startsWith("http")) return <Link2 className="w-3 h-3" />;
    return <FileText className="w-3 h-3" />;
  };

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const canGenerate = userMessageCount >= 5 && !streaming;
  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.avi,.webm"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Messages area — takes all available space */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-4">
          {/* Empty state: vertically centered hero */}
          {isEmpty && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-secondary mb-4">
                  <Sparkles className="w-6 h-6 text-muted-foreground" />
                </div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">Crear Skill</h1>
                <p className="text-muted-foreground text-sm md:text-base max-w-md">
                  Contanos sobre tu expertise — podés escribir, adjuntar archivos o pegar links
                </p>
              </motion.div>
            </div>
          )}

          {/* Messages */}
          {!isEmpty && (
            <div className="py-8 space-y-5">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed ${
                        msg.role === "user"
                          ? "bg-foreground text-background rounded-br-lg"
                          : "bg-secondary text-foreground rounded-bl-lg"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-3 [&>p:last-child]:mb-0 [&>ul]:mb-3 [&>ol]:mb-3">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {(streaming || processingAttachments) && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl rounded-bl-lg px-5 py-3.5 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    {processingAttachments && (
                      <span className="text-xs text-muted-foreground">Procesando archivos...</span>
                    )}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar — pinned to bottom */}
      <div className="shrink-0 border-t border-border bg-background">
        <div className="max-w-2xl mx-auto w-full px-4">
          {/* Generate CTA */}
          {canGenerate && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-3"
            >
              <Button
                onClick={onGenerate}
                disabled={isGenerating}
                className="w-full rounded-full gap-2 h-12 text-sm font-medium"
                size="lg"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isGenerating ? "Generando skill..." : "Generar mi Skill"}
              </Button>
            </motion.div>
          )}

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="pt-3 flex flex-wrap gap-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5 text-xs"
                >
                  {getAttachmentIcon(att.name)}
                  <span className="max-w-[120px] truncate">{att.name}</span>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* URL input */}
          {showUrlInput && (
            <div className="pt-3">
              <div className="flex gap-2 items-center bg-secondary rounded-xl p-2.5">
                <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addUrl()}
                  placeholder="https://..."
                  className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={addUrl} className="h-7 px-2 text-xs">
                  Agregar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowUrlInput(false)}
                  className="h-7 px-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="flex gap-2 items-end py-3">
            <div className="flex gap-0.5 shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={streaming || isGenerating}
                className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
                title="Adjuntar archivo"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowUrlInput(!showUrlInput)}
                disabled={streaming || isGenerating}
                className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
                title="Agregar link"
              >
                <Link2 className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribí tu respuesta..."
                disabled={streaming || isGenerating}
                className="w-full resize-none rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow appearance-none overflow-hidden"
                rows={1}
                style={{ minHeight: "44px", maxHeight: "160px", WebkitAppearance: "none" }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={(!input.trim() && attachments.length === 0) || streaming || isGenerating || processingAttachments}
              className="p-2.5 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-30 shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
