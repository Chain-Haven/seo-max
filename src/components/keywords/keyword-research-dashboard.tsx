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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Loader2,
  TrendingUp,
  Target,
  HelpCircle,
  Sparkles,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Plus,
  Trash2,
  Download,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  researchKeywordAction,
  getKeywordSuggestionsAction,
  getQuestionKeywordsAction,
  analyzeSERPAction,
  clusterKeywordsAction,
  deleteKeywordResearch,
} from "@/lib/actions/keyword-research";
import type { KeywordData, KeywordSuggestion, QuestionKeyword } from "@/lib/seo/keyword-research";

interface KeywordResearchDashboardProps {
  storeId: string;
  savedKeywords: Array<{
    keyword: string;
    search_volume: number;
    keyword_difficulty: number;
    cpc: number;
    competition: number;
    search_intent: string;
    serp_features: string[];
    trend_data: number[];
  }>;
  trackedKeywords: Array<{
    keyword: string;
    current_position: number | null;
    search_volume: number | null;
  }>;
}

export function KeywordResearchDashboard({
  storeId,
  savedKeywords,
  trackedKeywords,
}: KeywordResearchDashboardProps) {
  const [activeTab, setActiveTab] = useState("research");
  const [isLoading, setIsLoading] = useState(false);
  
  // Research state
  const [seedKeyword, setSeedKeyword] = useState("");
  const [researchedKeyword, setResearchedKeyword] = useState<KeywordData | null>(null);
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [questions, setQuestions] = useState<QuestionKeyword[]>([]);
  const [clusters, setClusters] = useState<Record<string, KeywordSuggestion[]>>({});
  const [serpAnalysis, setSerpAnalysis] = useState<{
    serpFeatures: string[];
    topResults: Array<{ position: number; url: string; title: string; domain: string }>;
    difficulty: number;
    recommendations: string[];
  } | null>(null);

  // Research a keyword
  const handleResearch = async () => {
    if (!seedKeyword.trim()) {
      toast.error("Please enter a keyword");
      return;
    }

    setIsLoading(true);
    try {
      // Run all research in parallel
      const [keywordResult, suggestionsResult, questionsResult, serpResult] = await Promise.all([
        researchKeywordAction(storeId, seedKeyword),
        getKeywordSuggestionsAction(storeId, seedKeyword, 30),
        getQuestionKeywordsAction(storeId, seedKeyword),
        analyzeSERPAction(storeId, seedKeyword),
      ]);

      if (keywordResult.data) {
        setResearchedKeyword(keywordResult.data);
      }
      if (suggestionsResult.data) {
        setSuggestions(suggestionsResult.data);
      }
      if (questionsResult.data) {
        setQuestions(questionsResult.data);
      }
      if (serpResult.data) {
        setSerpAnalysis(serpResult.data);
      }

      toast.success("Keyword research complete!");
    } catch (error) {
      toast.error("Research failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Cluster keywords
  const handleCluster = async () => {
    if (suggestions.length === 0) {
      toast.error("No keywords to cluster");
      return;
    }

    setIsLoading(true);
    try {
      const result = await clusterKeywordsAction(storeId, suggestions);
      if (result.data) {
        setClusters(result.data);
        toast.success("Keywords clustered!");
      }
    } catch {
      toast.error("Clustering failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete saved keyword
  const handleDelete = async (keyword: string) => {
    const result = await deleteKeywordResearch(storeId, keyword);
    if (result.success) {
      toast.success("Keyword deleted");
    } else {
      toast.error(result.error || "Delete failed");
    }
  };

  // Export to CSV
  const handleExport = () => {
    const data = savedKeywords.map((k) => ({
      keyword: k.keyword,
      search_volume: k.search_volume,
      difficulty: k.keyword_difficulty,
      cpc: k.cpc,
      intent: k.search_intent,
    }));

    const csv = [
      Object.keys(data[0] || {}).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "keyword-research.csv";
    a.click();
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 30) return "text-green-500";
    if (difficulty <= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 30) return "Easy";
    if (difficulty <= 60) return "Medium";
    return "Hard";
  };

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case "transactional":
        return "💰";
      case "commercial":
        return "🛒";
      case "informational":
        return "📚";
      case "navigational":
        return "🧭";
      default:
        return "📌";
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList>
        <TabsTrigger value="research" className="gap-2">
          <Search className="h-4 w-4" />
          Research
        </TabsTrigger>
        <TabsTrigger value="saved" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Saved ({savedKeywords.length})
        </TabsTrigger>
        <TabsTrigger value="questions" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          Questions
        </TabsTrigger>
        <TabsTrigger value="clusters" className="gap-2">
          <Layers className="h-4 w-4" />
          Clusters
        </TabsTrigger>
      </TabsList>

      {/* Research Tab */}
      <TabsContent value="research" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Keyword Research
            </CardTitle>
            <CardDescription>
              Enter a seed keyword to discover related keywords, search volume, and competition data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  value={seedKeyword}
                  onChange={(e) => setSeedKeyword(e.target.value)}
                  placeholder="Enter a keyword or topic..."
                  onKeyDown={(e) => e.key === "Enter" && handleResearch()}
                />
              </div>
              <Button onClick={handleResearch} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Research
              </Button>
            </div>

            {researchedKeyword && (
              <div className="grid gap-4 md:grid-cols-4 pt-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{formatVolume(researchedKeyword.searchVolume)}</div>
                    <div className="text-sm text-muted-foreground">Monthly Volume</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className={`text-2xl font-bold ${getDifficultyColor(researchedKeyword.keywordDifficulty)}`}>
                      {researchedKeyword.keywordDifficulty}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Difficulty ({getDifficultyLabel(researchedKeyword.keywordDifficulty)})
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">${researchedKeyword.cpc.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Avg. CPC</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold flex items-center gap-1">
                      {getIntentIcon(researchedKeyword.searchIntent)}
                      <span className="capitalize text-lg">{researchedKeyword.searchIntent}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Search Intent</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SERP Analysis */}
        {serpAnalysis && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SERP Features</CardTitle>
              </CardHeader>
              <CardContent>
                {serpAnalysis.serpFeatures.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {serpAnalysis.serpFeatures.map((feature, i) => (
                      <Badge key={i} variant="secondary">
                        {feature.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No special SERP features detected</p>
                )}
                
                {serpAnalysis.recommendations.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Recommendations</p>
                    <ul className="text-sm space-y-1">
                      {serpAnalysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Ranking Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {serpAnalysis.topResults.slice(0, 5).map((result, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <Badge variant="outline" className="w-8 justify-center">
                        #{result.position}
                      </Badge>
                      <div className="flex-1 truncate">
                        <p className="font-medium truncate">{result.title}</p>
                        <p className="text-muted-foreground truncate">{result.domain}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Keyword Suggestions */}
        {suggestions.length > 0 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Related Keywords ({suggestions.length})</CardTitle>
                <CardDescription>Click to add to your tracked keywords</CardDescription>
              </div>
              <Button variant="outline" onClick={handleCluster} disabled={isLoading}>
                <Layers className="mr-2 h-4 w-4" />
                Cluster Keywords
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Keyword</TableHead>
                      <TableHead className="text-right">Volume</TableHead>
                      <TableHead className="text-right">Difficulty</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestions.map((kw, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{kw.keyword}</TableCell>
                        <TableCell className="text-right">{formatVolume(kw.searchVolume)}</TableCell>
                        <TableCell className="text-right">
                          <span className={getDifficultyColor(kw.keywordDifficulty)}>
                            {kw.keywordDifficulty}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => researchKeywordAction(storeId, kw.keyword)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Saved Keywords Tab */}
      <TabsContent value="saved" className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Saved Keywords</CardTitle>
              <CardDescription>Keywords you&apos;ve researched and saved</CardDescription>
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {savedKeywords.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Difficulty</TableHead>
                    <TableHead className="text-right">CPC</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedKeywords.map((kw, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{kw.keyword}</TableCell>
                      <TableCell className="text-right">{formatVolume(kw.search_volume)}</TableCell>
                      <TableCell className="text-right">
                        <span className={getDifficultyColor(kw.keyword_difficulty)}>
                          {kw.keyword_difficulty}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">${kw.cpc.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getIntentIcon(kw.search_intent)} {kw.search_intent}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(kw.keyword)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No saved keywords yet. Start by researching a keyword above.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Questions Tab */}
      <TabsContent value="questions" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Question-Based Keywords
            </CardTitle>
            <CardDescription>
              Questions people are asking about your topic
            </CardDescription>
          </CardHeader>
          <CardContent>
            {questions.length > 0 ? (
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{q.question}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{formatVolume(q.searchVolume)} searches/mo</span>
                        <span className={getDifficultyColor(q.difficulty)}>
                          {q.difficulty}% difficulty
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Create Content
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Research a keyword to discover question-based opportunities</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Clusters Tab */}
      <TabsContent value="clusters" className="space-y-6">
        {Object.keys(clusters).length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(clusters).map(([clusterName, keywords]) => (
              <Card key={clusterName}>
                <CardHeader>
                  <CardTitle className="text-lg capitalize">{clusterName}</CardTitle>
                  <CardDescription>{keywords.length} keywords</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {keywords.slice(0, 10).map((kw, i) => (
                      <Badge key={i} variant="secondary">
                        {kw.keyword}
                      </Badge>
                    ))}
                    {keywords.length > 10 && (
                      <Badge variant="outline">+{keywords.length - 10} more</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Research keywords and click &quot;Cluster Keywords&quot; to group them</p>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
