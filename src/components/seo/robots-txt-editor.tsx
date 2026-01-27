"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileCode, CheckCircle, AlertTriangle, XCircle, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { generateRobotsTxtAction, validateRobotsTxtAction } from "@/lib/actions/comprehensive-seo";

interface RobotsTxtEditorProps {
  storeId: string;
  initialContent: string;
}

export function RobotsTxtEditor({ storeId, initialContent }: RobotsTxtEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(false);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const result = await generateRobotsTxtAction(storeId);
      if (result.data) {
        setContent(result.data);
        toast.success("Robots.txt generated!");
      } else {
        toast.error(result.error || "Generation failed");
      }
    } catch {
      toast.error("Generation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async () => {
    setIsLoading(true);
    try {
      const result = await validateRobotsTxtAction(content);
      if (result.data) {
        setValidation(result.data);
        if (result.data.isValid) {
          toast.success("Robots.txt is valid!");
        } else {
          toast.warning(`Found ${result.data.errors.length} errors`);
        }
      }
    } catch {
      toast.error("Validation failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Robots.txt Editor
          </CardTitle>
          <CardDescription>
            Control which pages search engines can crawl
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="font-mono text-sm"
            placeholder="User-agent: *&#10;Disallow: /admin/"
          />

          <div className="flex gap-2">
            <Button onClick={handleGenerate} variant="outline" disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Generate Default
            </Button>
            <Button onClick={handleValidate} variant="outline" disabled={isLoading}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Validate
            </Button>
            <Button disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              Save & Deploy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      <Card>
        <CardHeader>
          <CardTitle>Validation & Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {validation ? (
            <>
              {validation.isValid ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-700">Robots.txt is valid!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-700">
                    {validation.errors.length} errors found
                  </span>
                </div>
              )}

              {validation.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-red-600">Errors</h4>
                  <ul className="space-y-1">
                    {validation.errors.map((error, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-yellow-600">Warnings</h4>
                  <ul className="space-y-1">
                    {validation.warnings.map((warning, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.suggestions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Suggestions</h4>
                  <ul className="space-y-1">
                    {validation.suggestions.map((suggestion, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Validate" to check your robots.txt</p>
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Common WooCommerce Blocks</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><code>/cart/</code> - Shopping cart pages</p>
              <p><code>/checkout/</code> - Checkout process</p>
              <p><code>/my-account/</code> - Customer accounts</p>
              <p><code>/?add-to-cart=</code> - Add to cart URLs</p>
              <p><code>/wp-admin/</code> - WordPress admin</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
