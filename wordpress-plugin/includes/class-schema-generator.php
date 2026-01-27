<?php
/**
 * Schema Generator for WordPress
 * Generates structured data without conflicting with Yoast/RankMath
 */

if (!defined('ABSPATH')) {
    exit;
}

class SEO_Max_Schema_Generator {
    
    public function generate_for_post($post_id) {
        $post = get_post($post_id);
        
        if (!$post) {
            return null;
        }
        
        $post_type = $post->post_type;
        
        if ($post_type === 'product' && class_exists('WooCommerce')) {
            return $this->generate_product_schema($post_id);
        } elseif ($post_type === 'post') {
            return $this->generate_article_schema($post_id);
        } elseif ($post_type === 'page') {
            return $this->generate_webpage_schema($post_id);
        }
        
        return null;
    }
    
    private function generate_product_schema($product_id) {
        $product = wc_get_product($product_id);
        
        if (!$product) {
            return null;
        }
        
        $schema = array(
            '@context' => 'https://schema.org',
            '@type' => 'Product',
            'name' => $product->get_name(),
            'description' => wp_strip_all_tags($product->get_description()),
            'sku' => $product->get_sku(),
            'image' => array(),
        );
        
        // Images
        $image_id = $product->get_image_id();
        if ($image_id) {
            $schema['image'][] = wp_get_attachment_url($image_id);
        }
        
        foreach ($product->get_gallery_image_ids() as $gallery_id) {
            $schema['image'][] = wp_get_attachment_url($gallery_id);
        }
        
        // Brand
        $brand_terms = get_the_terms($product_id, 'product_brand');
        if ($brand_terms && !is_wp_error($brand_terms)) {
            $schema['brand'] = array(
                '@type' => 'Brand',
                'name' => $brand_terms[0]->name,
            );
        }
        
        // Offers
        $schema['offers'] = array(
            '@type' => 'Offer',
            'url' => get_permalink($product_id),
            'priceCurrency' => get_woocommerce_currency(),
            'price' => $product->get_price(),
            'availability' => $this->get_availability_schema($product->get_stock_status()),
            'priceValidUntil' => date('Y-m-d', strtotime('+1 year')),
        );
        
        // Sale price
        if ($product->is_on_sale()) {
            $schema['offers']['priceValidUntil'] = $product->get_date_on_sale_to() 
                ? $product->get_date_on_sale_to()->format('Y-m-d') 
                : date('Y-m-d', strtotime('+30 days'));
        }
        
        // Reviews
        $average_rating = $product->get_average_rating();
        $review_count = $product->get_review_count();
        
        if ($average_rating > 0 && $review_count > 0) {
            $schema['aggregateRating'] = array(
                '@type' => 'AggregateRating',
                'ratingValue' => $average_rating,
                'reviewCount' => $review_count,
                'bestRating' => '5',
                'worstRating' => '1',
            );
        }
        
        return $schema;
    }
    
    private function generate_article_schema($post_id) {
        $post = get_post($post_id);
        
        $schema = array(
            '@context' => 'https://schema.org',
            '@type' => 'Article',
            'headline' => get_the_title($post_id),
            'description' => get_the_excerpt($post),
            'datePublished' => get_the_date('c', $post),
            'dateModified' => get_the_modified_date('c', $post),
            'author' => array(
                '@type' => 'Person',
                'name' => get_the_author_meta('display_name', $post->post_author),
            ),
            'publisher' => array(
                '@type' => 'Organization',
                'name' => get_bloginfo('name'),
                'logo' => array(
                    '@type' => 'ImageObject',
                    'url' => get_site_icon_url(),
                ),
            ),
        );
        
        // Featured image
        if (has_post_thumbnail($post_id)) {
            $schema['image'] = get_the_post_thumbnail_url($post_id, 'full');
        }
        
        return $schema;
    }
    
    private function generate_webpage_schema($post_id) {
        return array(
            '@context' => 'https://schema.org',
            '@type' => 'WebPage',
            'name' => get_the_title($post_id),
            'description' => get_the_excerpt($post_id),
            'url' => get_permalink($post_id),
        );
    }
    
    private function get_availability_schema($stock_status) {
        switch ($stock_status) {
            case 'instock':
                return 'https://schema.org/InStock';
            case 'outofstock':
                return 'https://schema.org/OutOfStock';
            case 'onbackorder':
                return 'https://schema.org/BackOrder';
            case 'preorder':
                return 'https://schema.org/PreOrder';
            default:
                return 'https://schema.org/InStock';
        }
    }
    
    /**
     * Output schema in page head
     */
    public function output_schema($post_id) {
        // Check if other plugins are managing schema
        $conflict_detector = new SEO_Max_Conflict_Detector();
        if ($conflict_detector->has_conflicts() && !get_option('seo_max_override_schema', false)) {
            return;
        }
        
        $schema = $this->generate_for_post($post_id);
        
        if ($schema) {
            echo '<script type="application/ld+json">';
            echo wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
            echo '</script>';
        }
    }
}

// Hook to output schema
add_action('wp_head', function() {
    if (is_singular()) {
        $generator = new SEO_Max_Schema_Generator();
        $generator->output_schema(get_the_ID());
    }
}, 5); // Low priority to run after Yoast/RankMath
