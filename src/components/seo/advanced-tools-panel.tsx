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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Code,
  Smartphone,
  Globe,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  validateSchemaMarkup,
  runMobileAudit,
  analyzeInternationalSEO,
  analyzeEEAT,
  type SchemaValidationResult,
  type MobileAuditResult,
  type InternationalSEOResult,
  type EEATAnalysisResult,
} from "@/lib/actions/advanced-seo-tools";

interface Props {
  storeId: string;
  storeName: string;
  storeUrl: string;
}

export function AdvancedToolsPanel({ storeId, storeName, storeUrl }: Props) {
  const [url, setUrl] = useState(storeUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("schema");
  
  const [schemaResult, setSchemaResult] = useState<SchemaValidationResult | null>(null);
  const [mobileResult, setMobileResult] = useState<MobileAuditResult | null>(null);
  const [intlResult, setIntlResult] = useState<InternationalSEOResult | null>(null);
  const [eeatResult, setEeatResult] = useState<EEATAnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    setIsLoading(true);

    try {
      switch (activeTab) {
        case "schema": {
          const result = await validateSchemaMarkup(url);
          if (result.data) {
            setSchemaResult(result.data);
            toast.success("Schema validation complete");
          } else {
            toast.error(result.error || "Validation failed");
          }
          break;
        }
        case "mobile": {
          const result = await runMobileAudit(url);
          if (result.data) {
            setMobileResult(result.data);
            toast.success("Mobile audit complete");
          } else {
            toast.error(result.error || "Audit failed");
          }
          break;
        }
        case "international": {
          const result = await analyzeInternationalSEO(url);
          if (result.data) {
            setIntlResult(result.data);
            toast.success("International SEO analysis complete");
          } else {
            toast.error(result.error || "Analysis failed");
          }
          break;
        }
        case "eeat": {
          const result = await analyzeEEAT(url, storeId);
          if (result.data) {
            setEeatResult(result.data);
            toast.success("E-E-A-T analysis complete");
          } else {
            toast.error(result.error || "Analysis failed");
          }
          break;
        }
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "bg-green-500";
      case "B": return "bg-blue-500";
      case "C": return "bg-yellow-500";
      case "D": return "bg-orange-500";
      default: return "bg-red-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL to analyze..."
              className="flex-1"
            />
            <Button onClick={handleAnalyze} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tools Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schema" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="mobile" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Mobile
          </TabsTrigger>
          <TabsTrigger value="international" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            International
          </TabsTrigger>
          <TabsTrigger value="eeat" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            E-E-A-T
          </TabsTrigger>
        </TabsList>

        {/* Schema Validator */}
        <TabsContent value="schema">
          <Card>
            <CardHeader>
              <CardTitle>Schema Markup Validator</CardTitle>
              <CardDescription>
                Validate structured data and check rich result eligibility
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!schemaResult ? (
                <div className="text-center py-8 text-muted-foreground">
                  Enter a URL and click Analyze to validate schema markup
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center gap-4">
                    {schemaResult.valid ? (
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Valid
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="mr-1 h-3 w-3" />
                        Has Errors
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {schemaResult.schemaTypes.length} schema type(s) found
                    </span>
                  </div>

                  {/* Schema Types */}
                  <div>
                    <h4 className="font-medium mb-2">Detected Schema Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {schemaResult.schemaTypes.map((type, i) => (
                        <Badge key={i} variant="outline">{type}</Badge>
                      ))}
                      {schemaResult.schemaTypes.length === 0 && (
                        <span className="text-sm text-muted-foreground">No schema found</span>
                      )}
                    </div>
                  </div>

                  {/* Errors */}
                  {schemaResult.errors.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-red-600">Errors</h4>
                      <ul className="space-y-1">
                        {schemaResult.errors.map((error, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <span><strong>{error.type}:</strong> {error.message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {schemaResult.warnings.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-yellow-600">Warnings</h4>
                      <ul className="space-y-1">
                        {schemaResult.warnings.map((warning, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Rich Results */}
                  <div>
                    <h4 className="font-medium mb-2">Rich Result Eligibility</h4>
                    <div className="flex flex-wrap gap-2">
                      {schemaResult.richResults.eligible.map((type, i) => (
                        <Badge key={i} className="bg-green-100 text-green-800">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {type}
                        </Badge>
                      ))}
                      {schemaResult.richResults.notEligible.map((type, i) => (
                        <Badge key={i} className="bg-red-100 text-red-800">
                          <XCircle className="mr-1 h-3 w-3" />
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  {schemaResult.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {schemaResult.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-muted-foreground">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mobile Audit */}
        <TabsContent value="mobile">
          <Card>
            <CardHeader>
              <CardTitle>Mobile-First Audit</CardTitle>
              <CardDescription>
                Check mobile optimization and usability
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!mobileResult ? (
                <div className="text-center py-8 text-muted-foreground">
                  Enter a URL and click Analyze to run mobile audit
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Score */}
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getGradeColor(mobileResult.grade)}`}>
                      <span className="text-2xl font-bold text-white">{mobileResult.grade}</span>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{mobileResult.score}/100</p>
                      <p className="text-muted-foreground">Mobile Score</p>
                    </div>
                  </div>

                  <Progress value={mobileResult.score} className="h-2" />

                  {/* Checks */}
                  <div>
                    <h4 className="font-medium mb-2">Audit Checks</h4>
                    <div className="space-y-2">
                      {mobileResult.checks.map((check, i) => (
                        <div key={i} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            {check.passed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm">{check.name}</span>
                          </div>
                          <Badge variant={check.impact === "high" ? "destructive" : "secondary"}>
                            {check.impact}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  {mobileResult.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {mobileResult.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-muted-foreground">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* International SEO */}
        <TabsContent value="international">
          <Card>
            <CardHeader>
              <CardTitle>International SEO Analysis</CardTitle>
              <CardDescription>
                Check hreflang tags, language targeting, and geo-optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!intlResult ? (
                <div className="text-center py-8 text-muted-foreground">
                  Enter a URL and click Analyze to check international SEO
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Language Declaration */}
                  <div>
                    <h4 className="font-medium mb-2">Language Declaration</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 border rounded">
                        <p className="text-sm text-muted-foreground">HTML lang</p>
                        <p className="font-medium">{intlResult.languageDeclaration.htmlLang || "Not set"}</p>
                      </div>
                      <div className="p-3 border rounded">
                        <p className="text-sm text-muted-foreground">Content-Language</p>
                        <p className="font-medium">{intlResult.languageDeclaration.contentLanguage || "Not set"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Hreflang Tags */}
                  <div>
                    <h4 className="font-medium mb-2">Hreflang Tags ({intlResult.hreflangTags.length})</h4>
                    {intlResult.hreflangTags.length > 0 ? (
                      <div className="space-y-2">
                        {intlResult.hreflangTags.map((tag, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 border rounded text-sm">
                            <Badge variant="outline">
                              {tag.language}{tag.region ? `-${tag.region}` : ""}
                            </Badge>
                            <span className="text-muted-foreground truncate flex-1">{tag.url}</span>
                            {tag.valid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No hreflang tags found</p>
                    )}
                  </div>

                  {/* URL Structure */}
                  <div>
                    <h4 className="font-medium mb-2">URL Structure</h4>
                    <div className="p-3 border rounded">
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium capitalize">{intlResult.urlStructure.type}</p>
                      {intlResult.urlStructure.pattern && (
                        <p className="text-sm text-muted-foreground mt-1">Pattern: {intlResult.urlStructure.pattern}</p>
                      )}
                    </div>
                  </div>

                  {/* Issues & Recommendations */}
                  {intlResult.issues.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-red-600">Issues</h4>
                      <ul className="space-y-1">
                        {intlResult.issues.map((issue, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {intlResult.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {intlResult.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-muted-foreground">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* E-E-A-T Analysis */}
        <TabsContent value="eeat">
          <Card>
            <CardHeader>
              <CardTitle>E-E-A-T Analysis</CardTitle>
              <CardDescription>
                Experience, Expertise, Authoritativeness, and Trustworthiness signals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!eeatResult ? (
                <div className="text-center py-8 text-muted-foreground">
                  Enter a URL and click Analyze to check E-E-A-T signals
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Overall Score */}
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getGradeColor(eeatResult.grade)}`}>
                      <span className="text-2xl font-bold text-white">{eeatResult.grade}</span>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{eeatResult.score}/100</p>
                      <p className="text-muted-foreground">E-E-A-T Score</p>
                    </div>
                  </div>

                  {/* Category Scores */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(eeatResult.signals).map(([key, value]) => (
                      <div key={key} className="p-3 border rounded">
                        <p className="text-sm text-muted-foreground capitalize">{key}</p>
                        <p className="text-2xl font-bold">{value.score}</p>
                        <Progress value={value.score} className="h-1 mt-1" />
                      </div>
                    ))}
                  </div>

                  {/* Signals Detail */}
                  {Object.entries(eeatResult.signals).map(([key, value]) => (
                    <div key={key} className="border rounded p-3">
                      <h4 className="font-medium capitalize mb-2">{key}</h4>
                      <div className="grid md:grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-green-600 font-medium">Present</p>
                          {value.signals.length > 0 ? (
                            <ul className="text-sm">
                              {value.signals.map((s, i) => (
                                <li key={i} className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  {s}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">None detected</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-red-600 font-medium">Missing</p>
                          {value.missing.length > 0 ? (
                            <ul className="text-sm">
                              {value.missing.map((m, i) => (
                                <li key={i} className="flex items-center gap-1">
                                  <XCircle className="h-3 w-3 text-red-500" />
                                  {m}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">All present</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Top Recommendations */}
                  {eeatResult.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Top Recommendations</h4>
                      <div className="space-y-2">
                        {eeatResult.recommendations.slice(0, 5).map((rec, i) => (
                          <div key={i} className="p-3 border rounded">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={rec.priority === "high" ? "destructive" : "secondary"}>
                                {rec.priority}
                              </Badge>
                              <Badge variant="outline">{rec.category}</Badge>
                            </div>
                            <p className="text-sm font-medium">{rec.action}</p>
                            <p className="text-xs text-muted-foreground">{rec.implementation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
