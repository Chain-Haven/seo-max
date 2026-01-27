import OpenAI from "openai";
import { getAIProvider } from "./provider";

export interface GeneratedImage {
  url: string;
  prompt: string;
  altText: string;
  type: "hero" | "infographic" | "product" | "illustration" | "diagram";
}

export interface ImageGenerationOptions {
  articleTitle: string;
  articleTopic: string;
  productInfo?: {
    name: string;
    category: string;
    description: string;
  };
  style?: "photorealistic" | "illustration" | "infographic" | "minimal" | "professional";
  imageTypes?: Array<"hero" | "infographic" | "product" | "illustration" | "diagram">;
}

// Get OpenAI client for DALL-E
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

// Generate image prompt based on context
export async function generateImagePrompt(
  options: ImageGenerationOptions,
  imageType: "hero" | "infographic" | "product" | "illustration" | "diagram"
): Promise<{ prompt: string; altText: string }> {
  const ai = getAIProvider();
  
  const contextPrompt = `Generate a DALL-E image prompt for a ${imageType} image.

Article: "${options.articleTitle}"
Topic: ${options.articleTopic}
${options.productInfo ? `Product: ${options.productInfo.name} (${options.productInfo.category}) - ${options.productInfo.description}` : ""}
Style preference: ${options.style || "professional"}

Requirements for ${imageType}:
${imageType === "hero" ? "- Wide format banner image that captures the essence of the article\n- Should be attention-grabbing and relevant\n- No text in the image" : ""}
${imageType === "infographic" ? "- Visual representation of data or process\n- Clean, organized layout\n- Minimal text, focus on visual elements" : ""}
${imageType === "product" ? "- Product-focused image showing the item in use or context\n- Professional product photography style\n- Clean background" : ""}
${imageType === "illustration" ? "- Artistic illustration related to the topic\n- Modern, engaging style\n- Conceptual representation" : ""}
${imageType === "diagram" ? "- Technical or process diagram\n- Clear, educational visual\n- Step-by-step or relationship visualization" : ""}

Provide:
1. A detailed DALL-E prompt (be specific about style, lighting, composition)
2. An SEO-optimized alt text for the image

Format as JSON:
{
  "prompt": "detailed DALL-E prompt here",
  "altText": "descriptive alt text with keywords"
}`;

  try {
    const response = await ai.generateText(contextPrompt, { maxTokens: 500 });
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        prompt: parsed.prompt || `Professional ${imageType} image for ${options.articleTitle}`,
        altText: parsed.altText || `${imageType} image for ${options.articleTitle}`,
      };
    }
  } catch (error) {
    console.error("Error generating prompt:", error);
  }
  
  // Fallback prompts
  const fallbackPrompts: Record<string, string> = {
    hero: `Professional wide banner image representing ${options.articleTopic}, modern clean aesthetic, soft lighting, high quality`,
    infographic: `Clean infographic visual about ${options.articleTopic}, minimal design, organized layout, professional colors`,
    product: options.productInfo 
      ? `Professional product photo of ${options.productInfo.name}, ${options.productInfo.category}, clean white background, studio lighting`
      : `Professional product image related to ${options.articleTopic}, clean background, studio quality`,
    illustration: `Modern illustration depicting ${options.articleTopic}, vibrant colors, contemporary style, conceptual art`,
    diagram: `Technical diagram explaining ${options.articleTopic}, clear labels, professional style, educational visual`,
  };
  
  return {
    prompt: fallbackPrompts[imageType] || fallbackPrompts.hero,
    altText: `${imageType.charAt(0).toUpperCase() + imageType.slice(1)} image for ${options.articleTitle}`,
  };
}

// Generate image using DALL-E
export async function generateImage(
  options: ImageGenerationOptions,
  imageType: "hero" | "infographic" | "product" | "illustration" | "diagram" = "hero"
): Promise<GeneratedImage | null> {
  const openai = getOpenAIClient();
  
  // Generate optimized prompt
  const { prompt, altText } = await generateImagePrompt(options, imageType);
  
  if (!openai) {
    console.log("OpenAI client not available, returning placeholder");
    // Return placeholder for development
    return {
      url: getPlaceholderUrl(imageType, options.articleTopic),
      prompt,
      altText,
      type: imageType,
    };
  }
  
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: imageType === "hero" ? "1792x1024" : "1024x1024",
      quality: "standard",
      style: options.style === "illustration" ? "vivid" : "natural",
    });
    
    const imageUrl = response.data?.[0]?.url;
    
    if (imageUrl) {
      return {
        url: imageUrl,
        prompt,
        altText,
        type: imageType,
      };
    }
  } catch (error) {
    console.error("Error generating image:", error);
  }
  
  // Fallback to placeholder
  return {
    url: getPlaceholderUrl(imageType, options.articleTopic),
    prompt,
    altText,
    type: imageType,
  };
}

// Generate multiple images for an article
export async function generateArticleImages(
  options: ImageGenerationOptions
): Promise<GeneratedImage[]> {
  const imageTypes = options.imageTypes || ["hero", "illustration"];
  const images: GeneratedImage[] = [];
  
  for (const type of imageTypes) {
    const image = await generateImage(options, type);
    if (image) {
      images.push(image);
    }
  }
  
  return images;
}

// Generate product-specific images
export async function generateProductImages(
  productName: string,
  productCategory: string,
  productDescription: string,
  count: number = 2
): Promise<GeneratedImage[]> {
  const options: ImageGenerationOptions = {
    articleTitle: productName,
    articleTopic: productCategory,
    productInfo: {
      name: productName,
      category: productCategory,
      description: productDescription,
    },
    style: "photorealistic",
  };
  
  const images: GeneratedImage[] = [];
  
  // Generate main product image
  const mainImage = await generateImage(options, "product");
  if (mainImage) images.push(mainImage);
  
  // Generate lifestyle/context image
  if (count > 1) {
    const lifestyleImage = await generateImage({
      ...options,
      style: "photorealistic",
    }, "illustration");
    if (lifestyleImage) images.push(lifestyleImage);
  }
  
  return images;
}

// Get placeholder URL for development
function getPlaceholderUrl(type: string, topic: string): string {
  const encodedTopic = encodeURIComponent(topic.substring(0, 30));
  const dimensions = type === "hero" ? "1792x1024" : "1024x1024";
  const colors: Record<string, string> = {
    hero: "667eea/ffffff",
    infographic: "48bb78/ffffff",
    product: "4299e1/ffffff",
    illustration: "ed8936/ffffff",
    diagram: "9f7aea/ffffff",
  };
  const color = colors[type] || "667eea/ffffff";
  
  return `https://via.placeholder.com/${dimensions}/${color}?text=${type}:+${encodedTopic}`;
}

// Suggest images for article outline sections
export async function suggestImagesForSections(
  articleTitle: string,
  sections: string[]
): Promise<Array<{ section: string; imageType: "infographic" | "illustration" | "diagram"; suggestion: string }>> {
  const ai = getAIProvider();
  
  const prompt = `For each section of this article, suggest whether an image would be helpful and what type.

Article: "${articleTitle}"
Sections:
${sections.map((s, i) => `${i + 1}. ${s}`).join("\n")}

For each section where an image would add value, suggest:
- Image type: infographic, illustration, or diagram
- Brief description of what the image should show

Format as JSON array:
[
  { "section": "section name", "imageType": "illustration", "suggestion": "description" }
]

Only include sections that would genuinely benefit from an image.`;

  try {
    const response = await ai.generateText(prompt, { maxTokens: 800 });
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Error suggesting images:", error);
  }
  
  return [];
}

// Create image for FAQ section
export async function generateFAQImage(
  question: string,
  answer: string,
  style: "infographic" | "illustration" = "illustration"
): Promise<GeneratedImage | null> {
  return generateImage({
    articleTitle: question,
    articleTopic: answer.substring(0, 100),
    style: style === "infographic" ? "minimal" : "illustration",
  }, style);
}
