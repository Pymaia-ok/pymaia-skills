import { useState, useEffect } from "react";
import { Key, Plus, Copy, Trash2, Check, Loader2, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ApiKey {
  id: string;
  key_prefix: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
}

export default function ApiKeysSection() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const resp = await fetch(
      `https://${projectId}.supabase.co/functions/v1/manage-api-keys`,
      {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }
    );
    const json = await resp.json();
    setKeys(json.keys || []);
    setIsLoading(false);
  }

  async function generateKey() {
    setIsGenerating(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/manage-api-keys`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ label: "default" }),
        }
      );
      const json = await resp.json();
      if (json.error) {
        toast.error(json.error);
        return;
      }
      setNewKey(json.key);
      loadKeys();
    } catch {
      toast.error(t("apiKeys.errorGenerating"));
    } finally {
      setIsGenerating(false);
    }
  }

  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  async function revokeKey(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const resp = await fetch(
      `https://${projectId}.supabase.co/functions/v1/manage-api-keys?id=${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      }
    );
    const json = await resp.json();
    if (json.error) {
      toast.error(json.error);
      return;
    }
    setKeys((prev) => prev.filter((k) => k.id !== id));
    setConfirmRevokeId(null);
    toast.success(t("apiKeys.revoked"));
  }

  function copyToClipboard(text: string, type: "key" | "snippet") {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  }

  const mcpSnippet = newKey
    ? JSON.stringify(
        {
          mcpServers: {
            "pymaia-skills": {
              url: `https://${projectId}.supabase.co/functions/v1/mcp-server/mcp`,
              transport: "streamable-http",
              headers: {
                Authorization: `Bearer ${newKey}`,
              },
            },
          },
        },
        null,
        2
      )
    : "";

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            {t("apiKeys.title")}
          </h2>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full gap-1.5"
          onClick={generateKey}
          disabled={isGenerating || keys.length >= 5}
        >
          {isGenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          {t("apiKeys.generate")}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {t("apiKeys.description")}
      </p>

      {/* Keys list */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
          <Key className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">
            {t("apiKeys.noKeys")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div
              key={k.id}
              className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-foreground">
                    {k.key_prefix}••••••••
                  </code>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400"
                  >
                    {t("apiKeys.active")}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(k.created_at).toLocaleDateString()}
                  {k.last_used_at &&
                    ` · ${t("apiKeys.lastUsed")}: ${new Date(k.last_used_at).toLocaleDateString()}`}
                </div>
              </div>
              <button
                onClick={() => setConfirmRevokeId(k.id)}
                className="p-2 rounded-xl hover:bg-destructive/10 transition-colors"
                title={t("apiKeys.revoke")}
                aria-label={t("apiKeys.revoke")}
              >
                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New key dialog */}
      <Dialog open={!!newKey} onOpenChange={(open) => !open && setNewKey(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("apiKeys.newKeyTitle")}</DialogTitle>
            <DialogDescription>{t("apiKeys.newKeyDesc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Key display */}
            <div className="rounded-xl border border-border bg-muted/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono text-foreground break-all select-all">
                  {newKey}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => copyToClipboard(newKey!, "key")}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* MCP config snippet */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {t("apiKeys.mcpConfig")}
                </span>
              </div>
              <div className="rounded-xl border border-border bg-muted/50 p-3 relative">
                <pre className="text-xs font-mono text-foreground overflow-x-auto whitespace-pre">
                  {mcpSnippet}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(mcpSnippet, "snippet")}
                >
                  {copiedSnippet ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t("apiKeys.mcpConfigHint")}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
