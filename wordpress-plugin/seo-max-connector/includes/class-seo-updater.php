<?php
/**
 * SEO Updater - Apply SEO changes from SEO Max platform
 */

if (!defined('ABSPATH')) {
    exit;
}

class SEO_Max_SEO_Updater {
    
    /**
     * Constructor
     */
    public function __construct() {
        // Initialize
    }
    
    /**
     * Update product SEO data
     */
    public function update_product_seo($product_id, $data) {
        if (!class_exists('WooCommerce')) {
            return new WP_Error('woocommerce_not_active', 'WooCommerce is not active');
        }
        
        $product = wc_get_product($product_id);
        if (!$product) {
            return new WP_Error('product_not_found', 'Product not found');
        }
        
        $updated = array();
        
        // Update meta title
        if (isset($data['meta_title'])) {
            $this->set_meta_title($product_id, $data['meta_title']);
            $updated['meta_title'] = $data['meta_title'];
        }
        
        // Update meta description
        if (isset($data['meta_description'])) {
            $this->set_meta_description($product_id, $data['meta_description']);
            $updated['meta_description'] = $data['meta_description'];
        }
        
        // Update product description
        if (isset($data['description'])) {
            $product->set_description($data['description']);
            $product->save();
            $updated['description'] = true;
        }
        
        // Update image alt texts
        if (isset($data['images']) && is_array($data['images'])) {
            foreach ($data['images'] as $image) {
                if (isset($image['id']) && isset($image['alt'])) {
                    update_post_meta($image['id'], '_wp_attachment_image_alt', sanitize_text_field($image['alt']));
                    $updated['images'][] = $image['id'];
                }
            }
        }
        
        // Update schema markup
        if (isset($data['schema_markup'])) {
            update_post_meta($product_id, '_seo_max_schema', $data['schema_markup']);
            $updated['schema_markup'] = true;
        }
        
        return array(
            'success' => true,
            'product_id' => $product_id,
            'updated' => $updated,
        );
    }
    
    /**
     * Update page SEO data
     */
    public function update_page_seo($page_id, $data) {
        $page = get_post($page_id);
        if (!$page || $page->post_type !== 'page') {
            return new WP_Error('page_not_found', 'Page not found');
        }
        
        $updated = array();
        
        // Update meta title
        if (isset($data['meta_title'])) {
            $this->set_meta_title($page_id, $data['meta_title']);
            $updated['meta_title'] = $data['meta_title'];
        }
        
        // Update meta description
        if (isset($data['meta_description'])) {
            $this->set_meta_description($page_id, $data['meta_description']);
            $updated['meta_description'] = $data['meta_description'];
        }
        
        // Update schema markup
        if (isset($data['schema_markup'])) {
            update_post_meta($page_id, '_seo_max_schema', $data['schema_markup']);
            $updated['schema_markup'] = true;
        }
        
        return array(
            'success' => true,
            'page_id' => $page_id,
            'updated' => $updated,
        );
    }
    
    /**
     * Update blog post SEO data
     */
    public function update_post_seo($post_id, $data) {
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'post') {
            return new WP_Error('post_not_found', 'Post not found');
        }
        
        $updated = array();
        
        // Update meta title
        if (isset($data['meta_title'])) {
            $this->set_meta_title($post_id, $data['meta_title']);
            $updated['meta_title'] = $data['meta_title'];
        }
        
        // Update meta description
        if (isset($data['meta_description'])) {
            $this->set_meta_description($post_id, $data['meta_description']);
            $updated['meta_description'] = $data['meta_description'];
        }
        
        // Update content
        if (isset($data['content'])) {
            wp_update_post(array(
                'ID' => $post_id,
                'post_content' => $data['content'],
            ));
            $updated['content'] = true;
        }
        
        // Update schema markup
        if (isset($data['schema_markup'])) {
            update_post_meta($post_id, '_seo_max_schema', $data['schema_markup']);
            $updated['schema_markup'] = true;
        }
        
        return array(
            'success' => true,
            'post_id' => $post_id,
            'updated' => $updated,
        );
    }
    
    /**
     * Create a new blog post
     */
    public function create_blog_post($data) {
        $post_data = array(
            'post_title' => sanitize_text_field($data['title']),
            'post_content' => wp_kses_post($data['content']),
            'post_status' => isset($data['status']) ? $data['status'] : 'draft',
            'post_type' => 'post',
            'post_author' => get_current_user_id() ?: 1,
        );
        
        // Set categories if provided
        if (isset($data['categories']) && is_array($data['categories'])) {
            $category_ids = array();
            foreach ($data['categories'] as $cat_name) {
                $cat = get_category_by_slug(sanitize_title($cat_name));
                if ($cat) {
                    $category_ids[] = $cat->term_id;
                } else {
                    // Create category if it doesn't exist
                    $new_cat = wp_insert_category(array('cat_name' => $cat_name));
                    if (!is_wp_error($new_cat)) {
                        $category_ids[] = $new_cat;
                    }
                }
            }
            $post_data['post_category'] = $category_ids;
        }
        
        $post_id = wp_insert_post($post_data);
        
        if (is_wp_error($post_id)) {
            return $post_id;
        }
        
        // Set meta title and description
        if (isset($data['meta_title'])) {
            $this->set_meta_title($post_id, $data['meta_title']);
        }
        
        if (isset($data['meta_description'])) {
            $this->set_meta_description($post_id, $data['meta_description']);
        }
        
        // Set schema markup
        if (isset($data['schema_markup'])) {
            update_post_meta($post_id, '_seo_max_schema', $data['schema_markup']);
        }
        
        // Set featured image if provided
        if (isset($data['featured_image_url'])) {
            $this->set_featured_image_from_url($post_id, $data['featured_image_url']);
        }
        
        // Store SEO Max reference
        update_post_meta($post_id, '_seo_max_generated', true);
        update_post_meta($post_id, '_seo_max_created_at', current_time('mysql'));
        
        return array(
            'success' => true,
            'post_id' => $post_id,
            'url' => get_permalink($post_id),
        );
    }
    
    /**
     * Set meta title (compatible with major SEO plugins)
     */
    private function set_meta_title($post_id, $title) {
        $title = sanitize_text_field($title);
        
        // Store in our own meta for fallback
        update_post_meta($post_id, '_seo_max_title', $title);
        
        // Yoast SEO
        if (defined('WPSEO_VERSION')) {
            update_post_meta($post_id, '_yoast_wpseo_title', $title);
        }
        
        // Rank Math
        if (class_exists('RankMath')) {
            update_post_meta($post_id, 'rank_math_title', $title);
        }
        
        // All in One SEO
        if (defined('AIOSEO_VERSION')) {
            update_post_meta($post_id, '_aioseo_title', $title);
        }
        
        // SEOPress
        if (defined('SEOPRESS_VERSION')) {
            update_post_meta($post_id, '_seopress_titles_title', $title);
        }
    }
    
    /**
     * Set meta description (compatible with major SEO plugins)
     */
    private function set_meta_description($post_id, $description) {
        $description = sanitize_text_field($description);
        
        // Store in our own meta for fallback
        update_post_meta($post_id, '_seo_max_description', $description);
        
        // Yoast SEO
        if (defined('WPSEO_VERSION')) {
            update_post_meta($post_id, '_yoast_wpseo_metadesc', $description);
        }
        
        // Rank Math
        if (class_exists('RankMath')) {
            update_post_meta($post_id, 'rank_math_description', $description);
        }
        
        // All in One SEO
        if (defined('AIOSEO_VERSION')) {
            update_post_meta($post_id, '_aioseo_description', $description);
        }
        
        // SEOPress
        if (defined('SEOPRESS_VERSION')) {
            update_post_meta($post_id, '_seopress_titles_desc', $description);
        }
    }
    
    /**
     * Set featured image from URL
     */
    private function set_featured_image_from_url($post_id, $image_url) {
        require_once(ABSPATH . 'wp-admin/includes/media.php');
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        
        $image_id = media_sideload_image($image_url, $post_id, null, 'id');
        
        if (!is_wp_error($image_id)) {
            set_post_thumbnail($post_id, $image_id);
            return $image_id;
        }
        
        return false;
    }
    
    /**
     * Bulk update image alt texts
     */
    public function bulk_update_alt_texts($updates) {
        $results = array();
        
        foreach ($updates as $update) {
            if (isset($update['image_id']) && isset($update['alt'])) {
                update_post_meta($update['image_id'], '_wp_attachment_image_alt', sanitize_text_field($update['alt']));
                $results[] = array(
                    'image_id' => $update['image_id'],
                    'success' => true,
                );
            }
        }
        
        return $results;
    }
    
    /**
     * Output schema markup in page head
     */
    public function output_schema() {
        global $post;
        
        if (!$post) {
            return;
        }
        
        $schema = get_post_meta($post->ID, '_seo_max_schema', true);
        
        if (!empty($schema)) {
            if (is_array($schema)) {
                $schema = json_encode($schema);
            }
            echo '<script type="application/ld+json">' . $schema . '</script>' . "\n";
        }
    }
}

// Hook schema output to wp_head
add_action('wp_head', function() {
    if (function_exists('seo_max') && seo_max()->seo_updater) {
        seo_max()->seo_updater->output_schema();
    }
}, 99);
