"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, AlertTriangle, CheckCircle, Globe } from "lucide-react";

interface SERPPreviewProps {
  title: string;
  url: string;
  metaDescription: string;
  onTitleChange?: (title: string) => void;
  onDescriptionChange?: (description: string) => void;
  keyword?: string;
  readonly?: boolean;
}

export function SERPPreview({
  title,
  url,
  metaDescription,
  onTitleChange,
  onDescriptionChange,
  keyword,
  readonly = false,
}: SERPPreviewProps) {
  const [localTitle, setLocalTitle] = useState(title);
  const [localDescription, setLocalDescription] = useState(metaDescription);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  useEffect(() => {
    setLocalDescription(metaDescription);
  }, [metaDescription]);

  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    onTitleChange?.(value);
  };

  const handleDescriptionChange = (value: string) => {
    setLocalDescription(value);
    onDescriptionChange?.(value);
  };

  // Character limits
  const titleLength = localTitle.length;
  const descriptionLength = localDescription.length;
  
  const titleStatus = titleLength === 0 ? "empty" :
                      titleLength < 30 ? "short" :
                      titleLength <= 60 ? "optimal" : "long";
                      
  const descriptionStatus = descriptionLength === 0 ? "empty" :
                            descriptionLength < 120 ? "short" :
                            descriptionLength <= 160 ? "optimal" : "long";

  // Check if keyword is present
  const keywordInTitle = keyword && localTitle.toLowerCase().includes(keyword.toLowerCase());
  const keywordInDescription = keyword && localDescription.toLowerCase().includes(keyword.toLowerCase());

  // Truncate for preview
  const displayTitle = localTitle.length > 60 ? localTitle.substring(0, 57) + "..." : localTitle;
  const displayDescription = localDescription.length > 160 ? localDescription.substring(0, 157) + "..." : localDescription;

  // Format URL for display with better error handling
  const formatUrl = (url: string) => {
    if (!url) return "";
    
    try {
      // Handle relative URLs and URLs without protocol
      let urlToParse = url;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        urlToParse = "https://" + url;
      }
      
      const parsed = new URL(urlToParse);
      const pathname = parsed.pathname === "/" ? "" : parsed.pathname;
      return `${parsed.hostname}${pathname}`.replace(/\/$/, "");
    } catch (error) {
      // For invalid URLs, just return the cleaned version
      console.warn("Invalid URL format:", url, error);
      return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    }
  };

  const highlightKeyword = (text: string, kw: string) => {
    if (!kw || !text) return text;
    
    const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      part.toLowerCase() === kw.toLowerCase() 
        ? <strong key={i} className="font-semibold">{part}</strong>
        : part
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "optimal": return "text-green-600";
      case "short": return "text-yellow-600";
      case "long": return "text-orange-600";
      case "empty": return "text-red-600";
      default: return "text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "optimal": return <Badge variant="default" className="bg-green-500">Optimal</Badge>;
      case "short": return <Badge variant="secondary" className="bg-yellow-500 text-white">Too Short</Badge>;
      case "long": return <Badge variant="secondary" className="bg-orange-500 text-white">Too Long</Badge>;
      case "empty": return <Badge variant="destructive">Missing</Badge>;
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Eye className="h-5 w-5" />
          SERP Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Google Preview */}
        <div className="bg-white border rounded-lg p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Globe className="h-4 w-4" />
            <span>{formatUrl(url)}</span>
          </div>
          <h3 className="text-xl text-blue-800 hover:underline cursor-pointer font-medium leading-tight">
            {keyword ? highlightKeyword(displayTitle || "Page Title", keyword) : (displayTitle || "Page Title")}
          </h3>
          <p className="text-sm text-gray-600 leading-snug">
            {keyword ? highlightKeyword(displayDescription || "Meta description will appear here...", keyword) : (displayDescription || "Meta description will appear here...")}
          </p>
        </div>

        {/* Editor */}
        {!readonly && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="serp-title">Title Tag</Label>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${getStatusColor(titleStatus)}`}>
                    {titleLength}/60
                  </span>
                  {getStatusBadge(titleStatus)}
                </div>
              </div>
              <Input
                id="serp-title"
                value={localTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter page title"
                className={titleStatus === "long" ? "border-orange-400" : ""}
              />
              <div className="flex items-center gap-4 mt-1 text-xs">
                {keyword && (
                  <span className={keywordInTitle ? "text-green-600" : "text-muted-foreground"}>
                    {keywordInTitle ? (
                      <><CheckCircle className="h-3 w-3 inline mr-1" />Keyword present</>
                    ) : (
                      <><AlertTriangle className="h-3 w-3 inline mr-1" />Add keyword</>
                    )}
                  </span>
                )}
                <span className="text-muted-foreground">
                  Recommended: 50-60 characters
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="serp-description">Meta Description</Label>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${getStatusColor(descriptionStatus)}`}>
                    {descriptionLength}/160
                  </span>
                  {getStatusBadge(descriptionStatus)}
                </div>
              </div>
              <Textarea
                id="serp-description"
                value={localDescription}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Enter meta description"
                rows={3}
                className={descriptionStatus === "long" ? "border-orange-400" : ""}
              />
              <div className="flex items-center gap-4 mt-1 text-xs">
                {keyword && (
                  <span className={keywordInDescription ? "text-green-600" : "text-muted-foreground"}>
                    {keywordInDescription ? (
                      <><CheckCircle className="h-3 w-3 inline mr-1" />Keyword present</>
                    ) : (
                      <><AlertTriangle className="h-3 w-3 inline mr-1" />Add keyword</>
                    )}
                  </span>
                )}
                <span className="text-muted-foreground">
                  Recommended: 120-160 characters
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="flex items-center gap-4 pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Title:</span>
            {titleStatus === "optimal" ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Description:</span>
            {descriptionStatus === "optimal" ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
          </div>
          {keyword && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Keywords:</span>
              {keywordInTitle && keywordInDescription ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact inline preview
export function SERPPreviewInline({
  title,
  url,
  metaDescription,
}: {
  title: string;
  url: string;
  metaDescription: string;
}) {
  const displayTitle = title.length > 60 ? title.substring(0, 57) + "..." : title;
  const displayDescription = metaDescription.length > 160 ? metaDescription.substring(0, 157) + "..." : metaDescription;

  const formatUrl = (url: string) => {
    if (!url) return "";
    
    try {
      // Handle relative URLs and URLs without protocol
      let urlToParse = url;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        urlToParse = "https://" + url;
      }
      
      const parsed = new URL(urlToParse);
      const pathname = parsed.pathname === "/" ? "" : parsed.pathname;
      return `${parsed.hostname}${pathname}`.replace(/\/$/, "");
    } catch (error) {
      // For invalid URLs, just return the cleaned version
      console.warn("Invalid URL format:", url, error);
      return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    }
  };

  return (
    <div className="bg-white border rounded-lg p-3 space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Globe className="h-3 w-3" />
        <span className="truncate">{formatUrl(url)}</span>
      </div>
      <h4 className="text-base text-blue-700 hover:underline cursor-pointer font-medium truncate">
        {displayTitle || "Page Title"}
      </h4>
      <p className="text-xs text-gray-600 line-clamp-2">
        {displayDescription || "Meta description..."}
      </p>
    </div>
  );
}