"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, LineChart } from "lucide-react";

interface RankingDataPoint {
  date: string;
  position: number | null;
}

interface RankHistoryChartProps {
  keyword: string;
  data: RankingDataPoint[];
  currentPosition?: number | null;
  previousPosition?: number | null;
  height?: number;
}

export function RankHistoryChart({
  keyword,
  data,
  currentPosition,
  previousPosition,
  height = 200,
}: RankHistoryChartProps) {
  // Calculate trend
  const trend = useMemo(() => {
    if (currentPosition === null || currentPosition === undefined) return "none";
    if (previousPosition === null || previousPosition === undefined) return "new";
    
    const diff = previousPosition - currentPosition;
    if (diff > 0) return "up";
    if (diff < 0) return "down";
    return "stable";
  }, [currentPosition, previousPosition]);

  const positionChange = useMemo(() => {
    if (previousPosition && currentPosition) {
      return previousPosition - currentPosition;
    }
    return 0;
  }, [currentPosition, previousPosition]);

  // Filter valid data points
  const validData = data.filter((d) => d.position !== null && d.position !== undefined);

  // Calculate chart dimensions
  const chartWidth = 100; // percentage
  const chartHeight = height - 40; // Leave room for labels
  
  // Calculate min/max for scaling (lower position = better)
  const positions = validData.map((d) => d.position!);
  const minPosition = Math.min(...positions);
  const maxPosition = Math.max(...positions);
  const range = maxPosition - minPosition || 10;

  // Generate SVG path
  const generatePath = () => {
    if (validData.length < 2) return "";
    
    const xStep = 100 / (validData.length - 1);
    
    const points = validData.map((d, i) => {
      const x = i * xStep;
      // Invert Y because lower position is better (should be higher on chart)
      const y = ((d.position! - minPosition) / range) * chartHeight;
      return `${x},${y}`;
    });
    
    return `M ${points.join(" L ")}`;
  };

  // Generate points for dots
  const generatePoints = () => {
    if (validData.length === 0) return [];
    
    const xStep = 100 / Math.max(validData.length - 1, 1);
    
    return validData.map((d, i) => ({
      x: i * xStep,
      y: ((d.position! - minPosition) / range) * chartHeight,
      position: d.position!,
      date: d.date,
    }));
  };

  const points = generatePoints();
  const path = generatePath();

  // Get color based on current position
  const getPositionColor = (pos: number) => {
    if (pos <= 3) return "text-green-500";
    if (pos <= 10) return "text-blue-500";
    if (pos <= 20) return "text-yellow-500";
    return "text-gray-500";
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "stable":
        return <Minus className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getTrendBadge = () => {
    if (positionChange === 0) return null;
    
    const isPositive = positionChange > 0;
    return (
      <Badge variant={isPositive ? "default" : "destructive"} className="ml-2">
        {isPositive ? "+" : ""}{positionChange}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            <span className="text-base font-medium truncate max-w-[200px]">{keyword}</span>
          </div>
          <div className="flex items-center gap-2">
            {currentPosition && (
              <span className={`text-2xl font-bold ${getPositionColor(currentPosition)}`}>
                #{currentPosition}
              </span>
            )}
            {getTrendIcon()}
            {getTrendBadge()}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {validData.length > 0 ? (
          <div className="relative" style={{ height: `${height}px` }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-xs text-muted-foreground">
              <span>#{minPosition}</span>
              <span>#{Math.round((minPosition + maxPosition) / 2)}</span>
              <span>#{maxPosition}</span>
            </div>
            
            {/* Chart area */}
            <div className="ml-10 h-full">
              <svg
                viewBox={`0 0 100 ${chartHeight}`}
                className="w-full"
                style={{ height: `${chartHeight}px` }}
                preserveAspectRatio="none"
              >
                {/* Grid lines */}
                <line x1="0" y1="0" x2="100" y2="0" stroke="#e5e7eb" strokeWidth="0.5" />
                <line x1="0" y1={chartHeight / 2} x2="100" y2={chartHeight / 2} stroke="#e5e7eb" strokeWidth="0.5" />
                <line x1="0" y1={chartHeight} x2="100" y2={chartHeight} stroke="#e5e7eb" strokeWidth="0.5" />
                
                {/* Area fill */}
                {validData.length > 1 && (
                  <path
                    d={`${path} L 100,${chartHeight} L 0,${chartHeight} Z`}
                    fill="url(#gradient)"
                    opacity="0.3"
                  />
                )}
                
                {/* Line */}
                {validData.length > 1 && (
                  <path
                    d={path}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                
                {/* Points */}
                {points.map((point, i) => (
                  <g key={i}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="3"
                      fill="#3b82f6"
                      className="cursor-pointer hover:r-4"
                    />
                    <title>{`${point.date}: #${point.position}`}</title>
                  </g>
                ))}
                
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* X-axis labels */}
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                {validData.length > 0 && (
                  <>
                    <span>{validData[0].date}</span>
                    {validData.length > 2 && (
                      <span>{validData[Math.floor(validData.length / 2)].date}</span>
                    )}
                    <span>{validData[validData.length - 1].date}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No ranking data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Mini sparkline version
export function RankSparkline({
  data,
  currentPosition,
  className = "",
}: {
  data: RankingDataPoint[];
  currentPosition?: number | null;
  className?: string;
}) {
  const validData = data.filter((d) => d.position !== null);
  
  if (validData.length < 2) {
    return <span className="text-muted-foreground">-</span>;
  }
  
  const positions = validData.map((d) => d.position!);
  const min = Math.min(...positions);
  const max = Math.max(...positions);
  const range = max - min || 10;
  
  const width = 60;
  const height = 20;
  const xStep = width / (validData.length - 1);
  
  const points = validData.map((d, i) => {
    const x = i * xStep;
    const y = height - ((d.position! - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  
  // Determine color based on trend
  const firstPos = validData[0].position!;
  const lastPos = validData[validData.length - 1].position!;
  const isImproving = lastPos < firstPos;
  const color = isImproving ? "#22c55e" : lastPos > firstPos ? "#ef4444" : "#6b7280";
  
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
        />
      </svg>
      {currentPosition && (
        <span className="text-sm font-medium">#{currentPosition}</span>
      )}
    </div>
  );
}

// Position badge with color coding
export function PositionBadge({ position }: { position: number | null }) {
  if (position === null) {
    return <Badge variant="outline">Not Ranking</Badge>;
  }
  
  if (position <= 3) {
    return <Badge className="bg-green-500">#{position}</Badge>;
  }
  
  if (position <= 10) {
    return <Badge className="bg-blue-500">#{position}</Badge>;
  }
  
  if (position <= 20) {
    return <Badge className="bg-yellow-500">#{position}</Badge>;
  }
  
  return <Badge variant="secondary">#{position}</Badge>;
}
