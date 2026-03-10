import { useState, useEffect } from "react";
import { User, Pencil, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface ProfileEditorProps {
  userId: string;
}

export default function ProfileEditor({ userId }: ProfileEditorProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ display_name: "", username: "", bio: "", avatar_url: "" });
  const [form, setForm] = useState(profile);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("display_name, username, bio, avatar_url")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        if (data) {
          const p = {
            display_name: data.display_name || "",
            username: data.username || "",
            bio: data.bio || "",
            avatar_url: data.avatar_url || "",
          };
          setProfile(p);
          setForm(p);
        }
        setLoading(false);
      });
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: form.display_name || null,
        username: form.username || null,
        bio: form.bio || null,
        avatar_url: form.avatar_url || null,
      })
      .eq("user_id", userId);

    if (error) {
      if (error.code === "23505") toast.error(t("profile.usernameTaken"));
      else toast.error(t("profile.saveError"));
    } else {
      setProfile(form);
      setEditing(false);
      toast.success(t("profile.saved"));
    }
    setSaving(false);
  };

  if (loading) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <User className="w-5 h-5" />
          {t("profile.title")}
        </h2>
        {!editing && (
          <Button variant="ghost" size="sm" className="rounded-full gap-1.5" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5" />
            {t("profile.edit")}
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("profile.displayName")}</label>
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Tu nombre" className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("profile.username")}</label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })} placeholder="tu-username" className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("profile.bio")}</label>
            <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder={t("profile.bioPlaceholder")} rows={2} className="rounded-xl resize-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("profile.avatarUrl")}</label>
            <Input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." className="rounded-xl" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="rounded-full gap-1.5" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {t("profile.save")}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full gap-1.5" onClick={() => { setForm(profile); setEditing(false); }}>
              <X className="w-3.5 h-3.5" />
              {t("profile.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{profile.display_name || t("profile.noName")}</p>
            {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
            {profile.bio && <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>}
            {!profile.display_name && !profile.username && !profile.bio && (
              <p className="text-sm text-muted-foreground">{t("profile.empty")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
