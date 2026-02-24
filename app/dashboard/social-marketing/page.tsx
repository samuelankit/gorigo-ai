"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/components/query-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Megaphone,
  Plus,
  Loader2,
  BarChart3,
  FileText,
  Send,
  Calendar,
  Trash2,
  ExternalLink,
  Sparkles,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Heart,
  Share2,
  MousePointerClick,
  Users,
  Hash,
  Palette,
  Video,
  Globe,
  ArrowRight,
  Wand2,
  ThumbsUp,
} from "lucide-react";
import { useToast } from "@/lib/use-toast";
import {
  SOCIAL_CONNECTOR_REGISTRY,
  CONNECTOR_SEGMENTS,
  type SocialConnectorConfig,
} from "@/lib/social-connector-config";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface SocialStrategy {
  id: number;
  title: string;
  businessType: string;
  goals: string;
  platforms: string[];
  budget: string | null;
  timeframe: string | null;
  tone: string;
  strategyContent: any;
  status: string;
  createdAt: string;
}

interface SocialPost {
  id: number;
  content: string;
  platforms: string[];
  mediaUrls: string[] | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  status: string;
  strategyId: number | null;
  createdAt: string;
}

const PLATFORM_NAMES: Record<string, string> = {
  facebook_instagram: "Facebook / Instagram",
  linkedin: "LinkedIn",
  twitter: "X (Twitter)",
  tiktok: "TikTok",
  youtube: "YouTube",
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook_instagram: "bg-blue-500",
  linkedin: "bg-blue-700",
  twitter: "bg-slate-800",
  tiktok: "bg-pink-500",
  youtube: "bg-red-600",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: any }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  scheduled: { label: "Scheduled", variant: "outline", icon: Clock },
  publishing: { label: "Publishing", variant: "default", icon: Loader2 },
  published: { label: "Published", variant: "default", icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
  cancelled: { label: "Cancelled", variant: "secondary", icon: AlertCircle },
  active: { label: "Active", variant: "default", icon: CheckCircle2 },
  completed: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
  archived: { label: "Archived", variant: "outline", icon: FileText },
};

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#06b6d4"];

export default function SocialMarketingPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showStrategyDialog, setShowStrategyDialog] = useState(false);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showCaptionDialog, setShowCaptionDialog] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<SocialStrategy | null>(null);
  const [postStatusFilter, setPostStatusFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: strategiesData, isLoading: strategiesLoading } = useQuery<{
    strategies: SocialStrategy[];
    total: number;
  }>({
    queryKey: ["/api/social-strategies"],
  });

  const { data: postsData, isLoading: postsLoading } = useQuery<{
    posts: SocialPost[];
    total: number;
  }>({
    queryKey: ["/api/social-posts"],
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<{
    summary: any;
    publishedPostsCount: number;
    platformBreakdown: any[];
  }>({
    queryKey: ["/api/social-analytics"],
  });

  const strategies = strategiesData?.strategies || [];
  const posts = postsData?.posts || [];
  const analytics = analyticsData;

  const filteredPosts = postStatusFilter === "all"
    ? posts
    : posts.filter(p => p.status === postStatusFilter);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Megaphone className="h-6 w-6 text-violet-600" />
            Social Marketing
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create strategies, design with your tools, publish everywhere
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5" data-testid="tabs-social-marketing">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="strategies" data-testid="tab-strategies">Strategies</TabsTrigger>
          <TabsTrigger value="studio" data-testid="tab-studio">Content Studio</TabsTrigger>
          <TabsTrigger value="posts" data-testid="tab-posts">Posts</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            strategies={strategies}
            posts={posts}
            analytics={analytics}
            isLoading={strategiesLoading || postsLoading || analyticsLoading}
            onCreateStrategy={() => setShowStrategyDialog(true)}
            onCreatePost={() => setShowPostDialog(true)}
          />
        </TabsContent>

        <TabsContent value="strategies">
          <StrategiesTab
            strategies={strategies}
            isLoading={strategiesLoading}
            onCreateStrategy={() => setShowStrategyDialog(true)}
            onViewStrategy={setSelectedStrategy}
            queryClient={queryClient}
            toast={toast}
          />
        </TabsContent>

        <TabsContent value="studio">
          <ContentStudioTab
            onGenerateCaption={() => setShowCaptionDialog(true)}
          />
        </TabsContent>

        <TabsContent value="posts">
          <PostsTab
            posts={filteredPosts}
            isLoading={postsLoading}
            statusFilter={postStatusFilter}
            onFilterChange={setPostStatusFilter}
            onCreatePost={() => setShowPostDialog(true)}
            queryClient={queryClient}
            toast={toast}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab
            analytics={analytics}
            isLoading={analyticsLoading}
          />
        </TabsContent>
      </Tabs>

      <CreateStrategyDialog
        open={showStrategyDialog}
        onOpenChange={setShowStrategyDialog}
        queryClient={queryClient}
        toast={toast}
      />

      <CreatePostDialog
        open={showPostDialog}
        onOpenChange={setShowPostDialog}
        queryClient={queryClient}
        toast={toast}
      />

      <GenerateCaptionDialog
        open={showCaptionDialog}
        onOpenChange={setShowCaptionDialog}
      />

      {selectedStrategy && (
        <ViewStrategyDialog
          strategy={selectedStrategy}
          onClose={() => setSelectedStrategy(null)}
          queryClient={queryClient}
          toast={toast}
        />
      )}
    </div>
  );
}

function OverviewTab({ strategies, posts, analytics, isLoading, onCreateStrategy, onCreatePost }: {
  strategies: SocialStrategy[];
  posts: SocialPost[];
  analytics: any;
  isLoading: boolean;
  onCreateStrategy: () => void;
  onCreatePost: () => void;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const draftPosts = posts.filter(p => p.status === "draft").length;
  const scheduledPosts = posts.filter(p => p.status === "scheduled").length;
  const publishedPosts = posts.filter(p => p.status === "published").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Strategies</p>
                <p className="text-3xl font-bold" data-testid="text-strategy-count">{strategies.length}</p>
              </div>
              <FileText className="h-8 w-8 text-violet-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft Posts</p>
                <p className="text-3xl font-bold" data-testid="text-draft-count">{draftPosts}</p>
              </div>
              <FileText className="h-8 w-8 text-amber-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-3xl font-bold" data-testid="text-scheduled-count">{scheduledPosts}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-3xl font-bold" data-testid="text-published-count">{publishedPosts}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={onCreateStrategy} className="w-full justify-start gap-2" variant="outline" data-testid="button-quick-create-strategy">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Create Marketing Strategy with AI
            </Button>
            <Button onClick={onCreatePost} className="w-full justify-start gap-2" variant="outline" data-testid="button-quick-create-post">
              <Plus className="h-4 w-4 text-blue-500" />
              Compose a Post
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connected Tools</CardTitle>
            <CardDescription>Connect your design and social tools via OAuth</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CONNECTOR_SEGMENTS).map(([key, seg]) => {
                const connectors = Object.values(SOCIAL_CONNECTOR_REGISTRY).filter(c => c.segment === key);
                return (
                  <div key={key} className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-sm font-medium">{seg.label}</p>
                    <p className="text-xs text-muted-foreground">{connectors.length} tools</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StrategiesTab({ strategies, isLoading, onCreateStrategy, onViewStrategy, queryClient, toast }: {
  strategies: SocialStrategy[];
  isLoading: boolean;
  onCreateStrategy: () => void;
  onViewStrategy: (s: SocialStrategy) => void;
  queryClient: any;
  toast: any;
}) {
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/social-strategies/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-strategies"] });
      toast({ title: "Strategy deleted" });
    },
    onError: () => toast({ title: "Failed to delete strategy", variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Marketing Strategies</h2>
        <Button onClick={onCreateStrategy} size="sm" className="gap-2" data-testid="button-create-strategy">
          <Sparkles className="h-4 w-4" /> Create Strategy
        </Button>
      </div>

      {strategies.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No strategies yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first AI-powered marketing strategy to get started
            </p>
            <Button onClick={onCreateStrategy} className="gap-2" data-testid="button-empty-create-strategy">
              <Sparkles className="h-4 w-4" /> Create Strategy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {strategies.map((strategy) => {
            const statusCfg = STATUS_CONFIG[strategy.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusCfg.icon;
            return (
              <Card key={strategy.id} className="hover:shadow-md transition-shadow" data-testid={`card-strategy-${strategy.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{strategy.title}</h3>
                        <Badge variant={statusCfg.variant} className="shrink-0 gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {strategy.businessType} · {strategy.goals}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {strategy.platforms.map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {PLATFORM_NAMES[p] || p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => onViewStrategy(strategy)} data-testid={`button-view-strategy-${strategy.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(strategy.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-strategy-${strategy.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContentStudioTab({ onGenerateCaption }: { onGenerateCaption: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Content Studio</h2>
          <p className="text-sm text-muted-foreground">AI caption writing + your connected design tools</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-violet-500" />
            AI Caption Writer
          </CardTitle>
          <CardDescription>Generate platform-optimised captions, hashtags, and CTAs</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onGenerateCaption} className="gap-2" data-testid="button-generate-caption">
            <Sparkles className="h-4 w-4" />
            Write a Caption
          </Button>
        </CardContent>
      </Card>

      {Object.entries(CONNECTOR_SEGMENTS).filter(([k]) => k !== "social" && k !== "marketing").map(([segKey, seg]) => {
        const connectors = Object.values(SOCIAL_CONNECTOR_REGISTRY).filter(c => c.segment === segKey);
        return (
          <Card key={segKey}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {segKey === "design" ? <Palette className="h-5 w-5 text-pink-500" /> : <Video className="h-5 w-5 text-red-500" />}
                {seg.label}
              </CardTitle>
              <CardDescription>{seg.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {connectors.map((connector) => (
                  <ConnectorCard key={connector.type} connector={connector} />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ConnectorCard({ connector }: { connector: SocialConnectorConfig }) {
  const [voted, setVoted] = useState(false);

  return (
    <div className={`p-4 rounded-lg border ${connector.available ? "bg-background" : "bg-muted/30"}`} data-testid={`card-connector-${connector.type}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm">{connector.name}</h4>
        {!connector.available && (
          <Badge variant="outline" className="text-xs">Coming Soon</Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">{connector.description}</p>
      {connector.available ? (
        <Button variant="outline" size="sm" className="w-full gap-2" data-testid={`button-connect-${connector.type}`}>
          <ExternalLink className="h-3 w-3" />
          Connect
        </Button>
      ) : (
        <Button
          variant={voted ? "default" : "outline"}
          size="sm"
          className="w-full gap-2"
          onClick={() => setVoted(true)}
          disabled={voted}
          data-testid={`button-vote-${connector.type}`}
        >
          <ThumbsUp className="h-3 w-3" />
          {voted ? "Voted!" : "Vote for this"}
        </Button>
      )}
    </div>
  );
}

function PostsTab({ posts, isLoading, statusFilter, onFilterChange, onCreatePost, queryClient, toast }: {
  posts: SocialPost[];
  isLoading: boolean;
  statusFilter: string;
  onFilterChange: (v: string) => void;
  onCreatePost: () => void;
  queryClient: any;
  toast: any;
}) {
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/social-posts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      toast({ title: "Post deleted" });
    },
    onError: () => toast({ title: "Failed to delete post", variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/social-posts/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      toast({ title: "Post published" });
    },
    onError: () => toast({ title: "Failed to publish post", variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-lg font-semibold">Post Queue</h2>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={onFilterChange}>
            <SelectTrigger className="w-[140px]" data-testid="select-post-filter">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Posts</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={onCreatePost} size="sm" className="gap-2" data-testid="button-create-post">
            <Plus className="h-4 w-4" /> Compose
          </Button>
        </div>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Send className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No posts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a strategy first, then convert it to posts — or compose directly
            </p>
            <Button onClick={onCreatePost} className="gap-2" data-testid="button-empty-create-post">
              <Plus className="h-4 w-4" /> Compose a Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {posts.map((post) => {
            const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusCfg.icon;
            return (
              <Card key={post.id} data-testid={`card-post-${post.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={statusCfg.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </Badge>
                        {post.scheduledAt && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(post.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2">{post.content}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.platforms.map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {PLATFORM_NAMES[p] || p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(post.status === "draft" || post.status === "scheduled") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => publishMutation.mutate(post.id)}
                          disabled={publishMutation.isPending}
                          data-testid={`button-publish-post-${post.id}`}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(post.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-post-${post.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ analytics, isLoading }: { analytics: any; isLoading: boolean }) {
  if (isLoading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  }

  const summary = analytics?.summary || {};
  const platformData = analytics?.platformBreakdown || [];

  const chartData = platformData.map((p: any) => ({
    name: PLATFORM_NAMES[p.platform] || p.platform,
    reach: Number(p.reach) || 0,
    engagement: Number(p.engagement) || 0,
    clicks: Number(p.clicks) || 0,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Traffic Analytics</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-500 opacity-70" />
              <div>
                <p className="text-xs text-muted-foreground">Total Reach</p>
                <p className="text-2xl font-bold" data-testid="text-total-reach">
                  {Number(summary.totalReach || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-pink-500 opacity-70" />
              <div>
                <p className="text-xs text-muted-foreground">Engagement</p>
                <p className="text-2xl font-bold" data-testid="text-total-engagement">
                  {Number(summary.totalEngagement || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MousePointerClick className="h-8 w-8 text-green-500 opacity-70" />
              <div>
                <p className="text-xs text-muted-foreground">Clicks</p>
                <p className="text-2xl font-bold" data-testid="text-total-clicks">
                  {Number(summary.totalClicks || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Share2 className="h-8 w-8 text-violet-500 opacity-70" />
              <div>
                <p className="text-xs text-muted-foreground">Shares</p>
                <p className="text-2xl font-bold" data-testid="text-total-shares">
                  {Number(summary.totalShares || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="reach" fill="#3b82f6" name="Reach" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="engagement" fill="#8b5cf6" name="Engagement" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clicks" fill="#06b6d4" name="Clicks" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No analytics data yet</h3>
            <p className="text-sm text-muted-foreground">
              Publish posts and connect your social accounts to see performance data
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CreateStrategyDialog({ open, onOpenChange, queryClient, toast }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  queryClient: any;
  toast: any;
}) {
  const [title, setTitle] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [goals, setGoals] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [timeframe, setTimeframe] = useState("1 month");
  const [tone, setTone] = useState("professional");

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/social-strategies", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-strategies"] });
      toast({ title: "Strategy created successfully!" });
      onOpenChange(false);
      setTitle(""); setBusinessType(""); setGoals(""); setSelectedPlatforms([]); setBudget("");
    },
    onError: (err: any) => toast({ title: err.message || "Failed to create strategy", variant: "destructive" }),
  });

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            Create Marketing Strategy
          </DialogTitle>
          <DialogDescription>
            AI will generate a 6-section strategy with content calendar and creative briefs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Strategy Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q1 Restaurant Launch"
              data-testid="input-strategy-title"
            />
          </div>
          <div>
            <Label>Business Type</Label>
            <Input
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="e.g. Italian restaurant, SaaS startup, fitness studio"
              data-testid="input-business-type"
            />
          </div>
          <div>
            <Label>Goals</Label>
            <Textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g. Increase brand awareness, drive foot traffic, grow followers to 10k"
              rows={3}
              data-testid="input-goals"
            />
          </div>
          <div>
            <Label>Target Platforms</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(PLATFORM_NAMES).map(([key, name]) => (
                <Badge
                  key={key}
                  variant={selectedPlatforms.includes(key) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => togglePlatform(key)}
                  data-testid={`badge-platform-${key}`}
                >
                  {name}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Budget (optional)</Label>
              <Input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. £500/month"
                data-testid="input-budget"
              />
            </div>
            <div>
              <Label>Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger data-testid="select-timeframe">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1 week">1 Week</SelectItem>
                  <SelectItem value="2 weeks">2 Weeks</SelectItem>
                  <SelectItem value="1 month">1 Month</SelectItem>
                  <SelectItem value="3 months">3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger data-testid="select-tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
                <SelectItem value="empathetic">Empathetic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Estimated cost</p>
              <p>Strategy generation uses AI (talk-time billed). Approximate cost: ~0.05 minutes talk time.</p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate({
              title, businessType, goals, platforms: selectedPlatforms, budget, timeframe, tone,
            })}
            disabled={createMutation.isPending || !title || !businessType || !goals || selectedPlatforms.length === 0}
            className="gap-2"
            data-testid="button-submit-strategy"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Strategy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewStrategyDialog({ strategy, onClose, queryClient, toast }: {
  strategy: SocialStrategy;
  onClose: () => void;
  queryClient: any;
  toast: any;
}) {
  const content = strategy.strategyContent || {};

  const convertMutation = useMutation({
    mutationFn: () => apiRequest(`/api/social-strategies/${strategy.id}/convert-to-posts`, { method: "POST" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      toast({ title: `Created ${data.count} draft posts from strategy` });
    },
    onError: () => toast({ title: "Failed to convert strategy to posts", variant: "destructive" }),
  });

  return (
    <Dialog open={!!strategy} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{strategy.title}</DialogTitle>
          <DialogDescription>
            {strategy.businessType} · {strategy.platforms.map(p => PLATFORM_NAMES[p] || p).join(", ")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {content.executiveSummary && (
            <section>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-500" /> Executive Summary
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.executiveSummary}</p>
            </section>
          )}

          {content.targetAudience && (
            <section>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" /> Target Audience
              </h3>
              <p className="text-sm text-muted-foreground">{content.targetAudience.demographics}</p>
              {content.targetAudience.personas?.map((p: any, i: number) => (
                <div key={i} className="mt-2 p-2 rounded border bg-muted/30">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
              ))}
            </section>
          )}

          {content.platformPlans && (
            <section>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Globe className="h-4 w-4 text-green-500" /> Platform Plans
              </h3>
              {content.platformPlans.map((plan: any, i: number) => (
                <div key={i} className="mb-3 p-3 rounded border bg-muted/30">
                  <p className="text-sm font-medium">{plan.platform}</p>
                  <p className="text-xs text-muted-foreground">
                    Frequency: {plan.postingFrequency} · Best times: {plan.bestTimes?.join(", ")}
                  </p>
                  {plan.creativeBrief && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Creative brief:</span> {plan.creativeBrief}
                    </p>
                  )}
                </div>
              ))}
            </section>
          )}

          {content.contentCalendar && (
            <section>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-500" /> Content Calendar
              </h3>
              <div className="space-y-2">
                {content.contentCalendar.slice(0, 10).map((item: any, i: number) => (
                  <div key={i} className="p-3 rounded border bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{item.day} · {item.platform}</span>
                      <Badge variant="outline" className="text-xs">{item.contentType}</Badge>
                    </div>
                    <p className="text-sm">{item.topic}</p>
                    {item.captionDraft && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.captionDraft}</p>
                    )}
                    {item.creativeBrief && (
                      <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                        Design: {item.creativeBrief}
                      </p>
                    )}
                    {item.hashtags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.hashtags.map((h: string, j: number) => (
                          <span key={j} className="text-xs text-blue-500">#{h.replace("#", "")}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {content.hashtagBanks && (
            <section>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Hash className="h-4 w-4 text-cyan-500" /> Hashtag Banks
              </h3>
              <div className="space-y-1">
                {content.hashtagBanks.primary && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs font-medium mr-1">Primary:</span>
                    {content.hashtagBanks.primary.map((h: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">#{h.replace("#", "")}</Badge>
                    ))}
                  </div>
                )}
                {content.hashtagBanks.branded && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs font-medium mr-1">Branded:</span>
                    {content.hashtagBanks.branded.map((h: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">#{h.replace("#", "")}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {content.kpiTargets && (
            <section>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> KPI Targets
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(content.kpiTargets).map(([key, val]) => (
                  <div key={key} className="p-2 rounded border bg-muted/30">
                    <p className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                    <p className="text-sm font-medium">{val as string}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {content.rawContent && (
            <section>
              <p className="text-sm whitespace-pre-wrap">{content.rawContent}</p>
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            onClick={() => convertMutation.mutate()}
            disabled={convertMutation.isPending}
            className="gap-2"
            data-testid="button-convert-to-posts"
          >
            {convertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Convert to Posts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreatePostDialog({ open, onOpenChange, queryClient, toast }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  queryClient: any;
  toast: any;
}) {
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/social-posts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social-posts"] });
      toast({ title: "Post created" });
      onOpenChange(false);
      setContent(""); setSelectedPlatforms([]); setScheduledAt("");
    },
    onError: (err: any) => toast({ title: err.message || "Failed to create post", variant: "destructive" }),
  });

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const CHAR_LIMITS: Record<string, number> = {
    twitter: 280,
    linkedin: 3000,
    facebook_instagram: 2200,
    tiktok: 2200,
    youtube: 5000,
  };

  const activeLimit = selectedPlatforms.reduce((min, p) => {
    const limit = CHAR_LIMITS[p];
    return limit && limit < min ? limit : min;
  }, Infinity);

  const isOverLimit = activeLimit !== Infinity && content.length > activeLimit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Compose Post</DialogTitle>
          <DialogDescription>Write your post and select platforms</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Caption</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post caption..."
              rows={5}
              data-testid="input-post-content"
            />
            <div className="flex justify-between mt-1">
              <p className={`text-xs ${isOverLimit ? "text-red-500" : "text-muted-foreground"}`}>
                {content.length} characters
                {activeLimit !== Infinity && ` / ${activeLimit} max`}
              </p>
              {isOverLimit && (
                <p className="text-xs text-red-500">Exceeds character limit for selected platform</p>
              )}
            </div>
          </div>

          <div>
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(PLATFORM_NAMES).map(([key, name]) => (
                <Badge
                  key={key}
                  variant={selectedPlatforms.includes(key) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => togglePlatform(key)}
                  data-testid={`badge-post-platform-${key}`}
                >
                  {name}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Schedule (optional)</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              data-testid="input-schedule-date"
            />
            <p className="text-xs text-muted-foreground mt-1">Leave empty to save as draft</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate({
              content,
              platforms: selectedPlatforms,
              scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
            })}
            disabled={createMutation.isPending || !content || selectedPlatforms.length === 0 || isOverLimit}
            className="gap-2"
            data-testid="button-submit-post"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {scheduledAt ? "Schedule" : "Save Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GenerateCaptionDialog({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("facebook_instagram");
  const [tone, setTone] = useState("professional");
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/social-content/caption", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (data: any) => {
      setResult(data);
    },
    onError: (err: any) => toast({ title: err.message || "Failed to generate caption", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setResult(null); setTopic(""); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-violet-500" />
            AI Caption Writer
          </DialogTitle>
          <DialogDescription>Generate platform-optimised captions with hashtags and CTAs</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Topic / What's the post about?</Label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. New summer menu launch at our Italian restaurant, featuring fresh pasta and local ingredients"
              rows={3}
              data-testid="input-caption-topic"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger data-testid="select-caption-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_NAMES).map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger data-testid="select-caption-tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="humorous">Humorous</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!result && (
            <Button
              onClick={() => generateMutation.mutate({ topic, platform, tone })}
              disabled={generateMutation.isPending || !topic}
              className="w-full gap-2"
              data-testid="button-generate-caption-submit"
            >
              {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Caption
            </Button>
          )}

          {result && (
            <div className="space-y-3">
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <Label className="text-xs">Generated Caption</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap" data-testid="text-generated-caption">{result.caption}</p>
                  {result.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {result.hashtags.map((h: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs text-blue-500">
                          #{h.replace("#", "")}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {result.cta && (
                    <div className="mt-3 p-2 rounded bg-violet-50 dark:bg-violet-950/30">
                      <p className="text-xs font-medium">CTA: {result.cta}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {result.characterCount || result.caption?.length} / {result.maxCharacters} characters · {result.platformName}
                  </p>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setResult(null); }}
                  data-testid="button-regenerate-caption"
                >
                  Try Again
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      result.caption + (result.hashtags?.length ? "\n\n" + result.hashtags.map((h: string) => `#${h.replace("#", "")}`).join(" ") : "")
                    );
                    toast({ title: "Caption copied to clipboard" });
                  }}
                  data-testid="button-copy-caption"
                >
                  Copy Caption
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
