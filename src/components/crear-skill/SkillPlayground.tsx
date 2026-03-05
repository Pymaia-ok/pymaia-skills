import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Loader2, FlaskConical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import type { Msg } from "@/lib/streaming";

interface GeneratedSkill {
  name: string;
  tagline: string;
  description: string;
  triggers: string[];
  instructions: string;
  examples: { title: string; input: string; output: string }[];
  dont_do: string[];
  edge_cases: string[];
  category: string;
  industry: string[];
  target_roles: string[];
  install_command: string;
}

interface SkillPlaygroundProps {
  skill: GeneratedSkill;
  onBack: () => void;
  onRefine: () => void;
}

const PLAYGROUND_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-skill-playground`;

export default function SkillPlayground({ skill, onBack, onRefine }: SkillPlaygroundProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Msg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(PLAYGROUND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ skill, messages: newMessages }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`Error ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) {
              assistantSoFar += c;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error al procesar tu mensaje. Intentá de nuevo." }]);
    }

    setStreaming(false);
    inputRef.current?.focus();
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground truncate">{skill.name}</h2>
            <Badge variant="secondary" className="gap-1 shrink-0">
              <FlaskConical className="w-3 h-3" /> Playground
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">Probá tu skill enviando mensajes como lo haría un usuario</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1 text-xs">
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
          <Button variant="outline" size="sm" onClick={onRefine} className="text-xs">
            Refinar skill
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12 space-y-3">
            <FlaskConical className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium text-foreground">Probá tu skill</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Escribí un mensaje como lo haría un usuario real. La IA va a responder siguiendo las instrucciones de tu skill.
              </p>
            </div>
            {skill.triggers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                {skill.triggers.slice(0, 3).map((t, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(t); inputRef.current?.focus(); }}
                    className="px-3 py-1.5 rounded-full bg-secondary text-xs text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-foreground rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </motion.div>
        ))}

        {streaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3 shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2 items-center max-w-2xl mx-auto"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí un mensaje para probar tu skill..."
            disabled={streaming}
            className="rounded-full"
            autoFocus
          />
          <Button type="submit" size="icon" disabled={!input.trim() || streaming} className="rounded-full shrink-0">
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
