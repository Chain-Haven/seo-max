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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MousePointer,
  Eye,
  TrendingUp,
  Hash,
  Globe,
  Smartphone,
  Monitor,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getGSCAuthUrl, getGSCPerformanceData, disconnectGSC } from "@/lib/actions/analytics";
import type { GSCPerformanceRow } from "@/lib/integrations/google-search-console";

interface AnalyticsDashboardProps {
  storeId: string;
  isConnected: boolean;
  siteUrl: string | null;
  performanceData: {
    queries: GSCPerformanceRow[];
    pages: GSCPerformanceRow[];
    dates: GSCPerformanceRow[];
    countries: GSCPerformanceRow[];
    devices: GSCPerformanceRow[];
    totals: { clicks: number; impressions: number; ctr: number; position: number };
  } | null;
}

export function AnalyticsDashboard({
  storeId,
  isConnected,
  siteUrl,
  performanceData,
}: AnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState("28");
  const [data, setData] = useState(performanceData);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    const url = await getGSCAuthUrl(storeId);
    window.location.href = url;
  };

  const handleDisconnect = async () => {
    const result = await disconnectGSC(storeId);
    if (result.success) {
      toast.success("Disconnected from Google Search Console");
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to disconnect");
    }
  };

  const handleDateRangeChange = async (days: string) => {
    setDateRange(days);
    setIsLoading(true);
    const result = await getGSCPerformanceData(storeId, parseInt(days));
    if (result.data) {
      setData(result.data);
    }
    setIsLoading(false);
  };

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
          <p className="mt-4 text-muted-foreground">
            Connect Google Search Console to see your search performance data.
          </p>
          <Button className="mt-4" onClick={handleConnect}>
            <LinkIcon className="mr-2 h-4 w-4" />
            Connect Google Search Console
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {isConnected ? "Connected to Google Search Console" : "Using Demo Data"}
                </p>
                {siteUrl && (
                  <p className="text-sm text-muted-foreground">{siteUrl}</p>
                )}
              </div>
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Live" : "Demo"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="28">Last 28 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              {isConnected ? (
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" onClick={handleConnect}>
                  Connect
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold">{data.totals.clicks.toLocaleString()}</p>
              </div>
              <MousePointer className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Impressions</p>
                <p className="text-2xl font-bold">{data.totals.impressions.toLocaleString()}</p>
              </div>
              <Eye className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg CTR</p>
                <p className="text-2xl font-bold">{(data.totals.ctr * 100).toFixed(2)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Position</p>
                <p className="text-2xl font-bold">{data.totals.position.toFixed(1)}</p>
              </div>
              <Hash className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-1">
            {data.dates.map((d, i) => {
              const maxClicks = Math.max(...data.dates.map((x) => x.clicks));
              const height = maxClicks > 0 ? (d.clicks / maxClicks) * 100 : 0;
              return (
                <div
                  key={i}
                  className="flex-1 bg-primary/80 rounded-t hover:bg-primary transition-colors cursor-pointer"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${d.keys[0]}: ${d.clicks} clicks`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{data.dates[0]?.keys[0]}</span>
            <span>{data.dates[data.dates.length - 1]?.keys[0]}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="queries">
        <TabsList>
          <TabsTrigger value="queries">Top Queries</TabsTrigger>
          <TabsTrigger value="pages">Top Pages</TabsTrigger>
          <TabsTrigger value="countries">Countries</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="queries">
          <Card>
            <CardHeader>
              <CardTitle>Top Search Queries</CardTitle>
              <CardDescription>
                Keywords that drive traffic to your site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.queries.slice(0, 20).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.keys[0]}</TableCell>
                      <TableCell className="text-right">{row.clicks}</TableCell>
                      <TableCell className="text-right">{row.impressions}</TableCell>
                      <TableCell className="text-right">{(row.ctr * 100).toFixed(2)}%</TableCell>
                      <TableCell className="text-right">{row.position.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
              <CardDescription>
                Your best performing pages in search
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pages.slice(0, 20).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium max-w-xs truncate">
                        <a
                          href={row.keys[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          {row.keys[0].replace(/^https?:\/\/[^/]+/, "")}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell className="text-right">{row.clicks}</TableCell>
                      <TableCell className="text-right">{row.impressions}</TableCell>
                      <TableCell className="text-right">{(row.ctr * 100).toFixed(2)}%</TableCell>
                      <TableCell className="text-right">{row.position.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="countries">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Country</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.countries.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium uppercase">{row.keys[0]}</TableCell>
                      <TableCell className="text-right">{row.clicks}</TableCell>
                      <TableCell className="text-right">{row.impressions}</TableCell>
                      <TableCell className="text-right">{(row.ctr * 100).toFixed(2)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Device</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {data.devices.map((device, i) => {
                  const Icon = device.keys[0] === "MOBILE" ? Smartphone : Monitor;
                  const totalClicks = data.devices.reduce((sum, d) => sum + d.clicks, 0);
                  const percentage = totalClicks > 0 ? (device.clicks / totalClicks) * 100 : 0;

                  return (
                    <Card key={i}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Icon className="h-6 w-6 text-muted-foreground" />
                          <span className="font-medium capitalize">{device.keys[0].toLowerCase()}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Clicks</span>
                            <span className="font-medium">{device.clicks}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Avg Position</span>
                            <span className="font-medium">{device.position.toFixed(1)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
