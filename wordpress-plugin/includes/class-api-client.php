<?php
/**
 * API Client
 * Communicates with SEO Max platform API
 */

if (!defined('ABSPATH')) {
    exit;
}

class SEO_Max_API_Client {
    private $api_url;
    private $api_key;
    private $store_id;
    
    public function __construct() {
        $this->api_url = get_option('seo_max_api_url', 'https://seo-max-pink.vercel.app/api/v1');
        $this->api_key = get_option('seo_max_api_key');
        $this->store_id = get_option('seo_max_store_id');
    }
    
    private function request($endpoint, $method = 'GET', $data = null) {
        if (!$this->api_key || !$this->store_id) {
            return new WP_Error('not_configured', 'SEO Max is not configured. Please add your API key in settings.');
        }
        
        $url = $this->api_url . '/stores/' . $this->store_id . $endpoint;
        
        $args = array(
            'method' => $method,
            'headers' => array(
                'X-API-Key' => $this->api_key,
                'Content-Type' => 'application/json',
            ),
            'timeout' => 30,
        );
        
        if ($data !== null && in_array($method, array('POST', 'PUT', 'PATCH'))) {
            $args['body'] = json_encode($data);
        }
        
        $response = wp_remote_request($url, $args);
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        
        if ($code < 200 || $code >= 300) {
            return new WP_Error('api_error', "API returned code {$code}");
        }
        
        return json_decode($body, true);
    }
    
    public function sync_blog_post($data) {
        return $this->request('/sync', 'POST', array(
            'type' => 'blog_post',
            'data' => $data,
        ));
    }
    
    public function sync_product($data) {
        return $this->request('/push', 'POST', array(
            'type' => 'product',
            'data' => $data,
        ));
    }
    
    public function get_improvements() {
        return $this->request('/improvements', 'GET');
    }
    
    public function apply_improvement($improvement_id) {
        return $this->request("/improvements/{$improvement_id}/apply", 'POST');
    }
    
    public function mark_improvement_applied($improvement_id) {
        return $this->request("/improvements/{$improvement_id}", 'PATCH', array(
            'status' => 'applied',
            'applied_at' => current_time('mysql'),
        ));
    }
    
    public function optimize_content($content, $metadata) {
        return $this->request('/optimize-content', 'POST', array(
            'content' => $content,
            'metadata' => $metadata,
        ));
    }
    
    public function research_keyword($keyword) {
        return $this->request('/keyword-research', 'POST', array(
            'keyword' => $keyword,
        ));
    }
    
    public function get_rank_history($keyword) {
        return $this->request('/rankings?keyword=' . urlencode($keyword), 'GET');
    }
    
    public function generate_schema($post_type, $post_id) {
        return $this->request('/generate-schema', 'POST', array(
            'post_type' => $post_type,
            'post_id' => $post_id,
        ));
    }
}
