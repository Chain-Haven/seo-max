<?php
/**
 * API Client for communicating with SEO Max platform
 */

if (!defined('ABSPATH')) {
    exit;
}

class SEO_Max_API_Client {
    
    /**
     * API base URL
     */
    private $api_url;
    
    /**
     * API key
     */
    private $api_key;
    
    /**
     * Store ID
     */
    private $store_id;
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->api_url = SEO_MAX_API_URL;
        $this->api_key = get_option('seo_max_api_key', '');
        $this->store_id = get_option('seo_max_store_id', '');
    }
    
    /**
     * Set API key
     */
    public function set_api_key($api_key) {
        $this->api_key = $api_key;
    }
    
    /**
     * Set store ID
     */
    public function set_store_id($store_id) {
        $this->store_id = $store_id;
    }
    
    /**
     * Make API request
     */
    private function request($endpoint, $method = 'GET', $data = null) {
        $url = $this->api_url . $endpoint;
        
        $args = array(
            'method' => $method,
            'timeout' => 30,
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-API-Key' => $this->api_key,
            ),
        );
        
        if ($data !== null) {
            $args['body'] = json_encode($data);
        }
        
        $response = wp_remote_request($url, $args);
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'error' => $response->get_error_message(),
            );
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if ($status_code >= 200 && $status_code < 300) {
            return array(
                'success' => true,
                'data' => $data,
            );
        }
        
        return array(
            'success' => false,
            'error' => isset($data['error']) ? $data['error'] : 'Unknown error',
            'status_code' => $status_code,
        );
    }
    
    /**
     * Connect to SEO Max platform
     */
    public function connect() {
        $data = array(
            'site_url' => get_site_url(),
            'site_name' => get_bloginfo('name'),
            'wp_version' => get_bloginfo('version'),
            'wc_version' => defined('WC_VERSION') ? WC_VERSION : null,
            'plugin_version' => SEO_MAX_VERSION,
        );
        
        $result = $this->request('/connect', 'POST', $data);
        
        if ($result['success'] && isset($result['data']['store']['id'])) {
            $this->store_id = $result['data']['store']['id'];
            update_option('seo_max_store_id', $this->store_id);
            update_option('seo_max_connected_at', current_time('mysql'));
        }
        
        return $result;
    }
    
    /**
     * Sync products to platform
     */
    public function sync_products($products) {
        if (empty($this->store_id)) {
            return array('success' => false, 'error' => 'Not connected');
        }
        
        return $this->request("/stores/{$this->store_id}/sync", 'POST', array(
            'products' => $products,
        ));
    }
    
    /**
     * Sync pages to platform
     */
    public function sync_pages($pages) {
        if (empty($this->store_id)) {
            return array('success' => false, 'error' => 'Not connected');
        }
        
        return $this->request("/stores/{$this->store_id}/sync", 'POST', array(
            'pages' => $pages,
        ));
    }
    
    /**
     * Sync blog posts to platform
     */
    public function sync_blog_posts($posts) {
        if (empty($this->store_id)) {
            return array('success' => false, 'error' => 'Not connected');
        }
        
        return $this->request("/stores/{$this->store_id}/sync", 'POST', array(
            'blog_posts' => $posts,
        ));
    }
    
    /**
     * Sync all data
     */
    public function sync_all($data) {
        if (empty($this->store_id)) {
            return array('success' => false, 'error' => 'Not connected');
        }
        
        return $this->request("/stores/{$this->store_id}/sync", 'POST', $data);
    }
    
    /**
     * Get products from platform (with any pending SEO updates)
     */
    public function get_products($page = 1, $limit = 50) {
        if (empty($this->store_id)) {
            return array('success' => false, 'error' => 'Not connected');
        }
        
        return $this->request("/stores/{$this->store_id}/products?page={$page}&limit={$limit}");
    }
    
    /**
     * Send webhook event
     */
    public function send_webhook_event($event, $data) {
        if (empty($this->store_id)) {
            return array('success' => false, 'error' => 'Not connected');
        }
        
        return $this->request("/stores/{$this->store_id}/webhook", 'POST', array(
            'event' => $event,
            'data' => $data,
            'timestamp' => current_time('c'),
        ));
    }
    
    /**
     * Check connection status
     */
    public function check_connection() {
        if (empty($this->api_key)) {
            return array('success' => false, 'error' => 'No API key configured');
        }
        
        return $this->connect();
    }
    
    /**
     * Get sync status from platform
     */
    public function get_sync_status() {
        if (empty($this->store_id)) {
            return array('success' => false, 'error' => 'Not connected');
        }
        
        return $this->request("/stores/{$this->store_id}/sync");
    }
}
