import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, ExternalLink, Shield, Search, Image, BookOpen, Zap, CheckCircle, AlertTriangle, Info, Github, Key } from "lucide-react";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";

const API_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/trust-score-api`;

const SCORE_BREAKDOWN = [
  { category: "Security", max: 40, color: "text-red-500", items: ["Scan verdict (SAFE/SUSPICIOUS)", "No secrets found", "No prompt injection", "Security status verified"] },
  { category: "Publisher", max: 25, color: "text-blue-500", items: ["Trusted org (Anthropic, Google, etc.)", "GitHub account age >1yr", "Public repos >5", "Official/curated source"] },
  { category: "Community", max: 20, color: "text-green-500", items: ["Install/star count", "User ratings ≥4.0", "No abuse reports"] },
  { category: "Longevity", max: 15, color: "text-amber-500", items: ["Age >90 days", "Active maintenance", "Recent commits (<6 months)"] },
];

const BADGE_TIERS = [
  { name: "Official", range: "90-100", color: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" },
  { name: "Verified", range: "80-89", color: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30" },
  { name: "Trusted", range: "60-79", color: "bg-green-500/20 text-green-700 border-green-500/30" },
  { name: "Reviewed", range: "40-59", color: "bg-blue-500/20 text-blue-700 border-blue-500/30" },
  { name: "New", range: "0-39", color: "bg-muted text-muted-foreground border-border" },
];

export default function ApiDocs() {
  const { t } = useTranslation();
  useSEO({
    title: "Security Benchmark API — Pymaia Skills",
    description: "Public API to query trust scores, security scan results, and embeddable badges for AI skills, connectors, and plugins. Scan any GitHub repo on-demand.",
  });

  const [trySlug, setTrySlug] = useState("claude-prd-generator");
  const [tryType, setTryType] = useState("skill");
  const [tryResult, setTryResult] = useState<any>(null);
  const [tryLoading, setTryLoading] = useState(false);

  const [searchQ, setSearchQ] = useState("");
  const [searchType, setSearchType] = useState("skill");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [githubUrl, setGithubUrl] = useState("https://github.com/anthropics/anthropic-cookbook");
  const [githubResult, setGithubResult] = useState<any>(null);
  const [githubLoading, setGithubLoading] = useState(false);

  const handleTry = async () => {
    setTryLoading(true);
    try {
      const res = await fetch(`${API_BASE}?slug=${encodeURIComponent(trySlug)}&type=${tryType}`);
      const data = await res.json();
      setTryResult(data);
    } catch (e) {
      setTryResult({ error: (e as Error).message });
    }
    setTryLoading(false);
  };

  const handleSearch = async () => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({ action: "search", type: searchType, limit: "10" });
      if (searchQ) params.set("q", searchQ);
      const res = await fetch(`${API_BASE}?${params}`);
      const data = await res.json();
      setSearchResult(data);
    } catch (e) {
      setSearchResult({ error: (e as Error).message });
    }
    setSearchLoading(false);
  };

  const handleGithubLookup = async () => {
    setGithubLoading(true);
    try {
      const res = await fetch(`${API_BASE}?github_url=${encodeURIComponent(githubUrl)}`);
      const data = await res.json();
      setGithubResult(data);
    } catch (e) {
      setGithubResult({ error: (e as Error).message });
    }
    setGithubLoading(false);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const badgeUrl = `${API_BASE}?action=badge&slug=${trySlug}&type=${tryType}`;

  return (
    <main className="min-h-screen bg-background pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <Badge variant="outline" className="text-xs">v3.0</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
            Security Benchmark API
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            {t("apiDocs.heroDescription", "Public REST API to query trust scores, security scan details, and embeddable badges for any skill, connector, or plugin. Scan any GitHub repo on-demand — if it passes, it gets auto-indexed.")}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="secondary" className="gap-1"><Zap className="h-3 w-3" /> Free</Badge>
            <Badge variant="secondary" className="gap-1">60 req/min</Badge>
            <Badge variant="secondary" className="gap-1">No auth required</Badge>
            <Badge variant="secondary" className="gap-1"><Github className="h-3 w-3" /> On-demand scan</Badge>
          </div>
        </div>

        {/* Base URL */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Base URL</Label>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 bg-muted px-4 py-2.5 rounded-md text-sm font-mono break-all text-foreground">
                {API_BASE}
              </code>
              <Button variant="outline" size="icon" onClick={() => copyText(API_BASE)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <Tabs defaultValue="apikey" className="mb-12">
          <TabsList className="w-full justify-start mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="apikey" className="gap-1.5"><Key className="h-3.5 w-3.5" /> API Key Auth</TabsTrigger>
            <TabsTrigger value="github" className="gap-1.5"><Github className="h-3.5 w-3.5" /> GitHub Scan</TabsTrigger>
            <TabsTrigger value="lookup" className="gap-1.5"><Search className="h-3.5 w-3.5" /> Lookup</TabsTrigger>
            <TabsTrigger value="search" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Search</TabsTrigger>
            <TabsTrigger value="badge" className="gap-1.5"><Image className="h-3.5 w-3.5" /> Badge</TabsTrigger>
          </TabsList>

          {/* API KEY AUTH */}
          <TabsContent value="apikey">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge className="bg-violet-600 text-white font-mono text-xs">AUTH</Badge>
                  Personal API Keys for MCP Server
                </CardTitle>
                <CardDescription>
                  Generate a personal API key to access your private skills through the Pymaia MCP server.
                  Authenticated users get higher rate limits (120 req/min vs 30 for anonymous).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">How it works</Label>
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm text-muted-foreground">
                    <p>1. Go to <strong className="text-foreground"><a href="/mis-skills" className="underline hover:text-primary">My Skills</a></strong> and generate a personal API key</p>
                    <p>2. The key starts with <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono">pymsk_</code> and is shown only once — copy it immediately</p>
                    <p>3. Add the key to your Claude Code MCP configuration as a Bearer token</p>
                    <p>4. The MCP server will identify you and include your <strong className="text-foreground">private skills</strong> in search results</p>
                    <p>5. Without a key, the MCP server works normally (public skills only, 30 req/min)</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Claude Code Configuration</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Add this to your <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">~/.claude/mcp.json</code> file:
                  </p>
                  <div className="relative">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 z-10" onClick={() => copyText(`{
  "mcpServers": {
    "pymaia-skills": {
      "url": "https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp-server/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer pymsk_YOUR_API_KEY_HERE"
      }
    }
  }
}`)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto text-foreground">{`{
  "mcpServers": {
    "pymaia-skills": {
      "url": "https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp-server/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer pymsk_YOUR_API_KEY_HERE"
      }
    }
  }
}`}</pre>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Without Authentication (public only)</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    If you don't need private skills, you can use the MCP server without a key:
                  </p>
                  <div className="relative">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 z-10" onClick={() => copyText(`{
  "mcpServers": {
    "pymaia-skills": {
      "url": "https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp-server/mcp",
      "transport": "streamable-http"
    }
  }
}`)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto text-foreground">{`{
  "mcpServers": {
    "pymaia-skills": {
      "url": "https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp-server/mcp",
      "transport": "streamable-http"
    }
  }
}`}</pre>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Features Unlocked with API Key</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2 text-sm p-3 bg-muted rounded-lg">
                      <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                      <div>
                        <strong className="text-foreground">Private Skills in Search</strong>
                        <p className="text-muted-foreground text-xs mt-0.5">Your private skills appear in <code className="text-[10px]">search_skills</code>, <code className="text-[10px]">get_skill_details</code>, and <code className="text-[10px]">solve_goal</code> results</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm p-3 bg-muted rounded-lg">
                      <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                      <div>
                        <strong className="text-foreground">Higher Rate Limit</strong>
                        <p className="text-muted-foreground text-xs mt-0.5">120 requests/min vs 30/min for anonymous users</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm p-3 bg-muted rounded-lg">
                      <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                      <div>
                        <strong className="text-foreground">Personalized Recommendations</strong>
                        <p className="text-muted-foreground text-xs mt-0.5"><code className="text-[10px]">solve_goal</code> considers your private catalog for better suggestions</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm p-3 bg-muted rounded-lg">
                      <Shield className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
                      <div>
                        <strong className="text-foreground">Secure by Design</strong>
                        <p className="text-muted-foreground text-xs mt-0.5">Keys are SHA-256 hashed. Revoke anytime from My Skills page</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Key Management</Label>
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm text-muted-foreground">
                    <p>• <strong className="text-foreground">Generate:</strong> Go to <a href="/mis-skills" className="underline hover:text-primary">My Skills</a> → API Keys → Generate key</p>
                    <p>• <strong className="text-foreground">Revoke:</strong> Click the trash icon next to any key to revoke it instantly</p>
                    <p>• <strong className="text-foreground">Multiple keys:</strong> You can create multiple keys with different labels</p>
                    <p>• <strong className="text-foreground">Last used:</strong> Each key shows when it was last used for auditing</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GITHUB SCAN */}
          <TabsContent value="github">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white font-mono text-xs">GET</Badge>
                  GitHub Repository Scan
                </CardTitle>
                <CardDescription>
                  Look up any GitHub repository. If it's already indexed, returns its trust score.
                  If not, runs a full 12-layer security scan on-demand and auto-indexes it if safe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Parameters</Label>
                  <div className="bg-muted rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border">
                        <th className="text-left p-3 font-medium text-muted-foreground">Param</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                      </tr></thead>
                      <tbody>
                        <tr><td className="p-3 font-mono text-xs">github_url</td><td className="p-3 text-xs">string</td><td className="p-3 text-xs">Full GitHub repo URL (required)</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">How it works</Label>
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm text-muted-foreground">
                    <p>1. Searches all indexed skills, connectors, and plugins by GitHub URL</p>
                    <p>2. If found → returns trust score and scan details instantly</p>
                    <p>3. If not found → fetches the repo README from GitHub</p>
                    <p>4. Runs full 12-layer security scan (secrets, injection, typosquatting, etc.)</p>
                    <p>5. If verdict is <strong className="text-foreground">SAFE</strong> → auto-indexes the repo in Pymaia Skills</p>
                    <p>6. Returns scan results with verdict and details</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Example</Label>
                  <div className="bg-muted p-3 rounded-lg">
                    <code className="text-xs font-mono break-all text-foreground">
                      GET {API_BASE}?github_url=https://github.com/anthropics/anthropic-cookbook
                    </code>
                  </div>
                </div>

                {/* Try it */}
                <div className="border-t border-border pt-6">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Try it live
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/org/repo"
                      className="flex-1"
                    />
                    <Button onClick={handleGithubLookup} disabled={githubLoading}>
                      {githubLoading ? "Scanning..." : "Scan"}
                    </Button>
                  </div>
                  {githubLoading && (
                    <p className="mt-3 text-sm text-muted-foreground animate-pulse">
                      ⏳ On-demand scans may take 5-15 seconds for unindexed repos...
                    </p>
                  )}
                  {githubResult && (
                    <div className="mt-4 relative">
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => copyText(JSON.stringify(githubResult, null, 2))}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-96 text-foreground">
                        {JSON.stringify(githubResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LOOKUP */}
          <TabsContent value="lookup">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge className="bg-green-600 text-white font-mono text-xs">GET</Badge>
                  Lookup Trust Score
                </CardTitle>
                <CardDescription>Get detailed trust score and security scan results for a single item by slug.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Parameters</Label>
                  <div className="bg-muted rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border">
                        <th className="text-left p-3 font-medium text-muted-foreground">Param</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                      </tr></thead>
                      <tbody>
                        <tr className="border-b border-border/50"><td className="p-3 font-mono text-xs">slug</td><td className="p-3 text-xs">string</td><td className="p-3 text-xs">Item slug (required)</td></tr>
                        <tr><td className="p-3 font-mono text-xs">type</td><td className="p-3 text-xs">string</td><td className="p-3 text-xs">skill | connector | plugin (default: skill)</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Try it */}
                <div className="border-t border-border pt-6">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Try it live
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={trySlug}
                      onChange={(e) => setTrySlug(e.target.value)}
                      placeholder="Slug..."
                      className="flex-1"
                    />
                    <Select value={tryType} onValueChange={setTryType}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skill">skill</SelectItem>
                        <SelectItem value="connector">connector</SelectItem>
                        <SelectItem value="plugin">plugin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleTry} disabled={tryLoading}>
                      {tryLoading ? "Loading..." : "Send"}
                    </Button>
                  </div>
                  {tryResult && (
                    <div className="mt-4 relative">
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => copyText(JSON.stringify(tryResult, null, 2))}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-96 text-foreground">
                        {JSON.stringify(tryResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEARCH */}
          <TabsContent value="search">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge className="bg-green-600 text-white font-mono text-xs">GET</Badge>
                  Search Items
                </CardTitle>
                <CardDescription>Search and list items with their trust scores. Filter by type, minimum score, or badge tier.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Parameters</Label>
                  <div className="bg-muted rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border">
                        <th className="text-left p-3 font-medium text-muted-foreground">Param</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                      </tr></thead>
                      <tbody>
                        <tr className="border-b border-border/50"><td className="p-3 font-mono text-xs">action</td><td className="p-3 text-xs">string</td><td className="p-3 text-xs">"search" (required)</td></tr>
                        <tr className="border-b border-border/50"><td className="p-3 font-mono text-xs">q</td><td className="p-3 text-xs">string</td><td className="p-3 text-xs">Search query (optional)</td></tr>
                        <tr className="border-b border-border/50"><td className="p-3 font-mono text-xs">type</td><td className="p-3 text-xs">string</td><td className="p-3 text-xs">skill | connector | plugin</td></tr>
                        <tr className="border-b border-border/50"><td className="p-3 font-mono text-xs">min_score</td><td className="p-3 text-xs">number</td><td className="p-3 text-xs">Minimum trust score (0-100)</td></tr>
                        <tr className="border-b border-border/50"><td className="p-3 font-mono text-xs">badge</td><td className="p-3 text-xs">string</td><td className="p-3 text-xs">Filter by badge tier</td></tr>
                        <tr><td className="p-3 font-mono text-xs">limit</td><td className="p-3 text-xs">number</td><td className="p-3 text-xs">Max results (1-100, default 25)</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Try it */}
                <div className="border-t border-border pt-6">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Try it live
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder="Search query (optional)..."
                      className="flex-1"
                    />
                    <Select value={searchType} onValueChange={setSearchType}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skill">skill</SelectItem>
                        <SelectItem value="connector">connector</SelectItem>
                        <SelectItem value="plugin">plugin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleSearch} disabled={searchLoading}>
                      {searchLoading ? "Loading..." : "Search"}
                    </Button>
                  </div>
                  {searchResult && (
                    <div className="mt-4 relative">
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => copyText(JSON.stringify(searchResult, null, 2))}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-96 text-foreground">
                        {JSON.stringify(searchResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BADGE */}
          <TabsContent value="badge">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge className="bg-green-600 text-white font-mono text-xs">GET</Badge>
                  SVG Badge
                </CardTitle>
                <CardDescription>Dynamic shields.io-style badge for embedding in GitHub READMEs, websites, or documentation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Preview</Label>
                  <div className="bg-muted p-6 rounded-lg flex items-center justify-center">
                    <img src={badgeUrl} alt="Trust Score Badge" className="h-5" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Markdown</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-muted p-3 rounded-lg text-xs font-mono break-all text-foreground">
                      {`![Pymaia Trust Score](${badgeUrl})`}
                    </code>
                    <Button variant="outline" size="icon" onClick={() => copyText(`![Pymaia Trust Score](${badgeUrl})`)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">HTML</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-muted p-3 rounded-lg text-xs font-mono break-all text-foreground">
                      {`<img src="${badgeUrl}" alt="Pymaia Trust Score" />`}
                    </code>
                    <Button variant="outline" size="icon" onClick={() => copyText(`<img src="${badgeUrl}" alt="Pymaia Trust Score" />`)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Scoring System */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-6 flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            {t("apiDocs.scoringTitle", "Trust Score Breakdown")}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {SCORE_BREAKDOWN.map((cat) => (
              <Card key={cat.category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{cat.category}</span>
                    <Badge variant="outline" className={cat.color}>{cat.max} pts</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {cat.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Badge Tiers */}
          <h3 className="text-lg font-semibold text-foreground mb-4">{t("apiDocs.badgeTiers", "Badge Tiers")}</h3>
          <div className="flex flex-wrap gap-2">
            {BADGE_TIERS.map((tier) => (
              <Badge key={tier.name} variant="outline" className={`${tier.color} px-3 py-1.5`}>
                {tier.name} ({tier.range})
              </Badge>
            ))}
          </div>
        </section>

        {/* Rate Limiting & Notes */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {t("apiDocs.rateLimitTitle", "Rate Limits & Usage Notes")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• <strong className="text-foreground">Security Benchmark API:</strong> 60 requests per minute per IP (no auth required).</p>
              <p>• <strong className="text-foreground">MCP Server (anonymous):</strong> 30 requests per minute per IP.</p>
              <p>• <strong className="text-foreground">MCP Server (with API key):</strong> 120 requests per minute per user.</p>
              <p>• <strong className="text-foreground">Authentication:</strong> Security Benchmark API is public. MCP Server supports optional <code className="bg-background px-1 rounded text-xs font-mono">pymsk_</code> API keys for private skills access.</p>
              <p>• <strong className="text-foreground">Caching:</strong> Responses are cached for 5 minutes (lookup/search) or 1 hour (badges).</p>
              <p>• <strong className="text-foreground">CORS:</strong> All origins allowed. Use directly from browser or server.</p>
              <p>• <strong className="text-foreground">On-demand scans:</strong> Unindexed GitHub repos are scanned in real-time (5-15s). SAFE repos are auto-indexed.</p>
              <p>• <strong className="text-foreground">Scan layers:</strong> 12 security analysis layers including secret scanning, prompt injection detection, typosquatting, hidden content analysis, dependency auditing, and LLM-powered analysis.</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
