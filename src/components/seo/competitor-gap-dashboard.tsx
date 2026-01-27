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
  Target,
  Loader2,
  Plus,
  X,
  TrendingUp,
  Zap,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { analyzeCompetitorGapsAction } from "@/lib/actions/advanced-seo";

interface CompetitorGapDashboardProps {
  storeId: string;
  gaps: Array<{
    keyword: string;
    competitor_position: number;
    your_position: number | null;
    search_volume: number;
    keyword_difficulty: number;
    opportunity_score: number;
  }>;
}

export function CompetitorGapDashboard({
  storeId,
  gaps: initialGaps,
}: CompetitorGapDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [newCompetitor, setNewCompetitor] = useState("");
  const [gaps, setGaps] = useState(initialGaps);

  const addCompetitor = () => {
    if (newCompetitor && !competitors.includes(newCompetitor)) {
      setCompetitors([...competitors, newCompetitor]);
      setNewCompetitor("");
    }
  };

  const removeCompetitor = (domain: string) => {
    setCompetitors(competitors.filter((c) => c !== domain));
  };

  const handleAnalyze = async () => {
    if (competitors.length === 0) {
      toast.error("Add at least one competitor");
      return;
    }

    setIsLoading(true);
    try {
      const result = await analyzeCompetitorGapsAction(storeId, competitors);
      if (result.data) {
        toast.success(
          `Found ${result.data.allGaps.length} keyword opportunities worth $${result.data.totalOpportunityValue}/month`
        );
        // Refresh to get updated data
        window.location.reload();
      } else {
        toast.error(result.error || "Analysis failed");
      }
    } catch {
      toast.error("Analysis failed");
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (score: number, difficulty: number) => {
    if (score >= 70 && difficulty <= 50) return "bg-green-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-gray-500";
  };

  const quickWins = gaps.filter(
    (g) => g.keyword_difficulty <= 40 && g.your_position === null && g.search_volume >= 100
  );

  const highValue = gaps.filter((g) => g.search_volume >= 1000);

  return (
    <div className="space-y-6">
      {/* Add Competitors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Competitor Gap Analysis
          </CardTitle>
          <CardDescription>
            Find keywords your competitors rank for that you don&apos;t
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="competitor">Competitor Domain</Label>
              <Input
                id="competitor"
                value={newCompetitor}
                onChange={(e) => setNewCompetitor(e.target.value)}
                placeholder="competitor.com"
                onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addCompetitor} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {competitors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {competitors.map((domain) => (
                <Badge key={domain} variant="secondary" className="gap-1">
                  {domain}
                  <button onClick={() => removeCompetitor(domain)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <Button onClick={handleAnalyze} disabled={isLoading || competitors.length === 0}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Target className="mr-2 h-4 w-4" />
            )}
            Analyze Competitors
          </Button>
        </CardContent>
      </Card>

      {/* Summary */}
      {gaps.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{gaps.length}</div>
                  <div className="text-sm text-muted-foreground">Total Opportunities</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-green-600">{quickWins.length}</div>
                  <div className="text-sm text-muted-foreground">Quick Wins</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold text-purple-600">{highValue.length}</div>
                  <div className="text-sm text-muted-foreground">High Value (1K+ vol)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Wins */}
      {quickWins.length > 0 && (
        <Card className="border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Zap className="h-5 w-5" />
              Quick Wins
            </CardTitle>
            <CardDescription>
              Low difficulty keywords you&apos;re not ranking for yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Difficulty</TableHead>
                  <TableHead className="text-right">Competitor Pos</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quickWins.slice(0, 10).map((gap, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{gap.keyword}</TableCell>
                    <TableCell className="text-right">{gap.search_volume.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="bg-green-500/20 text-green-700">
                        {gap.keyword_difficulty}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">#{gap.competitor_position}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={getPriorityColor(gap.opportunity_score, gap.keyword_difficulty)}>
                        {gap.opportunity_score}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Gaps */}
      {gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Keyword Gaps ({gaps.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Difficulty</TableHead>
                    <TableHead className="text-right">Their Pos</TableHead>
                    <TableHead className="text-right">Your Pos</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gaps.map((gap, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{gap.keyword}</TableCell>
                      <TableCell className="text-right">{gap.search_volume.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{gap.keyword_difficulty}%</TableCell>
                      <TableCell className="text-right">#{gap.competitor_position}</TableCell>
                      <TableCell className="text-right">
                        {gap.your_position ? `#${gap.your_position}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={getPriorityColor(gap.opportunity_score, gap.keyword_difficulty)}>
                          {gap.opportunity_score}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {gaps.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No competitor gaps analyzed yet</p>
              <p className="text-sm">Add competitors above and click Analyze</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
