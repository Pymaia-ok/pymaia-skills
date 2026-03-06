import { useState } from "react";
import { Share2, Copy, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
}

export default function ShareButton({ url, title, description }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description || title);

  const shareLinks = [
    {
      name: "X (Twitter)",
      icon: "𝕏",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      name: "LinkedIn",
      icon: "in",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: "WhatsApp",
      icon: "💬",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(t("share.linkCopied", "Link copiado"));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
      >
        <Share2 className="w-4 h-4" />
        {t("share.share", "Compartir")}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl border border-border bg-card shadow-lg p-3 space-y-1">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("share.shareVia", "Compartir vía")}
              </span>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {shareLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors text-sm text-foreground"
              >
                <span className="w-6 text-center font-bold text-sm">{link.icon}</span>
                {link.name}
              </a>
            ))}

            <div className="border-t border-border my-1" />

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors text-sm text-foreground w-full"
            >
              {copied ? <Check className="w-4 h-4 ml-1" /> : <Copy className="w-4 h-4 ml-1" />}
              {copied ? t("share.copied", "¡Copiado!") : t("share.copyLink", "Copiar link")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
