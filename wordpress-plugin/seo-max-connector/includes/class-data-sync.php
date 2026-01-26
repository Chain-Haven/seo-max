<?php
/**
 * Data Sync class for syncing WordPress data to SEO Max
 */

if (!defined('ABSPATH')) {
    exit;
}

class SEO_Max_Data_Sync {
    
    /**
     * API client instance
     */
    private $api_client;
    
    /**
     * Constructor
     */
    public function __construct($api_client) {
        $this->api_client = $api_client;
        $this->init_hooks();
    }
    
    /**
     * Initialize hooks for auto-sync
     */
    private function init_hooks() {
        // WooCommerce product hooks
        add_action('woocommerce_update_product', array($this, 'on_product_update'), 10, 1);
        add_action('woocommerce_new_product', array($this, 'on_product_update'), 10, 1);
        add_action('before_delete_post', array($this, 'on_product_delete'), 10, 1);
        
        // Post hooks
        add_action('save_post', array($this, 'on_post_save'), 10, 3);
        add_action('before_delete_post', array($this, 'on_post_delete'), 10, 1);
        
        // Page hooks
        add_action('save_post_page', array($this, 'on_page_save'), 10, 3);
    }
    
    /**
     * Sync all data to platform
     */
    public function sync_all() {
        $results = array(
            'products' => $this->sync_products(),
            'pages' => $this->sync_pages(),
            'blog_posts' => $this->sync_blog_posts(),
        );
        
        $this->log_sync('full_sync', $results);
        
        return $results;
    }
    
    /**
     * Sync all products
     */
    public function sync_products() {
        if (!class_exists('WooCommerce')) {
            return array('success' => true, 'message' => 'WooCommerce not active', 'count' => 0);
        }
        
        $products = $this->get_all_products();
        
        if (empty($products)) {
            return array('success' => true, 'message' => 'No products to sync', 'count' => 0);
        }
        
        $result = $this->api_client->sync_products($products);
        $result['count'] = count($products);
        
        return $result;
    }
    
    /**
     * Sync all pages
     */
    public function sync_pages() {
        $pages = $this->get_all_pages();
        
        if (empty($pages)) {
            return array('success' => true, 'message' => 'No pages to sync', 'count' => 0);
        }
        
        $result = $this->api_client->sync_pages($pages);
        $result['count'] = count($pages);
        
        return $result;
    }
    
    /**
     * Sync all blog posts
     */
    public function sync_blog_posts() {
        $posts = $this->get_all_blog_posts();
        
        if (empty($posts)) {
            return array('success' => true, 'message' => 'No posts to sync', 'count' => 0);
        }
        
        $result = $this->api_client->sync_blog_posts($posts);
        $result['count'] = count($posts);
        
        return $result;
    }
    
    /**
     * Get all products formatted for API
     */
    private function get_all_products() {
        if (!class_exists('WooCommerce')) {
            return array();
        }
        
        $products = array();
        
        $args = array(
            'status' => 'publish',
            'limit' => -1,
        );
        
        $wc_products = wc_get_products($args);
        
        foreach ($wc_products as $product) {
            $products[] = $this->format_product($product);
        }
        
        return $products;
    }
    
    /**
     * Format a product for API
     */
    private function format_product($product) {
        $images = array();
        
        // Get product images
        $image_ids = $product->get_gallery_image_ids();
        array_unshift($image_ids, $product->get_image_id());
        
        foreach ($image_ids as $image_id) {
            if ($image_id) {
                $images[] = array(
                    'id' => $image_id,
                    'url' => wp_get_attachment_url($image_id),
                    'alt' => get_post_meta($image_id, '_wp_attachment_image_alt', true),
                );
            }
        }
        
        // Get meta title and description (check various SEO plugins)
        $meta_title = $this->get_meta_title($product->get_id(), 'product');
        $meta_description = $this->get_meta_description($product->get_id(), 'product');
        
        return array(
            'external_id' => (string) $product->get_id(),
            'name' => $product->get_name(),
            'description' => $product->get_description(),
            'short_description' => $product->get_short_description(),
            'meta_title' => $meta_title,
            'meta_description' => $meta_description,
            'images' => $images,
            'categories' => wp_get_post_terms($product->get_id(), 'product_cat', array('fields' => 'names')),
            'url' => $product->get_permalink(),
            'price' => $product->get_price(),
            'status' => $product->get_status(),
        );
    }
    
    /**
     * Get all pages formatted for API
     */
    private function get_all_pages() {
        $pages = array();
        
        $args = array(
            'post_type' => 'page',
            'post_status' => 'publish',
            'posts_per_page' => -1,
        );
        
        $wp_pages = get_posts($args);
        
        foreach ($wp_pages as $page) {
            $pages[] = $this->format_page($page);
        }
        
        return $pages;
    }
    
    /**
     * Format a page for API
     */
    private function format_page($page) {
        $page_type = 'other';
        
        // Detect page type
        if ($page->ID == get_option('page_on_front')) {
            $page_type = 'homepage';
        } elseif (stripos($page->post_name, 'about') !== false) {
            $page_type = 'about';
        } elseif (stripos($page->post_name, 'contact') !== false) {
            $page_type = 'contact';
        } elseif (stripos($page->post_name, 'privacy') !== false || 
                  stripos($page->post_name, 'terms') !== false ||
                  stripos($page->post_name, 'policy') !== false) {
            $page_type = 'policy';
        }
        
        return array(
            'external_id' => (string) $page->ID,
            'title' => $page->post_title,
            'page_type' => $page_type,
            'meta_title' => $this->get_meta_title($page->ID, 'page'),
            'meta_description' => $this->get_meta_description($page->ID, 'page'),
            'url' => get_permalink($page->ID),
        );
    }
    
    /**
     * Get all blog posts formatted for API
     */
    private function get_all_blog_posts() {
        $posts = array();
        
        $args = array(
            'post_type' => 'post',
            'post_status' => array('publish', 'draft', 'pending'),
            'posts_per_page' => -1,
        );
        
        $wp_posts = get_posts($args);
        
        foreach ($wp_posts as $post) {
            $posts[] = $this->format_blog_post($post);
        }
        
        return $posts;
    }
    
    /**
     * Format a blog post for API
     */
    private function format_blog_post($post) {
        return array(
            'external_id' => (string) $post->ID,
            'title' => $post->post_title,
            'content' => $post->post_content,
            'meta_title' => $this->get_meta_title($post->ID, 'post'),
            'meta_description' => $this->get_meta_description($post->ID, 'post'),
            'status' => $post->post_status === 'publish' ? 'published' : $post->post_status,
            'published_at' => $post->post_status === 'publish' ? $post->post_date : null,
            'url' => get_permalink($post->ID),
            'categories' => wp_get_post_categories($post->ID, array('fields' => 'names')),
        );
    }
    
    /**
     * Get meta title (checks various SEO plugins)
     */
    private function get_meta_title($post_id, $post_type) {
        // Check Yoast SEO
        $title = get_post_meta($post_id, '_yoast_wpseo_title', true);
        if (!empty($title)) return $title;
        
        // Check Rank Math
        $title = get_post_meta($post_id, 'rank_math_title', true);
        if (!empty($title)) return $title;
        
        // Check All in One SEO
        $title = get_post_meta($post_id, '_aioseo_title', true);
        if (!empty($title)) return $title;
        
        // Check SEOPress
        $title = get_post_meta($post_id, '_seopress_titles_title', true);
        if (!empty($title)) return $title;
        
        // Default to post title
        return get_the_title($post_id);
    }
    
    /**
     * Get meta description (checks various SEO plugins)
     */
    private function get_meta_description($post_id, $post_type) {
        // Check Yoast SEO
        $desc = get_post_meta($post_id, '_yoast_wpseo_metadesc', true);
        if (!empty($desc)) return $desc;
        
        // Check Rank Math
        $desc = get_post_meta($post_id, 'rank_math_description', true);
        if (!empty($desc)) return $desc;
        
        // Check All in One SEO
        $desc = get_post_meta($post_id, '_aioseo_description', true);
        if (!empty($desc)) return $desc;
        
        // Check SEOPress
        $desc = get_post_meta($post_id, '_seopress_titles_desc', true);
        if (!empty($desc)) return $desc;
        
        // Generate from excerpt or content
        $post = get_post($post_id);
        if ($post) {
            if (!empty($post->post_excerpt)) {
                return wp_trim_words($post->post_excerpt, 25, '...');
            }
            return wp_trim_words(strip_tags($post->post_content), 25, '...');
        }
        
        return '';
    }
    
    /**
     * Handle product update
     */
    public function on_product_update($product_id) {
        if (!seo_max()->is_connected()) {
            return;
        }
        
        $product = wc_get_product($product_id);
        if (!$product) {
            return;
        }
        
        $this->api_client->send_webhook_event('product.updated', array(
            'external_id' => (string) $product_id,
            'name' => $product->get_name(),
            'description' => $product->get_description(),
            'meta_title' => $this->get_meta_title($product_id, 'product'),
            'meta_description' => $this->get_meta_description($product_id, 'product'),
        ));
    }
    
    /**
     * Handle product delete
     */
    public function on_product_delete($post_id) {
        if (!seo_max()->is_connected()) {
            return;
        }
        
        if (get_post_type($post_id) !== 'product') {
            return;
        }
        
        $this->api_client->send_webhook_event('product.deleted', array(
            'external_id' => (string) $post_id,
        ));
    }
    
    /**
     * Handle post save
     */
    public function on_post_save($post_id, $post, $update) {
        if (!seo_max()->is_connected()) {
            return;
        }
        
        if ($post->post_type !== 'post' || $post->post_status === 'auto-draft') {
            return;
        }
        
        $event = $update ? 'post.updated' : 'post.created';
        
        $this->api_client->send_webhook_event($event, array(
            'external_id' => (string) $post_id,
            'title' => $post->post_title,
            'content' => $post->post_content,
            'meta_title' => $this->get_meta_title($post_id, 'post'),
            'meta_description' => $this->get_meta_description($post_id, 'post'),
            'status' => $post->post_status === 'publish' ? 'published' : $post->post_status,
            'published_at' => $post->post_status === 'publish' ? $post->post_date : null,
        ));
    }
    
    /**
     * Handle post delete
     */
    public function on_post_delete($post_id) {
        if (!seo_max()->is_connected()) {
            return;
        }
        
        $post_type = get_post_type($post_id);
        
        if ($post_type === 'post') {
            $this->api_client->send_webhook_event('post.deleted', array(
                'external_id' => (string) $post_id,
            ));
        } elseif ($post_type === 'page') {
            $this->api_client->send_webhook_event('page.deleted', array(
                'external_id' => (string) $post_id,
            ));
        }
    }
    
    /**
     * Handle page save
     */
    public function on_page_save($post_id, $post, $update) {
        if (!seo_max()->is_connected()) {
            return;
        }
        
        if ($post->post_status === 'auto-draft') {
            return;
        }
        
        $event = $update ? 'page.updated' : 'page.created';
        
        $this->api_client->send_webhook_event($event, array(
            'external_id' => (string) $post_id,
            'title' => $post->post_title,
            'meta_title' => $this->get_meta_title($post_id, 'page'),
            'meta_description' => $this->get_meta_description($post_id, 'page'),
        ));
    }
    
    /**
     * Log sync activity
     */
    private function log_sync($type, $results) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'seo_max_sync_log';
        
        $items_synced = 0;
        $status = 'success';
        $messages = array();
        
        foreach ($results as $key => $result) {
            if (isset($result['count'])) {
                $items_synced += $result['count'];
            }
            if (isset($result['success']) && !$result['success']) {
                $status = 'error';
                $messages[] = $key . ': ' . (isset($result['error']) ? $result['error'] : 'Unknown error');
            }
        }
        
        $wpdb->insert($table_name, array(
            'sync_type' => $type,
            'items_synced' => $items_synced,
            'status' => $status,
            'message' => !empty($messages) ? implode('; ', $messages) : 'Sync completed successfully',
        ));
    }
}
