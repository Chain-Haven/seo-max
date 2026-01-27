"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code2, CheckCircle, XCircle, AlertTriangle, RefreshCw, FileJson } from "lucide-react";

interface SchemaManagementDashboardProps {
  storeId: string;
  validations: Array<{
    entity_type: string;
    schema_type: string;
    is_valid: boolean;
    validation_errors: Array<{ field: string; message: string }>;
    last_validated_at: string;
  }>;
}

export function SchemaManagementDashboard({
  storeId,
  validations,
}: SchemaManagementDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const validCount = validations.filter((v) => v.is_valid).length;
  const invalidCount = validations.filter((v) => !v.is_valid).length;
  const errorCount = validations.reduce((sum, v) => sum + (v.validation_errors?.length || 0), 0);

  const byType = validations.reduce((acc, v) => {
    acc[v.schema_type] = (acc[v.schema_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{validations.length}</div>
            <div className="text-sm text-muted-foreground">Total Schemas</div>
          </CardContent>
        </Card>
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{validCount}</div>
                <div className="text-sm text-muted-foreground">Valid</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">{invalidCount}</div>
                <div className="text-sm text-muted-foreground">Invalid</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500">{errorCount}</div>
            <div className="text-sm text-muted-foreground">Total Errors</div>
          </CardContent>
        </Card>
      </div>

      {/* Schema Types */}
      <Card>
        <CardHeader>
          <CardTitle>Schema Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(byType).map(([type, count]) => (
              <Badge key={type} variant="secondary">
                {type}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Validation Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {validations.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {validations.map((validation, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{validation.entity_type}</Badge>
                        <span className="font-medium">{validation.schema_type}</span>
                      </div>
                      {validation.is_valid ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Valid
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" />
                          Invalid
                        </Badge>
                      )}
                    </div>

                    {validation.validation_errors && validation.validation_errors.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {validation.validation_errors.map((error, j) => (
                          <div key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                            <span>
                              <strong>{error.field}:</strong> {error.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">
                      Last validated: {new Date(validation.last_validated_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No schema validations yet</p>
              <p className="text-sm">Generate schemas for your products and pages</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
