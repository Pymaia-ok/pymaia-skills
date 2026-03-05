import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Loader2, Paperclip, Link2, X, FileText, Image, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
        // Upload to storage first
        const ext = attachment.name.split(".").pop() || "bin";
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

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || streaming) return;

    // Process attachments
    let contextParts: string[] = [];
    if (attachments.length > 0) {
      toast.info("Procesando archivos adjuntos...");
      
      for (const att of attachments) {
        const extracted = await processAttachment(att);
        if (extracted) contextParts.push(extracted);
      }
    }

    // Build message with context
    let fullMessage = text;
    if (contextParts.length > 0) {
      const context = contextParts.join("\n\n---\n\n");
      fullMessage = contextParts.length > 0 && text
        ? `${text}\n\n[Contexto extraído de archivos adjuntos]:\n${context}`
        : context;
    }

    const userMsg: Msg = { role: "user", content: fullMessage };
    const displayMsg: Msg = { 
      role: "user", 
      content: text + (attachments.length > 0 ? `\n\n📎 ${attachments.map(a => a.name).join(", ")}` : "")
    };
    
    const newMessages = [...messages, userMsg];
    // For display, show the friendly version
    const displayMessages = [...messages, displayMsg];
    setMessages(displayMessages);
    setInput("");
    setAttachments([]);
    setStreaming(true);

    let assistantText = "";
    const updateAssistant = (chunk: string) => {
      assistantText += chunk;
      setMessages([
        ...displayMessages,
        { role: "assistant", content: assistantText },
      ]);
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
  const canGenerate = userMessageCount >= 3 && !streaming;

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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-foreground text-background rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {streaming && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Generate button */}
      {canGenerate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pb-2"
        >
          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full rounded-full gap-2"
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
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5 text-xs">
              {getAttachmentIcon(att.name)}
              <span className="max-w-[120px] truncate">{att.name}</span>
              <button onClick={() => removeAttachment(att.id)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* URL input */}
      {showUrlInput && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 items-center bg-secondary rounded-xl p-2">
            <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addUrl()}
              placeholder="https://youtube.com/watch?v=... o cualquier URL"
              className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
            <Button size="sm" variant="ghost" onClick={addUrl} className="h-7 px-2 text-xs">
              Agregar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowUrlInput(false)} className="h-7 px-2">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2 items-end">
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl h-[44px] w-[44px]"
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming || isGenerating}
              title="Adjuntar archivo (PDF, imagen, video, documento)"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl h-[44px] w-[44px]"
              onClick={() => setShowUrlInput(!showUrlInput)}
              disabled={streaming || isGenerating}
              title="Agregar link (YouTube, sitio web, red social)"
            >
              <Link2 className="w-4 h-4" />
            </Button>
          </div>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribí tu respuesta, adjuntá archivos o pegá un link..."
            disabled={streaming || isGenerating}
            className="min-h-[44px] max-h-[120px] resize-none rounded-xl border-border"
            rows={1}
          />
          <Button
            onClick={sendMessage}
            disabled={(!input.trim() && attachments.length === 0) || streaming || isGenerating}
            size="icon"
            className="rounded-xl shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
