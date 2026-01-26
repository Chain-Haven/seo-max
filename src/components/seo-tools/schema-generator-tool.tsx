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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Code,
  Copy,
  CheckCircle,
  Building,
  Package,
  HelpCircle,
  ListOrdered,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateStoreLocalBusinessSchema,
  generateHowToSchemaFromContent,
  generateFAQSchemaFromPairs,
  generateOrgSchema,
} from "@/lib/actions/seo-tools";

interface SchemaGeneratorToolProps {
  stores: Array<{ id: string; name: string; url: string }>;
}

export function SchemaGeneratorTool({ stores }: SchemaGeneratorToolProps) {
  // LocalBusiness state
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);
  const [localBusinessSchema, setLocalBusinessSchema] = useState<string>("");

  // Organization state
  const [orgName, setOrgName] = useState("");
  const [orgUrl, setOrgUrl] = useState("");
  const [orgLogo, setOrgLogo] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [orgSocial, setOrgSocial] = useState("");
  const [isGeneratingOrg, setIsGeneratingOrg] = useState(false);
  const [orgSchema, setOrgSchema] = useState<string>("");

  // HowTo state
  const [howToTitle, setHowToTitle] = useState("");
  const [howToContent, setHowToContent] = useState("");
  const [isGeneratingHowTo, setIsGeneratingHowTo] = useState(false);
  const [howToSchema, setHowToSchema] = useState<string>("");

  // FAQ state
  const [faqPairs, setFaqPairs] = useState<Array<{ question: string; answer: string }>>([
    { question: "", answer: "" },
    { question: "", answer: "" },
    { question: "", answer: "" },
  ]);
  const [faqSchema, setFaqSchema] = useState<string>("");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Schema copied to clipboard");
  };

  const handleGenerateLocalBusiness = async () => {
    if (!selectedStore) {
      toast.error("Please select a store");
      return;
    }

    setIsGeneratingLocal(true);
    try {
      const result = await generateStoreLocalBusinessSchema(selectedStore);
      if (result.data) {
        setLocalBusinessSchema(result.data);
        toast.success("LocalBusiness schema generated");
      } else {
        toast.error(result.error || "Failed to generate schema");
      }
    } catch {
      toast.error("Failed to generate schema");
    } finally {
      setIsGeneratingLocal(false);
    }
  };

  const handleGenerateOrg = async () => {
    if (!orgName || !orgUrl) {
      toast.error("Name and URL are required");
      return;
    }

    setIsGeneratingOrg(true);
    try {
      const result = await generateOrgSchema({
        name: orgName,
        url: orgUrl,
        logo: orgLogo || undefined,
        description: orgDescription || undefined,
        socialProfiles: orgSocial.split(",").map((s) => s.trim()).filter(Boolean),
      });
      if (result.data) {
        setOrgSchema(result.data);
        toast.success("Organization schema generated");
      } else {
        toast.error(result.error || "Failed to generate schema");
      }
    } catch {
      toast.error("Failed to generate schema");
    } finally {
      setIsGeneratingOrg(false);
    }
  };

  const handleGenerateHowTo = async () => {
    if (!howToTitle || !howToContent) {
      toast.error("Title and content are required");
      return;
    }

    setIsGeneratingHowTo(true);
    try {
      const result = await generateHowToSchemaFromContent(howToTitle, howToContent);
      if (result.data) {
        setHowToSchema(result.data);
        toast.success("HowTo schema generated");
      } else {
        toast.error(result.error || "Failed to generate schema");
      }
    } catch {
      toast.error("Failed to generate schema");
    } finally {
      setIsGeneratingHowTo(false);
    }
  };

  const handleGenerateFAQ = async () => {
    const validPairs = faqPairs.filter((p) => p.question && p.answer);
    if (validPairs.length === 0) {
      toast.error("Add at least one Q&A pair");
      return;
    }

    try {
      const result = await generateFAQSchemaFromPairs(validPairs);
      if (result.data) {
        setFaqSchema(result.data);
        toast.success("FAQ schema generated");
      } else {
        toast.error(result.error || "Failed to generate schema");
      }
    } catch {
      toast.error("Failed to generate schema");
    }
  };

  const updateFaqPair = (index: number, field: "question" | "answer", value: string) => {
    setFaqPairs((prev) => {
      const newPairs = [...prev];
      newPairs[index][field] = value;
      return newPairs;
    });
  };

  const addFaqPair = () => {
    setFaqPairs((prev) => [...prev, { question: "", answer: "" }]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Schema Markup Generator
          </CardTitle>
          <CardDescription>
            Generate structured data for rich search results
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="localbusiness" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="localbusiness" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Organization</span>
          </TabsTrigger>
          <TabsTrigger value="howto" className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4" />
            <span className="hidden sm:inline">HowTo</span>
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">FAQ</span>
          </TabsTrigger>
        </TabsList>

        {/* LocalBusiness Tab */}
        <TabsContent value="localbusiness" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Store</Label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                  >
                    <option value="">Choose a store...</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Store business details will be used to generate the schema.
                    Update store settings to add address, hours, etc.
                  </p>
                </div>
                <Button onClick={handleGenerateLocalBusiness} disabled={isGeneratingLocal}>
                  {isGeneratingLocal ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Building className="mr-2 h-4 w-4" />
                  )}
                  Generate LocalBusiness Schema
                </Button>
              </div>
            </CardContent>
          </Card>

          {localBusinessSchema && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">LocalBusiness Schema</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(localBusinessSchema)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="p-4 rounded-lg bg-muted text-xs overflow-x-auto">
                  {localBusinessSchema}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Organization Name *</Label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website URL *</Label>
                  <Input
                    value={orgUrl}
                    onChange={(e) => setOrgUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input
                    value={orgLogo}
                    onChange={(e) => setOrgLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Social Profiles (comma-separated)</Label>
                  <Input
                    value={orgSocial}
                    onChange={(e) => setOrgSocial(e.target.value)}
                    placeholder="https://twitter.com/..., https://linkedin.com/..."
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={orgDescription}
                    onChange={(e) => setOrgDescription(e.target.value)}
                    placeholder="Brief description of your organization"
                    rows={3}
                  />
                </div>
              </div>
              <Button onClick={handleGenerateOrg} disabled={isGeneratingOrg} className="mt-4">
                {isGeneratingOrg ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Package className="mr-2 h-4 w-4" />
                )}
                Generate Organization Schema
              </Button>
            </CardContent>
          </Card>

          {orgSchema && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Organization Schema</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(orgSchema)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="p-4 rounded-lg bg-muted text-xs overflow-x-auto">
                  {orgSchema}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* HowTo Tab */}
        <TabsContent value="howto" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>HowTo Title</Label>
                  <Input
                    value={howToTitle}
                    onChange={(e) => setHowToTitle(e.target.value)}
                    placeholder="How to clean leather shoes"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content (with steps)</Label>
                  <Textarea
                    value={howToContent}
                    onChange={(e) => setHowToContent(e.target.value)}
                    placeholder="Paste your how-to content with step-by-step instructions..."
                    rows={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    AI will extract steps, supplies, and tools from your content
                  </p>
                </div>
                <Button onClick={handleGenerateHowTo} disabled={isGeneratingHowTo}>
                  {isGeneratingHowTo ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ListOrdered className="mr-2 h-4 w-4" />
                  )}
                  Generate HowTo Schema
                </Button>
              </div>
            </CardContent>
          </Card>

          {howToSchema && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">HowTo Schema</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(howToSchema)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="p-4 rounded-lg bg-muted text-xs overflow-x-auto">
                  {howToSchema}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {faqPairs.map((pair, index) => (
                  <div key={index} className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Q{index + 1}</span>
                      {pair.question && pair.answer && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <Input
                      value={pair.question}
                      onChange={(e) => updateFaqPair(index, "question", e.target.value)}
                      placeholder="Question"
                    />
                    <Textarea
                      value={pair.answer}
                      onChange={(e) => updateFaqPair(index, "answer", e.target.value)}
                      placeholder="Answer"
                      rows={2}
                    />
                  </div>
                ))}
                <div className="flex gap-4">
                  <Button variant="outline" onClick={addFaqPair}>
                    Add Another Q&A
                  </Button>
                  <Button onClick={handleGenerateFAQ}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Generate FAQ Schema
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {faqSchema && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">FAQ Schema</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(faqSchema)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="p-4 rounded-lg bg-muted text-xs overflow-x-auto">
                  {faqSchema}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
