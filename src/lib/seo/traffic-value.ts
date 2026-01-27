export interface TrafficValueEstimate {
  totalMonthlyTraffic: number;
  estimatedMonthlyValue: number;
  topKeywordsByValue: Array<{
    keyword: string;
    position: number;
    searchVolume: number;
    ctr: number;
    monthlyClicks: number;
    cpc: number;
    monthlyValue: number;
  }>;
  valueByIntent: {
    transactional: number;
    commercial: number;
    informational: number;
    navigational: number;
  };
  valueGrowthPotential: number;
  recommendations: string[];
}

// CTR by position based on industry averages
const CTR_BY_POSITION: Record<number, number> = {
  1: 0.316,
  2: 0.152,
  3: 0.094,
  4: 0.063,
  5: 0.044,
  6: 0.031,
  7: 0.024,
  8: 0.019,
  9: 0.016,
  10: 0.014,
};

function getCTR(position: number): number {
  if (position <= 10) return CTR_BY_POSITION[position] || 0.01;
  if (position <= 20) return 0.005;
  if (position <= 30) return 0.002;
  return 0.001;
}

// CPC multipliers by intent (transactional keywords are worth more)
const INTENT_MULTIPLIERS: Record<string, number> = {
  transactional: 1.5,
  commercial: 1.3,
  informational: 0.5,
  navigational: 0.3,
};

// Detect search intent from keyword
function detectIntent(keyword: string): string {
  const lower = keyword.toLowerCase();
  
  if (lower.match(/buy|price|cheap|discount|deal|coupon|order|purchase|shop|cost|pricing/)) {
    return "transactional";
  }
  if (lower.match(/best|top|review|vs|comparison|alternative|recommend/)) {
    return "commercial";
  }
  if (lower.match(/how|what|why|when|where|who|which|guide|tutorial|learn/)) {
    return "informational";
  }
  if (lower.match(/login|sign in|official|website|contact|support/)) {
    return "navigational";
  }
  
  return "informational";
}

// Calculate traffic value for a set of keywords
export function calculateTrafficValue(
  keywords: Array<{
    keyword: string;
    position: number;
    searchVolume: number;
    cpc?: number;
  }>
): TrafficValueEstimate {
  let totalMonthlyTraffic = 0;
  let totalMonthlyValue = 0;
  
  const valueByIntent = {
    transactional: 0,
    commercial: 0,
    informational: 0,
    navigational: 0,
  };
  
  const keywordValues = keywords.map((kw) => {
    const ctr = getCTR(kw.position);
    const monthlyClicks = Math.round(kw.searchVolume * ctr);
    const intent = detectIntent(kw.keyword);
    const baseCpc = kw.cpc || 1.0; // Default $1 CPC if not provided
    const intentMultiplier = INTENT_MULTIPLIERS[intent] || 1.0;
    const adjustedCpc = baseCpc * intentMultiplier;
    const monthlyValue = monthlyClicks * adjustedCpc;
    
    totalMonthlyTraffic += monthlyClicks;
    totalMonthlyValue += monthlyValue;
    valueByIntent[intent as keyof typeof valueByIntent] += monthlyValue;
    
    return {
      keyword: kw.keyword,
      position: kw.position,
      searchVolume: kw.searchVolume,
      ctr,
      monthlyClicks,
      cpc: adjustedCpc,
      monthlyValue,
      intent,
    };
  });
  
  // Sort by value
  keywordValues.sort((a, b) => b.monthlyValue - a.monthlyValue);
  
  // Calculate growth potential (if all keywords moved to position 1)
  const potentialTraffic = keywords.reduce((sum, kw) => {
    return sum + Math.round(kw.searchVolume * CTR_BY_POSITION[1]);
  }, 0);
  const potentialValue = potentialTraffic * 1.0; // Simplified
  const valueGrowthPotential = potentialValue - totalMonthlyValue;
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  // Quick wins: high volume, position 4-10
  const quickWins = keywordValues.filter(
    (k) => k.position >= 4 && k.position <= 10 && k.searchVolume >= 500
  );
  if (quickWins.length > 0) {
    recommendations.push(
      `Focus on "${quickWins[0].keyword}" - moving from position ${quickWins[0].position} to top 3 could add $${Math.round(quickWins[0].searchVolume * 0.1)} monthly value`
    );
  }
  
  // High value transactional keywords
  const topTransactional = keywordValues.filter(
    (k) => k.intent === "transactional" && k.position > 10
  );
  if (topTransactional.length > 0) {
    recommendations.push(
      `Optimize for transactional keyword "${topTransactional[0].keyword}" - high commercial value`
    );
  }
  
  // Content gaps
  if (valueByIntent.informational < totalMonthlyValue * 0.2) {
    recommendations.push(
      "Add more informational content to build topical authority"
    );
  }
  
  // Page 2 opportunities
  const page2Keywords = keywordValues.filter(
    (k) => k.position >= 11 && k.position <= 20
  );
  if (page2Keywords.length > 5) {
    recommendations.push(
      `${page2Keywords.length} keywords on page 2 - improve internal linking to push to page 1`
    );
  }
  
  return {
    totalMonthlyTraffic,
    estimatedMonthlyValue: Math.round(totalMonthlyValue),
    topKeywordsByValue: keywordValues.slice(0, 20).map((k) => ({
      keyword: k.keyword,
      position: k.position,
      searchVolume: k.searchVolume,
      ctr: k.ctr,
      monthlyClicks: k.monthlyClicks,
      cpc: Math.round(k.cpc * 100) / 100,
      monthlyValue: Math.round(k.monthlyValue),
    })),
    valueByIntent: {
      transactional: Math.round(valueByIntent.transactional),
      commercial: Math.round(valueByIntent.commercial),
      informational: Math.round(valueByIntent.informational),
      navigational: Math.round(valueByIntent.navigational),
    },
    valueGrowthPotential: Math.round(valueGrowthPotential),
    recommendations,
  };
}

// Calculate historical traffic value trend
export function calculateValueTrend(
  keywordHistory: Array<{
    month: string;
    keywords: Array<{
      keyword: string;
      position: number;
      searchVolume: number;
      cpc?: number;
    }>;
  }>
): Array<{ month: string; traffic: number; value: number }> {
  return keywordHistory.map((month) => {
    const estimate = calculateTrafficValue(month.keywords);
    return {
      month: month.month,
      traffic: estimate.totalMonthlyTraffic,
      value: estimate.estimatedMonthlyValue,
    };
  });
}

// Estimate value of improving specific keywords
export function estimateImprovementValue(
  keyword: string,
  currentPosition: number,
  targetPosition: number,
  searchVolume: number,
  cpc: number = 1.0
): {
  currentMonthlyValue: number;
  potentialMonthlyValue: number;
  additionalMonthlyValue: number;
  annualValueIncrease: number;
} {
  const currentCTR = getCTR(currentPosition);
  const targetCTR = getCTR(targetPosition);
  const intent = detectIntent(keyword);
  const multiplier = INTENT_MULTIPLIERS[intent] || 1.0;
  const adjustedCpc = cpc * multiplier;
  
  const currentMonthlyClicks = Math.round(searchVolume * currentCTR);
  const targetMonthlyClicks = Math.round(searchVolume * targetCTR);
  
  const currentMonthlyValue = currentMonthlyClicks * adjustedCpc;
  const potentialMonthlyValue = targetMonthlyClicks * adjustedCpc;
  const additionalMonthlyValue = potentialMonthlyValue - currentMonthlyValue;
  
  return {
    currentMonthlyValue: Math.round(currentMonthlyValue),
    potentialMonthlyValue: Math.round(potentialMonthlyValue),
    additionalMonthlyValue: Math.round(additionalMonthlyValue),
    annualValueIncrease: Math.round(additionalMonthlyValue * 12),
  };
}

// ROI calculator for SEO investment
export function calculateSEOROI(
  currentTrafficValue: number,
  projectedTrafficValue: number,
  monthlyInvestment: number,
  timeframeMonths: number = 12
): {
  totalInvestment: number;
  projectedValueGain: number;
  roi: number;
  breakEvenMonth: number | null;
  monthlyProjections: Array<{
    month: number;
    cumulativeInvestment: number;
    cumulativeValueGain: number;
    roi: number;
  }>;
} {
  const totalInvestment = monthlyInvestment * timeframeMonths;
  const monthlyValueGain = (projectedTrafficValue - currentTrafficValue) / timeframeMonths;
  
  let cumulativeInvestment = 0;
  let cumulativeValueGain = 0;
  let breakEvenMonth: number | null = null;
  const monthlyProjections: Array<{
    month: number;
    cumulativeInvestment: number;
    cumulativeValueGain: number;
    roi: number;
  }> = [];
  
  for (let month = 1; month <= timeframeMonths; month++) {
    cumulativeInvestment += monthlyInvestment;
    // Value gain accelerates over time (SEO compound effect)
    const accelerator = 1 + (month / timeframeMonths) * 0.5;
    cumulativeValueGain += monthlyValueGain * accelerator;
    
    const monthlyRoi = ((cumulativeValueGain - cumulativeInvestment) / cumulativeInvestment) * 100;
    
    if (breakEvenMonth === null && cumulativeValueGain >= cumulativeInvestment) {
      breakEvenMonth = month;
    }
    
    monthlyProjections.push({
      month,
      cumulativeInvestment: Math.round(cumulativeInvestment),
      cumulativeValueGain: Math.round(cumulativeValueGain),
      roi: Math.round(monthlyRoi),
    });
  }
  
  const projectedValueGain = cumulativeValueGain;
  const roi = ((projectedValueGain - totalInvestment) / totalInvestment) * 100;
  
  return {
    totalInvestment,
    projectedValueGain: Math.round(projectedValueGain),
    roi: Math.round(roi),
    breakEvenMonth,
    monthlyProjections,
  };
}

// Format currency for display
export function formatCurrency(value: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
