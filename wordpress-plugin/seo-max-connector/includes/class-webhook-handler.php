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
                
            default:
                return new WP_Error('unknown_action', 'Unknown webhook action: ' . $action);
        }
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
