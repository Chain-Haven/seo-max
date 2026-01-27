"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Store, Star, Phone, Mail, Globe, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface LocalSEODashboardProps {
  storeId: string;
  locations: Array<{
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    gmb_connected: boolean;
  }>;
  localRankings: Array<{
    keyword: string;
    location: string;
    position: number | null;
    in_map_pack: boolean;
    map_pack_position: number | null;
    checked_at: string;
  }>;
}

export function LocalSEODashboard({
  storeId,
  locations,
  localRankings,
}: LocalSEODashboardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const gmbConnected = locations.some((l) => l.gmb_connected);
  const mapPackCount = localRankings.filter((r) => r.in_map_pack).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{locations.length}</div>
                <div className="text-sm text-muted-foreground">Locations</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={gmbConnected ? "border-green-500/30 bg-green-500/5" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{gmbConnected ? "✓" : "✗"}</div>
                <div className="text-sm text-muted-foreground">GMB Connected</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{mapPackCount}</div>
                <div className="text-sm text-muted-foreground">Map Pack Rankings</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{localRankings.length}</div>
            <div className="text-sm text-muted-foreground">Local Keywords Tracked</div>
          </CardContent>
        </Card>
      </div>

      {/* Business Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Business Locations
          </CardTitle>
          <CardDescription>
            Manage your business locations and NAP (Name, Address, Phone) data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {locations.length > 0 ? (
            <div className="space-y-3">
              {locations.map((location) => (
                <div key={location.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{location.name}</h3>
                        {location.gmb_connected ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            GMB Connected
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Not Connected
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {location.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {location.address}, {location.city}, {location.state}
                          </div>
                        )}
                        {location.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {location.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No locations added yet</p>
              <Button className="mt-4">Add Location</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Local Rankings */}
      {localRankings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Local Keyword Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {localRankings.slice(0, 20).map((ranking, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <p className="font-medium">{ranking.keyword}</p>
                    <p className="text-sm text-muted-foreground">{ranking.location}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {ranking.in_map_pack ? (
                      <Badge className="bg-green-500">
                        Map Pack #{ranking.map_pack_position}
                      </Badge>
                    ) : ranking.position ? (
                      <Badge variant="secondary">
                        Organic #{ranking.position}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not Ranking</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
