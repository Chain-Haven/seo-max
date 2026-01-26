"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAIProvider } from "@/lib/ai/provider";

interface QuestionOpportunity {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
  targetPage?: string;
  targetPageTitle?: string;
}

interface GeneratedFAQ {
  id?: string;
  question: string;
  answer: string;
  sourceQuery: string;
  impressions: number;
  targetUrl?: string;
  targetTitle?: string;
}

// Discover question-based queries from GSC data
export async function discoverQuestionOpportunities(
  storeId: string
): Promise<{ data: QuestionOpportunity[] | null; error: string | null }> {
  const supabase = await createClient();

  try {
    // Get GSC performance data
    const { data: gscData } = await supabase
      .from("gsc_performance_data")
      .select("query, page, clicks, impressions, position")
      .eq("store_id", storeId)
      .order("impressions", { ascending: false })
      .limit(500);

    if (!gscData || gscData.length === 0) {
      // Return simulated data for demo
      return {
        data: generateSimulatedQuestions(storeId),
        error: null,
      };
    }

    // Filter for question-type queries
    const questionWords = ["how", "what", "why", "when", "where", "which", "who", "can", "does", "is", "are", "should", "will", "do"];
    
    const questions: QuestionOpportunity[] = gscData
      .filter((row) => {
        const query = row.query?.toLowerCase() || "";
        return questionWords.some((word) => 
          query.startsWith(word + " ") || query.includes(" " + word + " ")
        );
      })
      .map((row) => ({
        query: row.query,
        impressions: row.impressions || 0,
        clicks: row.clicks || 0,
        position: row.position || 0,
        targetPage: row.page,
        targetPageTitle: undefined,
      }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 50);

    return { data: questions, error: null };
  } catch (error) {
    console.error("Error discovering questions:", error);
    return { data: null, error: "Failed to discover question opportunities" };
  }
}

// Generate simulated questions for demo
function generateSimulatedQuestions(storeId: string): QuestionOpportunity[] {
  const templates = [
    { query: "how to choose the right product", impressions: 1250 },
    { query: "what is the difference between options", impressions: 980 },
    { query: "how long does shipping take", impressions: 856 },
    { query: "can I return my order", impressions: 742 },
    { query: "what are the best practices for", impressions: 689 },
    { query: "how do I track my order", impressions: 623 },
    { query: "why should I choose this brand", impressions: 567 },
    { query: "when will my order arrive", impressions: 534 },
    { query: "is there a warranty included", impressions: 489 },
    { query: "how to maintain my product", impressions: 445 },
    { query: "what size should I order", impressions: 412 },
    { query: "can I get a discount", impressions: 378 },
    { query: "does this work with", impressions: 356 },
    { query: "where is the product made", impressions: 334 },
    { query: "how to contact customer support", impressions: 312 },
  ];

  return templates.map((t) => ({
    ...t,
    clicks: Math.floor(t.impressions * (0.02 + Math.random() * 0.05)),
    position: 5 + Math.floor(Math.random() * 20),
  }));
}

// Generate FAQ answers for selected questions
export async function generateFAQAnswers(
  storeId: string,
  questions: Array<{ query: string; impressions: number; targetUrl?: string; targetTitle?: string }>
): Promise<{ data: GeneratedFAQ[] | null; error: string | null }> {
  try {
    const ai = getAIProvider();
    const faqs: GeneratedFAQ[] = [];

    // Get store info for context
    const supabase = await createClient();
    const { data: store } = await supabase
      .from("stores")
      .select("name, url")
      .eq("id", storeId)
      .single();

    // Process in batches
    const batchSize = 5;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);

      const prompt = `You are a helpful FAQ writer for ${store?.name || "an online store"}.
Generate clear, helpful, and SEO-friendly answers for these customer questions.
Each answer should be 2-4 sentences, informative, and include relevant keywords naturally.

Questions:
${batch.map((q, idx) => `${idx + 1}. ${q.query}`).join("\n")}

Format your response as:
Q1: [Rephrase question in proper format]
A1: [Answer]

Q2: [Rephrase question in proper format]
A2: [Answer]

etc.`;

      const response = await ai.generateText(prompt, { maxTokens: 1500 });

      // Parse response
      const pairs = response.content.split(/Q\d+:/);
      
      batch.forEach((q, idx) => {
        const pair = pairs[idx + 1];
        if (pair) {
          const [question, answer] = pair.split(/A\d+:/);
          if (question && answer) {
            faqs.push({
              question: question.trim(),
              answer: answer.trim(),
              sourceQuery: q.query,
              impressions: q.impressions,
              targetUrl: q.targetUrl,
              targetTitle: q.targetTitle,
            });
          }
        }
      });
    }

    // Save FAQs to database
    const serviceClient = await createServiceClient();
    for (const faq of faqs) {
      const { data: inserted } = await serviceClient.from("generated_faqs").insert({
        store_id: storeId,
        target_entity_type: "page",
        target_url: faq.targetUrl,
        target_title: faq.targetTitle || "FAQ Page",
        question: faq.question,
        answer: faq.answer,
        source_query: faq.sourceQuery,
        query_impressions: faq.impressions,
        status: "suggested",
      }).select("id").single();

      if (inserted) {
        faq.id = inserted.id;
      }
    }

    revalidatePath(`/dashboard/stores/${storeId}/improvements`);

    return { data: faqs, error: null };
  } catch (error) {
    console.error("Error generating FAQs:", error);
    return { data: null, error: "Failed to generate FAQ answers" };
  }
}

// Get suggested FAQs for a store
export async function getSuggestedFAQs(
  storeId: string
): Promise<{ data: GeneratedFAQ[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("generated_faqs")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", "suggested")
    .order("query_impressions", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: data.map((f) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      sourceQuery: f.source_query,
      impressions: f.query_impressions || 0,
      targetUrl: f.target_url,
      targetTitle: f.target_title,
    })),
    error: null,
  };
}

// Approve and publish FAQs
export async function publishFAQs(
  storeId: string,
  faqIds: string[],
  targetPageId?: string
): Promise<{ success: boolean; publishedCount: number; error: string | null }> {
  const supabase = await createClient();

  try {
    // Get the FAQs
    const { data: faqs } = await supabase
      .from("generated_faqs")
      .select("*")
      .in("id", faqIds);

    if (!faqs || faqs.length === 0) {
      return { success: false, publishedCount: 0, error: "No FAQs found" };
    }

    // Generate FAQ section HTML
    const faqHtml = generateFAQHTML(faqs.map((f) => ({
      question: f.question,
      answer: f.answer,
    })));

    // If target page specified, append FAQ to page content
    if (targetPageId) {
      const { data: page } = await supabase
        .from("pages")
        .select("content")
        .eq("id", targetPageId)
        .single();

      if (page) {
        const updatedContent = (page.content || "") + "\n\n" + faqHtml;
        await supabase
          .from("pages")
          .update({ content: updatedContent, updated_at: new Date().toISOString() })
          .eq("id", targetPageId);
      }
    }

    // Mark FAQs as published
    await supabase
      .from("generated_faqs")
      .update({ 
        status: "published", 
        published_at: new Date().toISOString() 
      })
      .in("id", faqIds);

    // Create improvement record
    const serviceClient = await createServiceClient();
    await serviceClient.from("seo_improvements").insert({
      store_id: storeId,
      improvement_type: "faq_generation",
      entity_type: "page",
      entity_id: targetPageId,
      current_value: { faqCount: 0 },
      suggested_value: { 
        faqCount: faqs.length,
        faqs: faqs.map((f) => ({ q: f.question, a: f.answer })),
        html: faqHtml,
      },
      priority: "medium",
      impact_score: Math.min(100, faqs.length * 15),
      reason: `Added ${faqs.length} FAQs targeting search queries with ${faqs.reduce((sum, f) => sum + (f.query_impressions || 0), 0)} total impressions`,
      status: "applied",
      applied_at: new Date().toISOString(),
    });

    revalidatePath(`/dashboard/stores/${storeId}`);

    return { success: true, publishedCount: faqs.length, error: null };
  } catch (error) {
    console.error("Error publishing FAQs:", error);
    return { success: false, publishedCount: 0, error: "Failed to publish FAQs" };
  }
}

// Generate FAQ HTML with Schema markup
function generateFAQHTML(faqs: Array<{ question: string; answer: string }>): string {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  return `
<!-- FAQ Section -->
<section class="faq-section">
  <h2>Frequently Asked Questions</h2>
  ${faqs.map((faq) => `
  <div class="faq-item">
    <h3 class="faq-question">${faq.question}</h3>
    <p class="faq-answer">${faq.answer}</p>
  </div>
  `).join("")}
</section>

<script type="application/ld+json">
${JSON.stringify(faqSchema, null, 2)}
</script>
`;
}

// Reject/dismiss FAQs
export async function dismissFAQs(
  faqIds: string[]
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("generated_faqs")
    .update({ status: "rejected" })
    .in("id", faqIds);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Get FAQ schema JSON-LD for a page
export async function getFAQSchemaForPage(
  storeId: string,
  pageId: string
): Promise<{ data: string | null; error: string | null }> {
  const supabase = await createClient();

  const { data: faqs } = await supabase
    .from("generated_faqs")
    .select("question, answer")
    .eq("store_id", storeId)
    .eq("target_entity_id", pageId)
    .eq("status", "published");

  if (!faqs || faqs.length === 0) {
    return { data: null, error: null };
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  return { data: JSON.stringify(schema, null, 2), error: null };
}
