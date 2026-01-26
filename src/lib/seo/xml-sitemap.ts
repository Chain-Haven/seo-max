/**
 * XML Sitemap Generator
 * Creates optimized sitemaps for SEO
 */

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
  images?: SitemapImage[];
}

export interface SitemapImage {
  loc: string;
  title?: string;
  caption?: string;
}

export interface SitemapConfig {
  baseUrl: string;
  includeProducts?: boolean;
  includePages?: boolean;
  includeBlogPosts?: boolean;
  includeCategories?: boolean;
  defaultChangefreq?: SitemapUrl["changefreq"];
  defaultPriority?: number;
}

export function generateXmlSitemap(urls: SitemapUrl[]): string {
  const urlEntries = urls
    .map((url) => {
      let entry = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>`;

      if (url.lastmod) {
        entry += `\n    <lastmod>${url.lastmod}</lastmod>`;
      }

      if (url.changefreq) {
        entry += `\n    <changefreq>${url.changefreq}</changefreq>`;
      }

      if (url.priority !== undefined) {
        entry += `\n    <priority>${url.priority.toFixed(1)}</priority>`;
      }

      // Add image entries
      if (url.images && url.images.length > 0) {
        for (const image of url.images) {
          entry += `\n    <image:image>`;
          entry += `\n      <image:loc>${escapeXml(image.loc)}</image:loc>`;
          if (image.title) {
            entry += `\n      <image:title>${escapeXml(image.title)}</image:title>`;
          }
          if (image.caption) {
            entry += `\n      <image:caption>${escapeXml(image.caption)}</image:caption>`;
          }
          entry += `\n    </image:image>`;
        }
      }

      entry += `\n  </url>`;
      return entry;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries}
</urlset>`;
}

export function generateSitemapIndex(sitemaps: { loc: string; lastmod?: string }[]): string {
  const entries = sitemaps
    .map((sitemap) => {
      let entry = `  <sitemap>\n    <loc>${escapeXml(sitemap.loc)}</loc>`;
      if (sitemap.lastmod) {
        entry += `\n    <lastmod>${sitemap.lastmod}</lastmod>`;
      }
      entry += `\n  </sitemap>`;
      return entry;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Generate sitemap from store data
export function generateStoreSitemap(
  config: SitemapConfig,
  data: {
    products?: Array<{
      slug: string;
      updatedAt?: string;
      images?: string[];
      name?: string;
    }>;
    pages?: Array<{
      slug: string;
      updatedAt?: string;
    }>;
    blogPosts?: Array<{
      slug: string;
      updatedAt?: string;
      featuredImage?: string;
      title?: string;
    }>;
    categories?: Array<{
      slug: string;
      updatedAt?: string;
    }>;
  }
): string {
  const urls: SitemapUrl[] = [];
  const baseUrl = config.baseUrl.replace(/\/$/, "");

  // Homepage
  urls.push({
    loc: baseUrl,
    changefreq: "daily",
    priority: 1.0,
  });

  // Products
  if (config.includeProducts && data.products) {
    for (const product of data.products) {
      const url: SitemapUrl = {
        loc: `${baseUrl}/products/${product.slug}`,
        lastmod: product.updatedAt?.split("T")[0],
        changefreq: "weekly",
        priority: 0.8,
      };

      if (product.images && product.images.length > 0) {
        url.images = product.images.map((img) => ({
          loc: img,
          title: product.name,
        }));
      }

      urls.push(url);
    }
  }

  // Pages
  if (config.includePages && data.pages) {
    for (const page of data.pages) {
      urls.push({
        loc: `${baseUrl}/${page.slug}`,
        lastmod: page.updatedAt?.split("T")[0],
        changefreq: "monthly",
        priority: 0.6,
      });
    }
  }

  // Blog posts
  if (config.includeBlogPosts && data.blogPosts) {
    for (const post of data.blogPosts) {
      const url: SitemapUrl = {
        loc: `${baseUrl}/blog/${post.slug}`,
        lastmod: post.updatedAt?.split("T")[0],
        changefreq: "monthly",
        priority: 0.7,
      };

      if (post.featuredImage) {
        url.images = [
          {
            loc: post.featuredImage,
            title: post.title,
          },
        ];
      }

      urls.push(url);
    }
  }

  // Categories
  if (config.includeCategories && data.categories) {
    for (const category of data.categories) {
      urls.push({
        loc: `${baseUrl}/collections/${category.slug}`,
        lastmod: category.updatedAt?.split("T")[0],
        changefreq: "weekly",
        priority: 0.7,
      });
    }
  }

  return generateXmlSitemap(urls);
}

// Validate sitemap URL count
export function validateSitemap(xml: string): {
  isValid: boolean;
  urlCount: number;
  errors: string[];
} {
  const errors: string[] = [];
  const urlMatches = xml.match(/<url>/g);
  const urlCount = urlMatches?.length || 0;

  if (urlCount > 50000) {
    errors.push("Sitemap exceeds 50,000 URL limit");
  }

  const sizeInBytes = new TextEncoder().encode(xml).length;
  if (sizeInBytes > 50 * 1024 * 1024) {
    errors.push("Sitemap exceeds 50MB size limit");
  }

  return {
    isValid: errors.length === 0,
    urlCount,
    errors,
  };
}
