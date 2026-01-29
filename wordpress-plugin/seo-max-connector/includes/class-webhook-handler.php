<?php
/**
 * Webhook Handler - Receive updates from SEO Max platform
 */

if (!defined('ABSPATH')) {
    exit;
}

class SEO_Max_Webhook_Handler {
    
    /**
     * SEO Updater instance
     */
    private $seo_updater;
    
    /**
     * Constructor
     */
    public function __construct($seo_updater) {
        $this->seo_updater = $seo_updater;
    }
    
    /**
     * Verify webhook request
     */
    public function verify_webhook($request) {
        $api_key = $request->get_header('X-API-Key');
        
        if (empty($api_key)) {
            return new WP_Error('missing_api_key', 'API key is required', array('status' => 401));
        }
        
        $stored_key = get_option('seo_max_api_key', '');
        
        if ($api_key !== $stored_key) {
            return new WP_Error('invalid_api_key', 'Invalid API key', array('status' => 401));
        }
        
        return true;
    }
    
    /**
     * Handle incoming webhook
     */
    public function handle_webhook($request) {
        $body = $request->get_json_params();
        
        if (empty($body) || !isset($body['action'])) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Invalid webhook payload',
            ), 400);
        }
        
        $action = $body['action'];
        $data = isset($body['data']) ? $body['data'] : array();
        
        $result = $this->process_action($action, $data);
        
        if (is_wp_error($result)) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => $result->get_error_message(),
            ), 400);
        }
        
        return new WP_REST_Response(array(
            'success' => true,
            'result' => $result,
        ), 200);
    }
    
    /**
     * Process webhook action
     */
    private function process_action($action, $data) {
        switch ($action) {
            case 'update_product_seo':
                return $this->handle_update_product_seo($data);
                
            case 'update_page_seo':
                return $this->handle_update_page_seo($data);
                
            case 'update_post_seo':
                return $this->handle_update_post_seo($data);
                
            case 'create_blog_post':
                return $this->handle_create_blog_post($data);
                
            case 'bulk_update_alt_texts':
                return $this->handle_bulk_update_alt_texts($data);
                
            case 'trigger_sync':
                return $this->handle_trigger_sync($data);
                
            case 'regenerate_meta':
                return $this->handle_regenerate_meta($data);
            
            // Improvement application actions from SEO Max platform
            case 'update_meta':
                return $this->handle_update_meta($data);
                
            case 'expand_content':
                return $this->handle_expand_content($data);
                
            case 'update_heading':
                return $this->handle_update_heading($data);
                
            case 'update_images':
                return $this->handle_update_images($data);
                
            case 'update_content':
                return $this->handle_update_content($data);
                
            case 'add_faq':
                return $this->handle_add_faq($data);
                
            case 'update_image_alt':
                return $this->handle_update_image_alt($data);
                
            case 'generic_improvement':
                return $this->handle_generic_improvement($data);
                
            default:
                return new WP_Error('unknown_action', 'Unknown webhook action: ' . $action);
        }
    }
    
    /**
     * Handle improvement: update meta (title/description)
     */
    private function handle_update_meta($data) {
        $entity_id = isset($data['entity_id']) ? $data['entity_id'] : null;
        $entity_type = isset($data['entity_type']) ? $data['entity_type'] : null;
        $field = isset($data['field']) ? $data['field'] : null;
        $value = isset($data['value']) ? $data['value'] : null;
        
        // For crawled pages, entity_id is the URL - try to find the post
        if ($entity_type === 'crawled_page' && $entity_id) {
            $post_id = url_to_postid($entity_id);
            if (!$post_id) {
                return new WP_Error('post_not_found', 'Could not find post for URL: ' . $entity_id);
            }
            $entity_id = $post_id;
        }
        
        if (!$entity_id || !$field || !$value) {
            return new WP_Error('missing_data', 'Missing required data for meta update');
        }
        
        $update_data = array();
        if ($field === 'title') {
            $update_data['meta_title'] = $value;
        } elseif ($field === 'meta_description') {
            $update_data['meta_description'] = $value;
        }
        
        $post = get_post($entity_id);
        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found');
        }
        
        if ($post->post_type === 'product') {
            return $this->seo_updater->update_product_seo($entity_id, $update_data);
        } elseif ($post->post_type === 'page') {
            return $this->seo_updater->update_page_seo($entity_id, $update_data);
        } else {
            return $this->seo_updater->update_post_seo($entity_id, $update_data);
        }
    }
    
    /**
     * Handle improvement: expand content
     */
    private function handle_expand_content($data) {
        $entity_id = $this->resolve_entity_id($data);
        if (is_wp_error($entity_id)) {
            return $entity_id;
        }
        
        $content = isset($data['content']) ? $data['content'] : null;
        if (!$content) {
            return new WP_Error('missing_content', 'Expanded content is required');
        }
        
        $post = get_post($entity_id);
        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found');
        }
        
        // Update the post content
        $result = wp_update_post(array(
            'ID' => $entity_id,
            'post_content' => wp_kses_post($content),
        ));
        
        if (is_wp_error($result)) {
            return $result;
        }
        
        return array(
            'success' => true,
            'post_id' => $entity_id,
            'updated' => array('content' => true),
        );
    }
    
    /**
     * Handle improvement: update heading
     */
    private function handle_update_heading($data) {
        // This is informational - headings are in content, not separately managed
        // Log the recommendation for manual review
        $entity_id = $this->resolve_entity_id($data);
        if (is_wp_error($entity_id)) {
            return $entity_id;
        }
        
        $recommendation = isset($data['recommendation']) ? $data['recommendation'] : '';
        update_post_meta($entity_id, '_seo_max_heading_recommendation', $recommendation);
        
        return array(
            'success' => true,
            'post_id' => $entity_id,
            'message' => 'Heading recommendation stored',
        );
    }
    
    /**
     * Handle improvement: update images (alt text)
     */
    private function handle_update_images($data) {
        $entity_id = $this->resolve_entity_id($data);
        if (is_wp_error($entity_id)) {
            return $entity_id;
        }
        
        $recommendation = isset($data['recommendation']) ? $data['recommendation'] : '';
        
        // Store the recommendation for manual review
        update_post_meta($entity_id, '_seo_max_image_recommendation', $recommendation);
        
        return array(
            'success' => true,
            'post_id' => $entity_id,
            'message' => 'Image recommendation stored',
        );
    }
    
    /**
     * Handle improvement: update content (for freshness)
     */
    private function handle_update_content($data) {
        $entity_id = $this->resolve_entity_id($data);
        if (is_wp_error($entity_id)) {
            return $entity_id;
        }
        
        $content = isset($data['content']) ? $data['content'] : null;
        if (!$content) {
            return new WP_Error('missing_content', 'Updated content is required');
        }
        
        $result = wp_update_post(array(
            'ID' => $entity_id,
            'post_content' => wp_kses_post($content),
        ));
        
        if (is_wp_error($result)) {
            return $result;
        }
        
        return array(
            'success' => true,
            'post_id' => $entity_id,
            'updated' => array('content' => true),
        );
    }
    
    /**
     * Handle improvement: add FAQ schema
     */
    private function handle_add_faq($data) {
        $entity_id = $this->resolve_entity_id($data);
        if (is_wp_error($entity_id)) {
            return $entity_id;
        }
        
        $faq_items = isset($data['faq_items']) ? $data['faq_items'] : array();
        
        if (empty($faq_items)) {
            return new WP_Error('missing_faq', 'FAQ items are required');
        }
        
        // Build FAQ schema
        $faq_schema = array(
            '@context' => 'https://schema.org',
            '@type' => 'FAQPage',
            'mainEntity' => array(),
        );
        
        foreach ($faq_items as $item) {
            if (isset($item['question']) && isset($item['answer'])) {
                $faq_schema['mainEntity'][] = array(
                    '@type' => 'Question',
                    'name' => $item['question'],
                    'acceptedAnswer' => array(
                        '@type' => 'Answer',
                        'text' => $item['answer'],
                    ),
                );
            }
        }
        
        // Store the FAQ schema
        update_post_meta($entity_id, '_seo_max_faq_schema', $faq_schema);
        
        return array(
            'success' => true,
            'post_id' => $entity_id,
            'faq_count' => count($faq_schema['mainEntity']),
        );
    }
    
    /**
     * Handle improvement: update single image alt text
     */
    private function handle_update_image_alt($data) {
        $image_url = isset($data['image_url']) ? $data['image_url'] : null;
        $alt_text = isset($data['alt_text']) ? $data['alt_text'] : null;
        
        if (!$image_url || !$alt_text) {
            return new WP_Error('missing_data', 'Image URL and alt text are required');
        }
        
        // Find attachment by URL
        $attachment_id = attachment_url_to_postid($image_url);
        if (!$attachment_id) {
            return new WP_Error('image_not_found', 'Image not found: ' . $image_url);
        }
        
        update_post_meta($attachment_id, '_wp_attachment_image_alt', sanitize_text_field($alt_text));
        
        return array(
            'success' => true,
            'attachment_id' => $attachment_id,
            'updated' => array('alt_text' => $alt_text),
        );
    }
    
    /**
     * Handle generic improvement
     */
    private function handle_generic_improvement($data) {
        $entity_id = $this->resolve_entity_id($data);
        if (is_wp_error($entity_id)) {
            return $entity_id;
        }
        
        $suggested_value = isset($data['suggested_value']) ? $data['suggested_value'] : null;
        
        // Store the recommendation for manual review
        update_post_meta($entity_id, '_seo_max_improvement_suggestion', $suggested_value);
        
        return array(
            'success' => true,
            'post_id' => $entity_id,
            'message' => 'Improvement suggestion stored for manual review',
        );
    }
    
    /**
     * Resolve entity ID from data (handles crawled_page URLs)
     */
    private function resolve_entity_id($data) {
        $entity_id = isset($data['entity_id']) ? $data['entity_id'] : null;
        $entity_type = isset($data['entity_type']) ? $data['entity_type'] : null;
        
        if (!$entity_id) {
            return new WP_Error('missing_id', 'Entity ID is required');
        }
        
        // For crawled pages, entity_id is the URL - try to find the post
        if ($entity_type === 'crawled_page' && filter_var($entity_id, FILTER_VALIDATE_URL)) {
            $post_id = url_to_postid($entity_id);
            if (!$post_id) {
                return new WP_Error('post_not_found', 'Could not find post for URL: ' . $entity_id);
            }
            return $post_id;
        }
        
        return intval($entity_id);
    }
    
    /**
     * Handle update product SEO action
     */
    private function handle_update_product_seo($data) {
        if (!isset($data['external_id'])) {
            return new WP_Error('missing_id', 'Product ID is required');
        }
        
        return $this->seo_updater->update_product_seo($data['external_id'], $data);
    }
    
    /**
     * Handle update page SEO action
     */
    private function handle_update_page_seo($data) {
        if (!isset($data['external_id'])) {
            return new WP_Error('missing_id', 'Page ID is required');
        }
        
        return $this->seo_updater->update_page_seo($data['external_id'], $data);
    }
    
    /**
     * Handle update post SEO action
     */
    private function handle_update_post_seo($data) {
        if (!isset($data['external_id'])) {
            return new WP_Error('missing_id', 'Post ID is required');
        }
        
        return $this->seo_updater->update_post_seo($data['external_id'], $data);
    }
    
    /**
     * Handle create blog post action
     */
    private function handle_create_blog_post($data) {
        if (!isset($data['title']) || !isset($data['content'])) {
            return new WP_Error('missing_data', 'Title and content are required');
        }
        
        return $this->seo_updater->create_blog_post($data);
    }
    
    /**
     * Handle bulk update alt texts action
     */
    private function handle_bulk_update_alt_texts($data) {
        if (!isset($data['updates']) || !is_array($data['updates'])) {
            return new WP_Error('missing_data', 'Updates array is required');
        }
        
        return $this->seo_updater->bulk_update_alt_texts($data['updates']);
    }
    
    /**
     * Handle trigger sync action
     */
    private function handle_trigger_sync($data) {
        if (!seo_max()->data_sync) {
            return new WP_Error('sync_not_available', 'Data sync is not available');
        }
        
        $sync_type = isset($data['type']) ? $data['type'] : 'all';
        
        switch ($sync_type) {
            case 'products':
                return seo_max()->data_sync->sync_products();
            case 'pages':
                return seo_max()->data_sync->sync_pages();
            case 'blog_posts':
                return seo_max()->data_sync->sync_blog_posts();
            default:
                return seo_max()->data_sync->sync_all();
        }
    }
    
    /**
     * Handle regenerate meta action (bulk meta generation)
     */
    private function handle_regenerate_meta($data) {
        $type = isset($data['type']) ? $data['type'] : 'products';
        $items = isset($data['items']) ? $data['items'] : array();
        
        $results = array();
        
        foreach ($items as $item) {
            if (!isset($item['external_id'])) {
                continue;
            }
            
            $update_data = array();
            if (isset($item['meta_title'])) {
                $update_data['meta_title'] = $item['meta_title'];
            }
            if (isset($item['meta_description'])) {
                $update_data['meta_description'] = $item['meta_description'];
            }
            
            switch ($type) {
                case 'products':
                    $result = $this->seo_updater->update_product_seo($item['external_id'], $update_data);
                    break;
                case 'pages':
                    $result = $this->seo_updater->update_page_seo($item['external_id'], $update_data);
                    break;
                case 'posts':
                    $result = $this->seo_updater->update_post_seo($item['external_id'], $update_data);
                    break;
                default:
                    $result = new WP_Error('invalid_type', 'Invalid type: ' . $type);
            }
            
            $results[] = array(
                'external_id' => $item['external_id'],
                'success' => !is_wp_error($result),
                'error' => is_wp_error($result) ? $result->get_error_message() : null,
            );
        }
        
        return array(
            'processed' => count($results),
            'results' => $results,
        );
    }
}
