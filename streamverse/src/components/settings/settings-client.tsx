"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Bell, Palette, Shield, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

const NAV_ITEMS = [
  { key: "profile", label: "Profile", icon: User, href: "#profile" },
  { key: "account", label: "Account", icon: User, href: "#account" },
  { key: "notifications", label: "Notifications", icon: Bell, href: "#notifications" },
  { key: "privacy", label: "Privacy", icon: Shield, href: "#privacy" },
  { key: "appearance", label: "Appearance", icon: Palette, href: "#appearance" },
  { key: "ai", label: "AI Preferences", icon: Sparkles, href: "#ai" },
  { key: "watch-together", label: "Watch Together", icon: Sparkles, href: "#watch-together" },
  { key: "danger", label: "Danger Zone", icon: Shield, href: "#danger" },
] as const;

type TabKey = (typeof NAV_ITEMS)[number]["key"];

export function SettingsClient({ userId }: { userId: string }) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  useEffect(() => {
    const hash = pathname.split("#")[1];
    if (hash && NAV_ITEMS.some((n) => n.key === hash)) {
      setActiveTab(hash as TabKey);
    }
  }, [pathname]);

  return (
    <div className="grid gap-6 md:grid-cols-[180px_1fr] lg:gap-8 lg:grid-cols-[240px_1fr]">
      {/* Left sidebar */}
      <aside className="space-y-1">
        <p className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Settings</p>
        <nav className="mt-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Right panel */}
      <main className="min-w-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="space-y-6">
          <TabsContent value="profile" className="space-y-4">
            <ProfileTab userId={userId} />
          </TabsContent>
          <TabsContent value="account" className="space-y-4">
            <AccountTab />
          </TabsContent>
          <TabsContent value="notifications" className="space-y-4">
            <NotificationsTab />
          </TabsContent>
          <TabsContent value="privacy" className="space-y-4">
            <PrivacyTab />
          </TabsContent>
          <TabsContent value="appearance" className="space-y-4">
            <AppearanceTab />
          </TabsContent>
          <TabsContent value="ai" className="space-y-4">
            <AiPreferencesTab />
          </TabsContent>
          <TabsContent value="watch-together" className="space-y-4">
            <WatchTogetherPreferencesTab />
          </TabsContent>
          <TabsContent value="danger" className="space-y-4">
            <DangerZoneTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function useSettings(key: string, defaultValue: any) {
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const mod = await import("@/app/actions/profile");
      const result = await mod.getProfileAction();
      if (result.ok && result.data && result.data.settings?.[key] !== undefined) {
        setValue(result.data.settings[key]);
      }
      setLoading(false);
    })();
  }, [key]);

  const updateValue = useCallback(
    async (newValue: any) => {
      setValue(newValue);
      const mod = await import("@/app/actions/profile");
      const result = await mod.updateSettingsAction({ [key]: newValue });
      if (!result.ok) {
        toast.error("Failed to save setting");
      }
    },
    [key],
  );

  return [value, updateValue, loading] as const;
}

function ProfileTab({ userId }: { userId: string }) {
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const mod = await import("@/app/actions/profile");
      const result = await mod.getProfileAction();
      if (result.ok && result.data) {
        setDisplayName(result.data.displayName ?? "");
        setAvatarUrl(result.data.avatarUrl ?? "");
        setPublicSlug(result.data.publicSlug ?? "");
      }
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const mod = await import("@/app/actions/profile");
      const result = await mod.updateProfileAction({
        displayName: displayName.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        publicSlug: publicSlug.trim() || undefined,
      });
      if (result.ok) {
        toast.success("Profile updated.");
      } else {
        toast.error("Failed to update profile.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
      toast.error("Supabase is not configured.");
      return;
    }

    const supabase = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
    setSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}. Make sure an 'avatars' storage bucket is created in Supabase and public.`);
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      if (data.publicUrl) {
        setAvatarUrl(data.publicUrl);
        toast.success("Avatar uploaded! Save changes to apply.");
      }
    } catch (error) {
      toast.error("An error occurred during upload.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass space-y-5 rounded-2xl border border-border/60 p-5">
      <h2 className="text-lg font-semibold">Profile Information</h2>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display Name</Label>
          <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="avatarUrl">Avatar URL</Label>
          <div className="flex gap-2">
            <Input id="avatarUrl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
            <Input type="file" accept="image/*" onChange={handleAvatarUpload} className="w-auto" disabled={saving} />
            <Button type="button" variant="outline" onClick={() => setAvatarUrl("")} disabled={saving}>Remove</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Upload an image or paste a URL directly.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="publicSlug">Public Slug</Label>
          <Input id="publicSlug" value={publicSlug} onChange={(e) => setPublicSlug(e.target.value)} />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [push, setPush, loading1] = useSettings("notifications.push", true);
  const [email, setEmail, loading2] = useSettings("notifications.email", false);
  const [marketing, setMarketing, loading3] = useSettings("notifications.marketing", false);

  if (loading1 || loading2 || loading3) return <div className="p-4 text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="glass space-y-5 rounded-2xl border border-border/60 p-5">
      <h2 className="text-lg font-semibold">Notifications</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Push Notifications</p>
            <p className="text-xs text-muted-foreground">Receive push notifications</p>
          </div>
          <Switch checked={push} onCheckedChange={setPush} />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Email Notifications</p>
            <p className="text-xs text-muted-foreground">Receive email updates</p>
          </div>
          <Switch checked={email} onCheckedChange={setEmail} />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Marketing Emails</p>
            <p className="text-xs text-muted-foreground">Receive promotional content</p>
          </div>
          <Switch checked={marketing} onCheckedChange={setMarketing} />
        </div>
      </div>
    </div>
  );
}

function AppearanceTab() {
  const [theme, setTheme, loading1] = useSettings("appearance.theme", "dark");
  const [animations, setAnimations, loading2] = useSettings("appearance.animations", true);

  if (loading1 || loading2) return <div className="p-4 text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="glass space-y-5 rounded-2xl border border-border/60 p-5">
      <h2 className="text-lg font-semibold">Appearance</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Theme</Label>
          <div className="grid grid-cols-3 gap-2">
            {["light", "dark", "system"].map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                  theme === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-border"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Animations</p>
            <p className="text-xs text-muted-foreground">Enable UI animations</p>
          </div>
          <Switch checked={animations} onCheckedChange={setAnimations} />
        </div>
      </div>
    </div>
  );
}

function PrivacyTab() {
  const [publicProfile, setPublicProfile, loading1] = useSettings("privacy.publicProfile", true);
  const [showActivity, setShowActivity, loading2] = useSettings("privacy.showActivity", true);

  if (loading1 || loading2) return <div className="p-4 text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="glass space-y-5 rounded-2xl border border-border/60 p-5">
      <h2 className="text-lg font-semibold">Privacy</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Public Profile</p>
            <p className="text-xs text-muted-foreground">Make your profile visible to everyone</p>
          </div>
          <Switch checked={publicProfile} onCheckedChange={setPublicProfile} />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Show Activity</p>
            <p className="text-xs text-muted-foreground">Show your activity on your profile</p>
          </div>
          <Switch checked={showActivity} onCheckedChange={setShowActivity} />
        </div>
      </div>
    </div>
  );
}

function AccountTab() {
  const [email, setEmail, loading1] = useSettings("account.email", "");
  if (loading1) return <div className="p-4 text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="glass space-y-5 rounded-2xl border border-border/60 p-5">
      <h2 className="text-lg font-semibold">Account</h2>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function AiPreferencesTab() {
  const [suggestions, setSuggestions, loading1] = useSettings("ai.suggestions", true);
  if (loading1) return <div className="p-4 text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="glass space-y-5 rounded-2xl border border-border/60 p-5">
      <h2 className="text-lg font-semibold">AI Preferences</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Personalized AI Suggestions</p>
            <p className="text-xs text-muted-foreground">Allow AI to use your watchlist history</p>
          </div>
          <Switch checked={suggestions} onCheckedChange={setSuggestions} />
        </div>
      </div>
    </div>
  );
}

function WatchTogetherPreferencesTab() {
  const [autoJoin, setAutoJoin, loading1] = useSettings("watchTogether.autoJoin", false);
  if (loading1) return <div className="p-4 text-muted-foreground text-sm">Loading...</div>;

  return (
    <div className="glass space-y-5 rounded-2xl border border-border/60 p-5">
      <h2 className="text-lg font-semibold">Watch Together Preferences</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Auto-join Friends' Rooms</p>
            <p className="text-xs text-muted-foreground">Automatically join when invited</p>
          </div>
          <Switch checked={autoJoin} onCheckedChange={setAutoJoin} />
        </div>
      </div>
    </div>
  );
}

function DangerZoneTab() {
  return (
    <div className="glass space-y-5 rounded-2xl border border-destructive p-5">
      <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Delete Account</p>
            <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
          </div>
          <Button variant="destructive">Delete Account</Button>
        </div>
      </div>
    </div>
  );
}
