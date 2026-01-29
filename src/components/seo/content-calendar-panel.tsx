"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  Calendar,
  FileText,
  Video,
  HelpCircle,
  BarChart3,
  TrendingUp,
  Target,
  Trash2,
  Edit,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateContentIdeas,
  updateContentIdea,
  deleteContentIdea,
  type ContentIdea,
} from "@/lib/actions/content-calendar";

interface Props {
  storeId: string;
  storeName: string;
  initialIdeas: ContentIdea[];
}

export function ContentCalendarPanel({ storeId, storeName, initialIdeas }: Props) {
  const [ideas, setIdeas] = useState<ContentIdea[]>(initialIdeas);
  const [isGenerating, setIsGenerating] = useState(false);
  const [focusArea, setFocusArea] = useState("");
  const [filter, setFilter] = useState<ContentIdea["status"] | "all">("all");

  const handleGenerateIdeas = async () => {
    setIsGenerating(true);
    try {
      const result = await generateContentIdeas(storeId, {
        count: 10,
        focusArea: focusArea || undefined,
        includeSeasonalContent: true,
      });

      if (result.data) {
        setIdeas((prev) => [...result.data!, ...prev]);
        toast.success(`Generated ${result.data.length} content ideas!`);
      } else {
        toast.error(result.error || "Failed to generate ideas");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateStatus = async (ideaId: string, status: ContentIdea["status"]) => {
    const result = await updateContentIdea(ideaId, { status });
    if (result.success) {
      setIdeas((prev) =>
        prev.map((i) => (i.id === ideaId ? { ...i, status } : i))
      );
      toast.success("Status updated");
    }
  };

  const handleDelete = async (ideaId: string) => {
    const result = await deleteContentIdea(ideaId);
    if (result.success) {
      setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
      toast.success("Idea deleted");
    }
  };

  const filteredIdeas = ideas.filter(
    (idea) => filter === "all" || idea.status === filter
  );

  const getTypeIcon = (type: ContentIdea["type"]) => {
    switch (type) {
      case "blog": return <FileText className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      case "faq": return <HelpCircle className="h-4 w-4" />;
      case "guide": return <FileText className="h-4 w-4" />;
      case "comparison": return <BarChart3 className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: ContentIdea["priority"]) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    }
  };

  const getStatusColor = (status: ContentIdea["status"]) => {
    switch (status) {
      case "idea": return "bg-gray-100 text-gray-800";
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "published": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
    }
  };

  // Stats
  const stats = {
    total: ideas.length,
    ideas: ideas.filter((i) => i.status === "idea").length,
    scheduled: ideas.filter((i) => i.status === "scheduled").length,
    inProgress: ideas.filter((i) => i.status === "in_progress").length,
    published: ideas.filter((i) => i.status === "published").length,
    totalTraffic: ideas.reduce((sum, i) => sum + i.estimatedTraffic, 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ideas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ideas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.ideas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Est. Traffic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalTraffic.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate Ideas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate AI Content Ideas
          </CardTitle>
          <CardDescription>
            AI will analyze your keywords, products, and competitors to suggest content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              placeholder="Optional: Focus area (e.g., 'product guides', 'seasonal content')"
              className="flex-1"
            />
            <Button onClick={handleGenerateIdeas} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Ideas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Ideas Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Content Ideas
              </CardTitle>
              <CardDescription>
                {filteredIdeas.length} content ideas
              </CardDescription>
            </div>
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as typeof filter)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="idea">Ideas</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredIdeas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No content ideas yet. Click "Generate Ideas" to get AI suggestions.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Est. Traffic</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIdeas.map((idea) => (
                  <TableRow key={idea.id}>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        {getTypeIcon(idea.type)}
                        <div>
                          <p className="font-medium text-sm">{idea.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {idea.type}
                            {idea.competitorGap && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Gap
                              </Badge>
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{idea.keyword}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(idea.priority)}>
                        {idea.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        {idea.estimatedTraffic.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {idea.difficulty}/100
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={idea.status}
                        onValueChange={(v) =>
                          handleUpdateStatus(idea.id, v as ContentIdea["status"])
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <Badge className={getStatusColor(idea.status)}>
                            {idea.status.replace("_", " ")}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="idea">Idea</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(idea.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
