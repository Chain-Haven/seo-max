/**
 * Billing Plans Configuration
 */

export interface BillingPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number; // In cents
  priceYearly: number; // In cents
  features: string[];
  limits: {
    stores: number;
    aiGenerationsPerMonth: number;
    blogPostsPerMonth: number;
    productsPerStore: number;
  };
  popular?: boolean;
}

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for small stores just getting started",
    priceMonthly: 4900, // $49
    priceYearly: 47000, // $470 (2 months free)
    features: [
      "1 WooCommerce store",
      "500 AI generations/month",
      "10 blog posts/month",
      "Basic SEO optimization",
      "Email support",
    ],
    limits: {
      stores: 1,
      aiGenerationsPerMonth: 500,
      blogPostsPerMonth: 10,
      productsPerStore: 500,
    },
  },
  {
    id: "professional",
    name: "Professional",
    description: "For growing businesses with multiple stores",
    priceMonthly: 9900, // $99
    priceYearly: 95000, // $950 (2 months free)
    features: [
      "Up to 5 stores",
      "2,000 AI generations/month",
      "50 blog posts/month",
      "Advanced SEO optimization",
      "Schema markup",
      "Priority support",
    ],
    limits: {
      stores: 5,
      aiGenerationsPerMonth: 2000,
      blogPostsPerMonth: 50,
      productsPerStore: 2000,
    },
    popular: true,
  },
  {
    id: "agency",
    name: "Agency",
    description: "For agencies managing multiple client stores",
    priceMonthly: 24900, // $249
    priceYearly: 239000, // $2,390 (2 months free)
    features: [
      "Unlimited stores",
      "10,000 AI generations/month",
      "Unlimited blog posts",
      "White-label dashboard",
      "API access",
      "Dedicated support",
      "Custom integrations",
    ],
    limits: {
      stores: -1, // Unlimited
      aiGenerationsPerMonth: 10000,
      blogPostsPerMonth: -1, // Unlimited
      productsPerStore: -1, // Unlimited
    },
  },
];

export function getPlanById(planId: string): BillingPlan | undefined {
  return BILLING_PLANS.find((plan) => plan.id === planId);
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function isWithinPlanLimits(
  plan: BillingPlan,
  usage: {
    stores?: number;
    aiGenerations?: number;
    blogPosts?: number;
    products?: number;
  }
): { allowed: boolean; exceeded: string[] } {
  const exceeded: string[] = [];

  if (plan.limits.stores !== -1 && (usage.stores || 0) >= plan.limits.stores) {
    exceeded.push("stores");
  }
  if (
    plan.limits.aiGenerationsPerMonth !== -1 &&
    (usage.aiGenerations || 0) >= plan.limits.aiGenerationsPerMonth
  ) {
    exceeded.push("aiGenerations");
  }
  if (
    plan.limits.blogPostsPerMonth !== -1 &&
    (usage.blogPosts || 0) >= plan.limits.blogPostsPerMonth
  ) {
    exceeded.push("blogPosts");
  }
  if (
    plan.limits.productsPerStore !== -1 &&
    (usage.products || 0) >= plan.limits.productsPerStore
  ) {
    exceeded.push("products");
  }

  return {
    allowed: exceeded.length === 0,
    exceeded,
  };
}
