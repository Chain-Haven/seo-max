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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Globe,
  MapPin,
  Smartphone,
  Monitor,
  Image as ImageIcon,
  Video,
  HelpCircle,
  Star,
  TrendingUp,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Target,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  searchSerpApi,
  type SerpAnalysisResult,
} from "@/lib/actions/seo-apis";

interface Props {
  storeId: string;
  storeUrl: string;
  trackedKeywords: string[];
}

export function SerpAnalysisPanel({ storeId, storeUrl, trackedKeywords }: Props) {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("United States");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SerpAnalysisResult | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);

  const siteDomain = new URL(storeUrl).hostname;

  const handleSearch = async () => {
    if (!keyword.trim()) {
      toast.error("Please enter a keyword");
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchSerpApi(keyword, {
        location,
        device,
        storeId,
      });

      if (response.data) {
        setResult(response.data);
        toast.success("SERP analysis complete");
      } else {
        toast.error(response.error || "Failed to analyze SERP");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickSearch = (kw: string) => {
    setKeyword(kw);
    handleSearch();
  };

  // Check if our site ranks
  const ourRanking = result?.results.find((r) =>
    r.domain.includes(siteDomain.replace("www.", ""))
  );

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Analyze SERP
          </CardTitle>
          <CardDescription>
            Enter a keyword to analyze the search engine results page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter keyword to analyze..."
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Select value={device} onValueChange={(v) => setDevice(v as "desktop" | "mobile")}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desktop">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Desktop
                  </div>
                </SelectItem>
                <SelectItem value="mobile">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Mobile
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Analyze
            </Button>
          </div>

          {/* Quick search from tracked keywords */}
          {trackedKeywords.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Quick search from tracked keywords:
              </p>
              <div className="flex flex-wrap gap-2">
                {trackedKeywords.slice(0, 10).map((kw) => (
                  <Button
                    key={kw}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setKeyword(kw);
                    }}
                  >
                    {kw}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            {/* Our Ranking */}
            <Card className={ourRanking ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Your Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${ourRanking ? "text-green-600" : "text-red-600"}`}>
                  {ourRanking ? `#${ourRanking.position}` : "Not Found"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {ourRanking ? `On page ${Math.ceil(ourRanking.position / 10)}` : "Not in top 20"}
                </p>
              </CardContent>
            </Card>

            {/* Search Volume */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Est. Search Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {result.searchVolume?.toLocaleString() || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">Monthly searches</p>
              </CardContent>
            </Card>

            {/* Difficulty */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Difficulty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {result.difficulty ?? "N/A"}
                  {result.difficulty !== null && <span className="text-lg text-muted-foreground">/100</span>}
                </div>
                <Progress value={result.difficulty || 0} className="h-2 mt-2" />
              </CardContent>
            </Card>

            {/* CPC */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Est. CPC
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {result.cpc ? `$${result.cpc.toFixed(2)}` : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">Cost per click</p>
              </CardContent>
            </Card>
          </div>

          {/* SERP Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">SERP Features</CardTitle>
              <CardDescription>
                Special features appearing on this search results page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.featuredSnippet.exists && (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    <Star className="mr-1 h-3 w-3" />
                    Featured Snippet
                  </Badge>
                )}
                {result.knowledgePanel && (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    <Globe className="mr-1 h-3 w-3" />
                    Knowledge Panel
                  </Badge>
                )}
                {result.localPack && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <MapPin className="mr-1 h-3 w-3" />
                    Local Pack
                  </Badge>
                )}
                {result.imageCarousel && (
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                    <ImageIcon className="mr-1 h-3 w-3" />
                    Images
                  </Badge>
                )}
                {result.videoCarousel && (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <Video className="mr-1 h-3 w-3" />
                    Videos
                  </Badge>
                )}
                {result.peopleAlsoAsk.length > 0 && (
                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                    <HelpCircle className="mr-1 h-3 w-3" />
                    People Also Ask ({result.peopleAlsoAsk.length})
                  </Badge>
                )}
              </div>

              {/* Featured Snippet Content */}
              {result.featuredSnippet.exists && result.featuredSnippet.content && (
                <div className="mt-4 p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-sm font-medium mb-2">Featured Snippet:</p>
                  <p className="text-sm text-muted-foreground">
                    {result.featuredSnippet.content}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organic Results */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Organic Results</CardTitle>
                  <CardDescription>
                    Top {showAllResults ? result.results.length : 10} ranking pages
                  </CardDescription>
                </div>
                {result.results.length > 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllResults(!showAllResults)}
                  >
                    {showAllResults ? (
                      <>
                        <ChevronUp className="mr-1 h-4 w-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-1 h-4 w-4" />
                        Show All
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Pos</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(showAllResults ? result.results : result.results.slice(0, 10)).map(
                    (item) => {
                      const isOurs = item.domain.includes(
                        siteDomain.replace("www.", "")
                      );
                      return (
                        <TableRow
                          key={item.position}
                          className={isOurs ? "bg-green-50 dark:bg-green-900/20" : ""}
                        >
                          <TableCell>
                            <Badge
                              variant={
                                item.position <= 3
                                  ? "default"
                                  : item.position <= 10
                                  ? "secondary"
                                  : "outline"
                              }
                              className={
                                item.position === 1
                                  ? "bg-amber-500"
                                  : item.position === 2
                                  ? "bg-gray-400"
                                  : item.position === 3
                                  ? "bg-amber-700"
                                  : ""
                              }
                            >
                              #{item.position}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm line-clamp-1">
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {item.snippet}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isOurs && (
                                <Badge variant="default" className="bg-green-600 text-xs">
                                  Your Site
                                </Badge>
                              )}
                              <span className="text-sm text-muted-foreground">
                                {item.domain}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          </TableCell>
                        </TableRow>
                      );
                    }
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* People Also Ask & Related Searches */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* People Also Ask */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  People Also Ask
                </CardTitle>
                <CardDescription>
                  Questions related to this search query
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result.peopleAlsoAsk.length > 0 ? (
                  <ul className="space-y-2">
                    {result.peopleAlsoAsk.map((question, i) => (
                      <li
                        key={i}
                        className="text-sm p-2 bg-muted rounded-lg flex items-start gap-2"
                      >
                        <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        {question}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No People Also Ask questions found
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Related Searches */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Related Searches
                </CardTitle>
                <CardDescription>
                  Related keywords to consider targeting
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result.relatedSearches.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.relatedSearches.map((search, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={() => setKeyword(search)}
                      >
                        {search}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No related searches found
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
