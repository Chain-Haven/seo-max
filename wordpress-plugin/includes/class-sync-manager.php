<?php
/**
 * Sync Manager
 * Handles bidirectional sync between WordPress and SEO Max platform
 */

if (!defined('ABSPATH')) {
    exit;
}

class SEO_Max_Sync_Manager {
    private $api_client;
    
    public function __construct() {
        $this->api_client = new SEO_Max_API_Client();
    }
    
    /**
     * Sync a post to the platform
     */
    public function sync_post($post_id) {
        $post = get_post($post_id);
        
        if (!$post || $post->post_status !== 'publish') {
            return false;
        }
        
        $data = array(
            'external_id' => strval($post_id),
            'title' => $post->post_title,
            'content' => $post->post_content,
            'meta_title' => get_post_meta($post_id, '_seo_max_title', true) ?: $post->post_title,
            'meta_description' => get_post_meta($post_id, '_seo_max_description', true),
            'status' => 'published',
            'published_at' => $post->post_date_gmt,
            'updated_at' => $post->post_modified_gmt,
        );
        
        return $this->api_client->sync_blog_post($data);
    }
    
    /**
     * Sync a WooCommerce product
     */
    public function sync_product($product_id) {
        if (!class_exists('WooCommerce')) {
            return false;
        }
        
        $product = wc_get_product($product_id);
        
        if (!$product) {
            return false;
        }
        
        $images = array();
        $image_id = $product->get_image_id();
        if ($image_id) {
            $images[] = wp_get_attachment_url($image_id);
        }
        
        foreach ($product->get_gallery_image_ids() as $gallery_id) {
            $images[] = wp_get_attachment_url($gallery_id);
        }
        
        $data = array(
            'external_id' => strval($product_id),
            'name' => $product->get_name(),
            'description' => $product->get_description(),
            'meta_title' => get_post_meta($product_id, '_seo_max_title', true) ?: $product->get_name(),
            'meta_description' => get_post_meta($product_id, '_seo_max_description', true) ?: $product->get_short_description(),
            'images' => $images,
            'category' => $this->get_product_categories($product),
            'price' => $product->get_price(),
            'sale_price' => $product->get_sale_price(),
            'sku' => $product->get_sku(),
            'stock_status' => $product->get_stock_status(),
            'updated_at' => current_time('mysql'),
        );
        
        return $this->api_client->sync_product($data);
    }
    
    /**
     * Full sync (all posts and products)
     */
    public function full_sync() {
        $synced = array(
            'posts' => 0,
            'products' => 0,
            'errors' => array(),
        );
        
        // Sync posts
        $posts = get_posts(array(
            'post_type' => 'post',
            'post_status' => 'publish',
            'numberposts' => -1,
        ));
        
        foreach ($posts as $post) {
            if ($this->sync_post($post->ID)) {
                $synced['posts']++;
            } else {
                $synced['errors'][] = "Failed to sync post: {$post->ID}";
            }
        }
        
        // Sync products
        if (class_exists('WooCommerce')) {
            $products = wc_get_products(array(
                'limit' => -1,
                'status' => 'publish',
            ));
            
            foreach ($products as $product) {
                if ($this->sync_product($product->get_id())) {
                    $synced['products']++;
                } else {
                    $synced['errors'][] = "Failed to sync product: {$product->get_id()}";
                }
            }
        }
        
        update_option('seo_max_last_full_sync', current_time('mysql'));
        
        return $synced;
    }
    
    /**
     * Incremental sync (only updated content)
     */
    public function incremental_sync() {
        $last_sync = get_option('seo_max_last_sync', '1970-01-01 00:00:00');
        
        $synced = array(
            'posts' => 0,
            'products' => 0,
        );
        
        // Posts modified since last sync
        $posts = get_posts(array(
            'post_type' => 'post',
            'post_status' => 'publish',
            'date_query' => array(
                array(
                    'column' => 'post_modified_gmt',
                    'after' => $last_sync,
                ),
            ),
            'numberposts' => -1,
        ));
        
        foreach ($posts as $post) {
            if ($this->sync_post($post->ID)) {
                $synced['posts']++;
            }
        }
        
        // Products
        if (class_exists('WooCommerce')) {
            $products = wc_get_products(array(
                'limit' => -1,
                'status' => 'publish',
                'date_modified' => '>' . $last_sync,
            ));
            
            foreach ($products as $product) {
                if ($this->sync_product($product->get_id())) {
                    $synced['products']++;
                }
            }
        }
        
        update_option('seo_max_last_sync', current_time('mysql'));
        
        return $synced;
    }
    
    /**
     * Pull improvements from platform and apply them
     */
    public function pull_and_apply_improvements() {
        $improvements = $this->api_client->get_improvements();
        
        if (!$improvements || !isset($improvements['improvements'])) {
            return array('applied' => 0, 'errors' => array());
        }
        
        $applied = 0;
        $errors = array();
        
        foreach ($improvements['improvements'] as $improvement) {
            if ($improvement['status'] !== 'pending') {
                continue;
            }
            
            // Check if auto-apply is enabled for this type
            $auto_apply_types = get_option('seo_max_auto_apply_types', array());
            if (!in_array($improvement['improvement_type'], $auto_apply_types)) {
                continue;
            }
            
            $result = $this->apply_improvement_locally($improvement);
            
            if ($result) {
                $applied++;
                // Mark as applied on platform
                $this->api_client->mark_improvement_applied($improvement['id']);
            } else {
                $errors[] = "Failed to apply improvement: {$improvement['id']}";
            }
        }
        
        return array('applied' => $applied, 'errors' => $errors);
    }
    
    private function apply_improvement_locally($improvement) {
        $entity_type = $improvement['entity_type'];
        $entity_id = $improvement['entity_id'];
        
        // Convert UUID to WordPress ID (would need mapping table)
        $wp_id = $this->get_wp_id_from_uuid($entity_type, $entity_id);
        
        if (!$wp_id) {
            return false;
        }
        
        $conflict_detector = new SEO_Max_Conflict_Detector();
        
        switch ($improvement['improvement_type']) {
            case 'meta_optimization':
                // Only apply if no conflicts
                if (!$conflict_detector->should_disable_feature('meta_title')) {
                    $suggested = $improvement['suggested_value'];
                    if (isset($suggested['meta_title'])) {
                        update_post_meta($wp_id, '_seo_max_title', $suggested['meta_title']);
                    }
                    if (isset($suggested['meta_description'])) {
                        update_post_meta($wp_id, '_seo_max_description', $suggested['meta_description']);
                    }
                    return true;
                }
                break;
                
            case 'content_freshness':
                // Can suggest but not auto-apply
                return false;
                
            case 'image_optimization':
                // Queue for optimization
                return $this->queue_image_optimization($wp_id, $improvement);
                
            case 'faq_generation':
                // Add FAQs to content
                return $this->add_faqs_to_content($wp_id, $improvement);
                
            default:
                return false;
        }
        
        return false;
    }
    
    private function get_wp_id_from_uuid($entity_type, $uuid) {
        // Query posts/products that have this UUID stored
        $args = array(
            'post_type' => $entity_type === 'product' ? 'product' : 'post',
            'meta_query' => array(
                array(
                    'key' => '_seo_max_uuid',
                    'value' => $uuid,
                ),
            ),
            'posts_per_page' => 1,
        );
        
        $posts = get_posts($args);
        
        return !empty($posts) ? $posts[0]->ID : null;
    }
    
    private function queue_image_optimization($post_id, $improvement) {
        // Add to optimization queue
        $queue = get_option('seo_max_image_queue', array());
        $queue[] = array(
            'post_id' => $post_id,
            'improvement_id' => $improvement['id'],
            'queued_at' => current_time('mysql'),
        );
        update_option('seo_max_image_queue', $queue);
        
        return true;
    }
    
    private function add_faqs_to_content($post_id, $improvement) {
        $post = get_post($post_id);
        if (!$post) return false;
        
        $faqs = $improvement['suggested_value']['faqs'] ?? array();
        if (empty($faqs)) return false;
        
        // Generate FAQ HTML
        $faq_html = "\n\n<h2>Frequently Asked Questions</h2>\n\n";
        
        foreach ($faqs as $faq) {
            $faq_html .= "<h3>{$faq['question']}</h3>\n";
            $faq_html .= "<p>{$faq['answer']}</p>\n\n";
        }
        
        // Append to content
        $new_content = $post->post_content . $faq_html;
        
        wp_update_post(array(
            'ID' => $post_id,
            'post_content' => $new_content,
        ));
        
        return true;
    }
    
    private function get_product_categories($product) {
        $terms = get_the_terms($product->get_id(), 'product_cat');
        
        if (!$terms || is_wp_error($terms)) {
            return 'Uncategorized';
        }
        
        $categories = array_map(function($term) {
            return $term->name;
        }, $terms);
        
        return implode(' > ', $categories);
    }
}
