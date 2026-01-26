import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Sparkles,
  BarChart3,
  Zap,
  Shield,
  Bot,
  ArrowRight,
  CheckCircle,
  Store,
  FileText,
  MessageSquare,
  Code,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Globe className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">SEO Max</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              AI-Powered SEO Automation
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
              Automate Your WooCommerce
              <span className="text-primary"> SEO Success</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              The all-in-one platform that manages SEO for multiple stores. 
              AI-generated content, automatic meta optimization, and schema markup — all in one dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="gap-2 text-lg px-8">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  View Demo
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required • 14-day free trial
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-primary">10x</p>
              <p className="text-muted-foreground">Faster Content</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-primary">100%</p>
              <p className="text-muted-foreground">Schema Coverage</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-primary">50+</p>
              <p className="text-muted-foreground">SEO Checks</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold text-primary">24/7</p>
              <p className="text-muted-foreground">AI Optimization</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything You Need for E-Commerce SEO
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              One platform to manage SEO across all your WooCommerce stores
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Store className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-Store Management</h3>
              <p className="text-muted-foreground">
                Connect unlimited WooCommerce stores and manage all SEO from one dashboard. 
                Perfect for agencies and multi-brand businesses.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Content Generation</h3>
              <p className="text-muted-foreground">
                Generate SEO-optimized blog posts, product descriptions, and meta tags 
                with GPT-4 and Claude. Publish directly to WordPress.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Meta Optimization</h3>
              <p className="text-muted-foreground">
                Bulk edit meta titles and descriptions for products, pages, and posts. 
                AI suggestions ensure every page is optimized.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Code className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Schema Markup</h3>
              <p className="text-muted-foreground">
                Auto-generate Product, FAQ, HowTo, and LocalBusiness schemas. 
                Rich results without coding.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Answer Engine Ready</h3>
              <p className="text-muted-foreground">
                Optimize for ChatGPT, Google SGE, and voice search. 
                AEO tools ensure your content gets cited by AI.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl border bg-card hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">SEO Audits</h3>
              <p className="text-muted-foreground">
                Comprehensive SEO health scores for every page. 
                Get actionable recommendations and track improvements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 sm:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-xl text-muted-foreground">
              Three simple steps to automated SEO
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Install Plugin</h3>
              <p className="text-muted-foreground">
                Download our WordPress plugin and connect your WooCommerce store in one click.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Sync Content</h3>
              <p className="text-muted-foreground">
                Your products, pages, and posts sync automatically. See everything in one dashboard.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Optimize with AI</h3>
              <p className="text-muted-foreground">
                Let AI generate content and optimize meta tags. Changes push to your site automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              Start free, scale as you grow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="p-8 rounded-2xl border bg-card">
              <h3 className="text-xl font-semibold mb-2">Starter</h3>
              <p className="text-muted-foreground mb-4">For small stores</p>
              <p className="text-4xl font-bold mb-6">
                $49<span className="text-lg font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>1 store</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>500 AI generations/mo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>10 blog posts/mo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Email support</span>
                </li>
              </ul>
              <Link href="/signup">
                <Button variant="outline" className="w-full">Get Started</Button>
              </Link>
            </div>

            {/* Professional */}
            <div className="p-8 rounded-2xl border-2 border-primary bg-card relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <h3 className="text-xl font-semibold mb-2">Professional</h3>
              <p className="text-muted-foreground mb-4">For growing businesses</p>
              <p className="text-4xl font-bold mb-6">
                $99<span className="text-lg font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>5 stores</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>2,000 AI generations/mo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>50 blog posts/mo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Priority support</span>
                </li>
              </ul>
              <Link href="/signup">
                <Button className="w-full">Get Started</Button>
              </Link>
            </div>

            {/* Agency */}
            <div className="p-8 rounded-2xl border bg-card">
              <h3 className="text-xl font-semibold mb-2">Agency</h3>
              <p className="text-muted-foreground mb-4">For agencies & enterprises</p>
              <p className="text-4xl font-bold mb-6">
                $249<span className="text-lg font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Unlimited stores</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>10,000 AI generations/mo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Unlimited blog posts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Dedicated support</span>
                </li>
              </ul>
              <Link href="/signup">
                <Button variant="outline" className="w-full">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Automate Your SEO?
          </h2>
          <p className="text-xl opacity-90 mb-10">
            Join hundreds of WooCommerce stores using AI to rank higher and drive more traffic.
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="gap-2 text-lg px-8">
              Start Your Free Trial
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Globe className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">SEO Max</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered SEO automation for WooCommerce stores.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">Features</Link></li>
                <li><Link href="#" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="#" className="hover:text-foreground">Integrations</Link></li>
                <li><Link href="#" className="hover:text-foreground">Changelog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">Documentation</Link></li>
                <li><Link href="#" className="hover:text-foreground">Blog</Link></li>
                <li><Link href="#" className="hover:text-foreground">Support</Link></li>
                <li><Link href="#" className="hover:text-foreground">API</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">About</Link></li>
                <li><Link href="#" className="hover:text-foreground">Privacy</Link></li>
                <li><Link href="#" className="hover:text-foreground">Terms</Link></li>
                <li><Link href="#" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} SEO Max. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
