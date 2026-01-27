"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link2, Link2Off, FileQuestion, Share2, CheckCircle, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface LinkManagementDashboardProps {
  storeId: string;
  brokenLinks: Array<{ url: string; found_on_page: string; status_code: number; is_fixed: boolean }>;
  orphanPages: Array<{ url: string; title: string; internal_links_in: number; is_important: boolean; suggested_links: string[] }>;
  redirectChains: Array<{ source_url: string; chain: string[]; chain_length: number; recommendation: string }>;
}

export function LinkManagementDashboard({
  storeId,
  brokenLinks,
  orphanPages,
  redirectChains,
}: LinkManagementDashboardProps) {
  const [activeTab, setActiveTab] = useState("broken");

  const importantOrphans = orphanPages.filter((p) => p.is_important).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Link2Off className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">{brokenLinks.length}</div>
                <div className="text-sm text-muted-foreground">Broken Links</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">{orphanPages.length}</div>
                <div className="text-sm text-muted-foreground">Orphan Pages</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-orange-600">{redirectChains.length}</div>
                <div className="text-sm text-muted-foreground">Redirect Chains</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="broken" className="gap-2">
            <Link2Off className="h-4 w-4" />
            Broken Links ({brokenLinks.length})
          </TabsTrigger>
          <TabsTrigger value="orphans" className="gap-2">
            <FileQuestion className="h-4 w-4" />
            Orphan Pages ({orphanPages.length})
          </TabsTrigger>
          <TabsTrigger value="chains" className="gap-2">
            <Share2 className="h-4 w-4" />
            Redirect Chains ({redirectChains.length})
          </TabsTrigger>
        </TabsList>

        {/* Broken Links */}
        <TabsContent value="broken">
          <Card>
            <CardHeader>
              <CardTitle>Broken Links</CardTitle>
              <CardDescription>
                Links that return 404 or other error codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {brokenLinks.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {brokenLinks.map((link, i) => (
                      <div key={i} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="destructive">{link.status_code}</Badge>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm hover:underline"
                              >
                                {link.url}
                                <ExternalLink className="inline h-3 w-3 ml-1" />
                              </a>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Found on: {link.found_on_page}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Fix
                            </Button>
                            <Button variant="ghost" size="sm">
                              <XCircle className="mr-1 h-4 w-4" />
                              Ignore
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No broken links detected!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orphan Pages */}
        <TabsContent value="orphans">
          <Card>
            <CardHeader>
              <CardTitle>Orphan Pages</CardTitle>
              <CardDescription>
                Pages with no internal links pointing to them
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orphanPages.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {orphanPages.map((page, i) => (
                      <div key={i} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {page.is_important && (
                                <span title="Has traffic/rankings">
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                </span>
                              )}
                              <span className="font-medium">{page.title || "Untitled"}</span>
                            </div>
                            <p className="text-sm text-muted-foreground font-mono">{page.url}</p>
                          </div>
                        </div>
                        {page.suggested_links && page.suggested_links.length > 0 && (
                          <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                            <p className="font-medium mb-1">Suggested pages to link from:</p>
                            <ul className="list-disc list-inside space-y-1">
                              {page.suggested_links.slice(0, 3).map((suggestedUrl, j) => (
                                <li key={j} className="text-muted-foreground">{suggestedUrl}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No orphan pages detected!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Redirect Chains */}
        <TabsContent value="chains">
          <Card>
            <CardHeader>
              <CardTitle>Redirect Chains</CardTitle>
              <CardDescription>
                Multiple redirects that should be consolidated
              </CardDescription>
            </CardHeader>
            <CardContent>
              {redirectChains.length > 0 ? (
                <div className="space-y-4">
                  {redirectChains.map((chain, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="mb-2">
                        <Badge variant="destructive">{chain.chain_length} redirects</Badge>
                      </div>
                      <div className="space-y-1 mb-3">
                        {(chain.chain as string[]).map((url, j) => (
                          <div key={j} className="flex items-center gap-2 text-sm font-mono">
                            {j > 0 && <span className="text-muted-foreground">→</span>}
                            <span>{url}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <span>{chain.recommendation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No redirect chains detected!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
