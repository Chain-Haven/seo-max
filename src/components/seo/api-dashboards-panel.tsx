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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Link as LinkIcon,
  Globe,
  Target,
  BarChart3,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  searchSerpApi,
  getDataForSEOKeywordData,
  getDataForSEOCompetitors,
  getMozDomainMetrics,
  getAhrefsBacklinks,
  getAhrefsDomainMetrics,
  getSemrushKeywordOverview,
  type CompetitorData as APICompetitorData,
} from "@/lib/actions/seo-apis";

interface Props {
  storeId: string;
  storeName: string;
  storeUrl: string;
}

// SerpAPI Data Types - matching SerpAnalysisResult from seo-apis.ts
interface SerpResult {
  position: number;
  title: string;
  link: string;
  domain: string;
  snippet: string;
}

interface SerpData {
  keyword: string;
  searchVolume: number | null;
  difficulty: number | null;
  cpc: number | null;
  results: SerpResult[];
  featuredSnippet: {
    exists: boolean;
    type?: string;
    content?: string;
  };
  peopleAlsoAsk: string[];
  relatedSearches: string[];
  localPack: boolean;
  imageCarousel: boolean;
  videoCarousel: boolean;
  knowledgePanel: boolean;
  timestamp: string;
}

// DataForSEO Types - matching actual API return
interface KeywordData {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
  difficulty: number;
}

// Use the imported CompetitorData type from seo-apis.ts
// CompetitorData has: domain, metrics (DomainMetrics), commonKeywords, keywordGap, trafficShare

// Moz Types
interface MozData {
  domainAuthority: number;
  pageAuthority: number;
  totalBacklinks: number;
  referringDomains: number;
  spamScore: number;
}

// Ahrefs Types - matching BacklinkData and DomainMetrics from seo-apis.ts
interface AhrefsBacklink {
  sourceUrl: string;
  sourceDomain: string;
  anchorText: string;
  domainAuthority: number;
  pageAuthority: number;
  dofollow: boolean;
}

// DomainMetrics interface from seo-apis.ts
interface AhrefsDomainData {
  domainAuthority: number;
  pageAuthority: number;
  totalBacklinks: number;
  referringDomains: number;
  organicTraffic: number | null;
  organicKeywords: number | null;
  spamScore: number;
}

// Semrush Types
interface SemrushData {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
  difficulty: number;
  trend: number[];
}

export function APIDashboardsPanel({ storeId, storeName, storeUrl }: Props) {
  const domain = new URL(storeUrl).hostname.replace("www.", "");
  
  // State for each API
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [keyword, setKeyword] = useState("");
  
  // SerpAPI state
  const [serpData, setSerpData] = useState<SerpData | null>(null);
  
  // DataForSEO state
  const [keywordData, setKeywordData] = useState<KeywordData | null>(null);
  const [competitors, setCompetitors] = useState<APICompetitorData[]>([]);
  
  // Moz state
  const [mozData, setMozData] = useState<MozData | null>(null);
  
  // Ahrefs state
  const [ahrefsBacklinks, setAhrefsBacklinks] = useState<AhrefsBacklink[]>([]);
  const [ahrefsDomain, setAhrefsDomain] = useState<AhrefsDomainData | null>(null);
  
  // Semrush state
  const [semrushData, setSemrushData] = useState<SemrushData | null>(null);

  // API Fetch Functions
  const fetchSerpAPI = async () => {
    if (!keyword) {
      toast.error("Please enter a keyword");
      return;
    }
    setIsLoading(prev => ({ ...prev, serp: true }));
    try {
      const result = await searchSerpApi(keyword, { storeId });
      if (result.data) {
        setSerpData(result.data);
        toast.success("SERP data loaded");
      } else {
        toast.error(result.error || "Failed to fetch SERP data");
      }
    } catch {
      toast.error("Error fetching SERP data");
    } finally {
      setIsLoading(prev => ({ ...prev, serp: false }));
    }
  };

  const fetchDataForSEO = async () => {
    if (!keyword) {
      toast.error("Please enter a keyword");
      return;
    }
    setIsLoading(prev => ({ ...prev, dataforseo: true }));
    try {
      const [kwResult, compResult] = await Promise.all([
        getDataForSEOKeywordData([keyword]),
        getDataForSEOCompetitors(domain),
      ]);
      
      if (kwResult.data && kwResult.data.length > 0) setKeywordData(kwResult.data[0]);
      if (compResult.data) setCompetitors(compResult.data);
      
      toast.success("DataForSEO data loaded");
    } catch {
      toast.error("Error fetching DataForSEO data");
    } finally {
      setIsLoading(prev => ({ ...prev, dataforseo: false }));
    }
  };

  const fetchMoz = async () => {
    setIsLoading(prev => ({ ...prev, moz: true }));
    try {
      const result = await getMozDomainMetrics(domain);
      if (result.data) {
        setMozData(result.data);
        toast.success("Moz data loaded");
      } else {
        toast.error(result.error || "Failed to fetch Moz data");
      }
    } catch {
      toast.error("Error fetching Moz data");
    } finally {
      setIsLoading(prev => ({ ...prev, moz: false }));
    }
  };

  const fetchAhrefs = async () => {
    setIsLoading(prev => ({ ...prev, ahrefs: true }));
    try {
      const [blResult, domainResult] = await Promise.all([
        getAhrefsBacklinks(domain, { limit: 20 }),
        getAhrefsDomainMetrics(domain),
      ]);
      
      if (blResult.data) setAhrefsBacklinks(blResult.data);
      if (domainResult.data) setAhrefsDomain(domainResult.data);
      
      toast.success("Ahrefs data loaded");
    } catch {
      toast.error("Error fetching Ahrefs data");
    } finally {
      setIsLoading(prev => ({ ...prev, ahrefs: false }));
    }
  };

  const fetchSemrush = async () => {
    if (!keyword) {
      toast.error("Please enter a keyword");
      return;
    }
    setIsLoading(prev => ({ ...prev, semrush: true }));
    try {
      const result = await getSemrushKeywordOverview([keyword]);
      if (result.data && result.data.length > 0) {
        setSemrushData(result.data[0]);
        toast.success("Semrush data loaded");
      } else {
        toast.error(result.error || "Failed to fetch Semrush data");
      }
    } catch {
      toast.error("Error fetching Semrush data");
    } finally {
      setIsLoading(prev => ({ ...prev, semrush: false }));
    }
  };

  const fetchAllAPIs = async () => {
    await Promise.all([
      fetchMoz(),
      fetchAhrefs(),
      keyword ? fetchSerpAPI() : Promise.resolve(),
      keyword ? fetchDataForSEO() : Promise.resolve(),
      keyword ? fetchSemrush() : Promise.resolve(),
    ]);
  };

  const getAPIStatus = (envKey: string) => {
    // In client, we can't check env vars, so we'll infer from data
    return true; // Assume connected if we got data
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter keyword for SERP, keyword data, and competitive analysis..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && fetchAllAPIs()}
            />
            <Button onClick={fetchAllAPIs} disabled={Object.values(isLoading).some(Boolean)}>
              {Object.values(isLoading).some(Boolean) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Fetch All APIs
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Domain: <span className="font-medium">{domain}</span>
          </p>
        </CardContent>
      </Card>

      {/* API Tabs */}
      <Tabs defaultValue="serp">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="serp">SerpAPI</TabsTrigger>
          <TabsTrigger value="dataforseo">DataForSEO</TabsTrigger>
          <TabsTrigger value="moz">Moz</TabsTrigger>
          <TabsTrigger value="ahrefs">Ahrefs</TabsTrigger>
          <TabsTrigger value="semrush">Semrush</TabsTrigger>
        </TabsList>

        {/* SerpAPI Tab */}
        <TabsContent value="serp">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-green-600" />
                    SerpAPI - Search Results
                  </CardTitle>
                  <CardDescription>
                    Real-time Google search results and SERP features
                  </CardDescription>
                </div>
                <Button onClick={fetchSerpAPI} disabled={isLoading.serp} variant="outline">
                  {isLoading.serp ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!serpData ? (
                <div className="text-center py-8 text-muted-foreground">
                  Enter a keyword and click "Fetch All APIs" to see SERP data
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Keyword Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 border rounded">
                      <p className="text-2xl font-bold text-green-600">{serpData.searchVolume?.toLocaleString() || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">Search Volume</p>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-2xl font-bold text-orange-600">{serpData.difficulty || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">Difficulty</p>
                    </div>
                    <div className="text-center p-3 border rounded">
                      <p className="text-2xl font-bold text-blue-600">${serpData.cpc?.toFixed(2) || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">CPC</p>
                    </div>
                  </div>

                  {/* SERP Features */}
                  <div>
                    <h4 className="font-medium mb-2">SERP Features Detected</h4>
                    <div className="flex flex-wrap gap-2">
                      {serpData.featuredSnippet.exists && <Badge variant="secondary">Featured Snippet</Badge>}
                      {serpData.localPack && <Badge variant="secondary">Local Pack</Badge>}
                      {serpData.imageCarousel && <Badge variant="secondary">Images</Badge>}
                      {serpData.videoCarousel && <Badge variant="secondary">Videos</Badge>}
                      {serpData.knowledgePanel && <Badge variant="secondary">Knowledge Panel</Badge>}
                      {serpData.peopleAlsoAsk.length > 0 && <Badge variant="secondary">People Also Ask</Badge>}
                    </div>
                  </div>

                  {/* Organic Results */}
                  <div>
                    <h4 className="font-medium mb-2">Organic Results</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Domain</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {serpData.results.slice(0, 10).map((result, i) => (
                          <TableRow key={i} className={result.domain.includes(domain) ? "bg-green-50 dark:bg-green-900/20" : ""}>
                            <TableCell className="font-bold">{result.position}</TableCell>
                            <TableCell>
                              <a href={result.link} target="_blank" rel="noopener noreferrer" className="hover:text-primary flex items-center gap-1">
                                {result.title}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{result.snippet}</p>
                            </TableCell>
                            <TableCell>
                              {result.domain.includes(domain) ? (
                                <Badge className="bg-green-500">Your Site</Badge>
                              ) : (
                                result.domain
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* People Also Ask */}
                  {serpData.peopleAlsoAsk.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">People Also Ask</h4>
                      <ul className="space-y-1">
                        {serpData.peopleAlsoAsk.map((q, i) => (
                          <li key={i} className="text-sm p-2 border rounded">{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Related Searches */}
                  {serpData.relatedSearches.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Related Searches</h4>
                      <div className="flex flex-wrap gap-2">
                        {serpData.relatedSearches.map((search, i) => (
                          <Badge key={i} variant="outline">{search}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DataForSEO Tab */}
        <TabsContent value="dataforseo">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    DataForSEO - Keywords & Competitors
                  </CardTitle>
                  <CardDescription>
                    Keyword metrics and competitor analysis
                  </CardDescription>
                </div>
                <Button onClick={fetchDataForSEO} disabled={isLoading.dataforseo} variant="outline">
                  {isLoading.dataforseo ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!keywordData && competitors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Enter a keyword and click "Fetch All APIs" to see keyword data
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Keyword Data */}
                  {keywordData && (
                    <div>
                      <h4 className="font-medium mb-3">Keyword: "{keywordData.keyword}"</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center p-3 border rounded">
                          <p className="text-2xl font-bold text-blue-600">{keywordData.searchVolume.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Monthly Volume</p>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <p className="text-2xl font-bold text-green-600">${keywordData.cpc.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">CPC</p>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <p className="text-2xl font-bold">{Math.round(keywordData.competition * 100)}%</p>
                          <p className="text-xs text-muted-foreground">Competition</p>
                        </div>
                        <div className="text-center p-3 border rounded">
                          <p className="text-2xl font-bold text-orange-600">{keywordData.difficulty}</p>
                          <p className="text-xs text-muted-foreground">Difficulty</p>
                          <Progress value={keywordData.difficulty} className="h-2 mt-2" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Competitors */}
                  {competitors.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Top Competitors</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Domain</TableHead>
                            <TableHead>DA</TableHead>
                            <TableHead>Traffic</TableHead>
                            <TableHead>Common Keywords</TableHead>
                            <TableHead>Traffic Share</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {competitors.map((comp, i) => (
                            <TableRow key={i} className={comp.domain.includes(domain) ? "bg-green-50 dark:bg-green-900/20" : ""}>
                              <TableCell className="font-medium">
                                {comp.domain}
                                {comp.domain.includes(domain) && (
                                  <Badge className="ml-2 bg-green-500">You</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={comp.metrics.domainAuthority >= 50 ? "default" : "secondary"}>
                                  {comp.metrics.domainAuthority}
                                </Badge>
                              </TableCell>
                              <TableCell>{comp.metrics.organicTraffic?.toLocaleString() || "N/A"}</TableCell>
                              <TableCell>{comp.commonKeywords.toLocaleString()}</TableCell>
                              <TableCell>
                                <Progress value={comp.trafficShare * 100} className="h-2 w-20" />
                                {Math.round(comp.trafficShare * 100)}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Moz Tab */}
        <TabsContent value="moz">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-purple-600" />
                    Moz - Domain Metrics
                  </CardTitle>
                  <CardDescription>
                    Domain Authority, backlinks, and spam score
                  </CardDescription>
                </div>
                <Button onClick={fetchMoz} disabled={isLoading.moz} variant="outline">
                  {isLoading.moz ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!mozData ? (
                <div className="text-center py-8 text-muted-foreground">
                  Click refresh to load Moz data for {domain}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 border rounded bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                    <p className="text-4xl font-bold text-purple-600">{mozData.domainAuthority}</p>
                    <p className="text-sm text-muted-foreground">Domain Authority</p>
                    <Progress value={mozData.domainAuthority} className="h-2 mt-2" />
                  </div>
                  <div className="text-center p-4 border rounded">
                    <p className="text-4xl font-bold text-blue-600">{mozData.pageAuthority}</p>
                    <p className="text-sm text-muted-foreground">Page Authority</p>
                    <Progress value={mozData.pageAuthority} className="h-2 mt-2" />
                  </div>
                  <div className="text-center p-4 border rounded">
                    <p className="text-4xl font-bold">{mozData.totalBacklinks.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Backlinks</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <p className="text-4xl font-bold">{mozData.referringDomains.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Referring Domains</p>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <p className={`text-4xl font-bold ${mozData.spamScore > 30 ? "text-red-600" : mozData.spamScore > 10 ? "text-yellow-600" : "text-green-600"}`}>
                      {mozData.spamScore}%
                    </p>
                    <p className="text-sm text-muted-foreground">Spam Score</p>
                    {mozData.spamScore <= 10 && (
                      <Badge className="mt-2 bg-green-100 text-green-800">Low Risk</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ahrefs Tab */}
        <TabsContent value="ahrefs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-orange-600" />
                    Ahrefs - Backlinks & Domain Rating
                  </CardTitle>
                  <CardDescription>
                    Backlink profile and organic traffic data
                  </CardDescription>
                </div>
                <Button onClick={fetchAhrefs} disabled={isLoading.ahrefs} variant="outline">
                  {isLoading.ahrefs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!ahrefsDomain && ahrefsBacklinks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Click refresh to load Ahrefs data for {domain}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Domain Metrics */}
                  {ahrefsDomain && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-4 border rounded bg-gradient-to-br from-orange-500/10 to-orange-500/5">
                        <p className="text-4xl font-bold text-orange-600">{ahrefsDomain.domainAuthority}</p>
                        <p className="text-sm text-muted-foreground">Domain Authority</p>
                        <Progress value={ahrefsDomain.domainAuthority} className="h-2 mt-2" />
                      </div>
                      <div className="text-center p-4 border rounded">
                        <p className="text-4xl font-bold">{ahrefsDomain.totalBacklinks.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Backlinks</p>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <p className="text-4xl font-bold">{ahrefsDomain.referringDomains.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Ref. Domains</p>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <p className="text-4xl font-bold text-green-600">{ahrefsDomain.organicTraffic?.toLocaleString() || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">Organic Traffic</p>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <p className="text-4xl font-bold">{ahrefsDomain.organicKeywords?.toLocaleString() || "N/A"}</p>
                        <p className="text-sm text-muted-foreground">Organic Keywords</p>
                      </div>
                    </div>
                  )}

                  {/* Backlinks */}
                  {ahrefsBacklinks.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Top Backlinks</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Source</TableHead>
                            <TableHead>Anchor</TableHead>
                            <TableHead>DA</TableHead>
                            <TableHead>Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ahrefsBacklinks.slice(0, 15).map((bl, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <a href={bl.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary flex items-center gap-1 text-sm">
                                  {bl.sourceDomain}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">{bl.anchorText}</TableCell>
                              <TableCell>
                                <Badge variant={bl.domainAuthority >= 50 ? "default" : "secondary"}>
                                  {bl.domainAuthority}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {bl.dofollow ? (
                                  <Badge className="bg-green-100 text-green-800">DoFollow</Badge>
                                ) : (
                                  <Badge variant="secondary">NoFollow</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Semrush Tab */}
        <TabsContent value="semrush">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-red-600" />
                    Semrush - Keyword Overview
                  </CardTitle>
                  <CardDescription>
                    Keyword analytics and trend data
                  </CardDescription>
                </div>
                <Button onClick={fetchSemrush} disabled={isLoading.semrush} variant="outline">
                  {isLoading.semrush ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!semrushData ? (
                <div className="text-center py-8 text-muted-foreground">
                  Enter a keyword and click "Fetch All APIs" to see Semrush data
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-medium">Keyword: "{semrushData.keyword}"</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 border rounded bg-gradient-to-br from-red-500/10 to-red-500/5">
                      <p className="text-4xl font-bold text-red-600">{semrushData.searchVolume.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Search Volume</p>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <p className="text-4xl font-bold text-green-600">${semrushData.cpc.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">CPC</p>
                    </div>
                    <div className="text-center p-4 border rounded">
                      <p className="text-4xl font-bold">{Math.round(semrushData.competition * 100)}%</p>
                      <p className="text-sm text-muted-foreground">Competition</p>
                      <Progress value={semrushData.competition * 100} className="h-2 mt-2" />
                    </div>
                    <div className="text-center p-4 border rounded">
                      <p className="text-4xl font-bold text-orange-600">{semrushData.difficulty}</p>
                      <p className="text-sm text-muted-foreground">Difficulty</p>
                      <Progress value={semrushData.difficulty} className="h-2 mt-2" />
                    </div>
                    <div className="text-center p-4 border rounded">
                      <div className="flex justify-center gap-1 h-8">
                        {semrushData.trend.map((val, i) => (
                          <div
                            key={i}
                            className="w-2 bg-primary rounded-t"
                            style={{ height: `${(val / Math.max(...semrushData.trend)) * 100}%`, marginTop: 'auto' }}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">12-Month Trend</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
