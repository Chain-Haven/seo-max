<?php
/**
 * Plugin Name: SEO Max Connector
 * Plugin URI: https://seo-max-pink.vercel.app
 * Description: Connect your WordPress/WooCommerce site to SEO Max for centralized SEO management, AI-powered content optimization, and automated blog posting.
 * Version: 1.0.0
 * Author: SEO Max
 * Author URI: https://seo-max-pink.vercel.app
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: seo-max-connector
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('SEO_MAX_VERSION', '1.0.0');
define('SEO_MAX_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SEO_MAX_PLUGIN_URL', plugin_dir_url(__FILE__));
define('SEO_MAX_PLUGIN_BASENAME', plugin_basename(__FILE__));
define('SEO_MAX_API_URL', 'https://seo-max-pink.vercel.app/api/v1');

/**
 * Main plugin class
 */
final class SEO_Max_Connector {
    
    /**
     * Single instance of the class
     */
    private static $instance = null;
    
    /**
     * Plugin components
     */
    public $api_client;
    public $data_sync;
    public $seo_updater;
    public $webhook_handler;
    
    /**
     * Get single instance
     */
    public static function instance() {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        $this->includes();
        $this->init_hooks();
    }
    
    /**
     * Include required files
     */
    private function includes() {
        // Core classes
        require_once SEO_MAX_PLUGIN_DIR . 'includes/class-api-client.php';
        require_once SEO_MAX_PLUGIN_DIR . 'includes/class-data-sync.php';
        require_once SEO_MAX_PLUGIN_DIR . 'includes/class-seo-updater.php';
        require_once SEO_MAX_PLUGIN_DIR . 'includes/class-webhook-handler.php';
        
        // Admin classes
        if (is_admin()) {
            require_once SEO_MAX_PLUGIN_DIR . 'includes/class-admin-settings.php';
        }
    }
    
    /**
     * Initialize hooks
     */
    private function init_hooks() {
        // Activation/Deactivation
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        
        // Initialize components after plugins loaded
        add_action('plugins_loaded', array($this, 'init_components'));
        
        // Add settings link to plugins page
        add_filter('plugin_action_links_' . SEO_MAX_PLUGIN_BASENAME, array($this, 'add_settings_link'));
        
        // Schedule sync cron
        add_action('seo_max_scheduled_sync', array($this, 'run_scheduled_sync'));
        
        // REST API endpoints
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }
    
    /**
     * Initialize plugin components
     */
    public function init_components() {
        $this->api_client = new SEO_Max_API_Client();
        $this->data_sync = new SEO_Max_Data_Sync($this->api_client);
        $this->seo_updater = new SEO_Max_SEO_Updater();
        $this->webhook_handler = new SEO_Max_Webhook_Handler($this->seo_updater);
        
        if (is_admin()) {
            new SEO_Max_Admin_Settings($this->api_client, $this->data_sync);
        }
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Create database tables if needed
        $this->create_tables();
        
        // Schedule daily sync
        if (!wp_next_scheduled('seo_max_scheduled_sync')) {
            wp_schedule_event(time(), 'daily', 'seo_max_scheduled_sync');
        }
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Clear scheduled events
        wp_clear_scheduled_hook('seo_max_scheduled_sync');
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Create custom database tables
     */
    private function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        $table_name = $wpdb->prefix . 'seo_max_sync_log';
        
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            sync_type varchar(50) NOT NULL,
            items_synced int(11) DEFAULT 0,
            status varchar(20) DEFAULT 'pending',
            message text,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY sync_type (sync_type),
            KEY status (status)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    /**
     * Add settings link to plugins page
     */
    public function add_settings_link($links) {
        $settings_link = '<a href="' . admin_url('admin.php?page=seo-max-settings') . '">' . __('Settings', 'seo-max-connector') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }
    
    /**
     * Run scheduled sync
     */
    public function run_scheduled_sync() {
        if ($this->data_sync && $this->is_connected()) {
            $this->data_sync->sync_all();
        }
    }
    
    /**
     * Register REST API routes
     */
    public function register_rest_routes() {
        register_rest_route('seo-max/v1', '/webhook', array(
            'methods' => 'POST',
            'callback' => array($this->webhook_handler, 'handle_webhook'),
            'permission_callback' => array($this->webhook_handler, 'verify_webhook'),
        ));
        
        register_rest_route('seo-max/v1', '/status', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_status'),
            'permission_callback' => '__return_true',
        ));
        
        // Endpoint for applying SEO improvements from the platform
        register_rest_route('seo-max/v1', '/apply-improvement', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_apply_improvement'),
            'permission_callback' => '__return_true', // Open endpoint - uses internal verification
        ));
    }
    
    /**
     * Handle apply improvement request from SEO Max platform
     */
    public function handle_apply_improvement($request) {
        $body = $request->get_json_params();
        
        if (empty($body)) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Invalid request body',
            ), 400);
        }
        
        // Extract the action and data
        $action = isset($body['action']) ? $body['action'] : 'generic_improvement';
        $data = array_merge($body, array('action' => $action));
        
        // Use the webhook handler to process the improvement
        if (!$this->webhook_handler) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Plugin not fully initialized',
            ), 500);
        }
        
        // Manually call handle_webhook with constructed request
        $fake_request = new WP_REST_Request('POST');
        $fake_request->set_body(json_encode(array('action' => $action, 'data' => $data)));
        $fake_request->set_header('Content-Type', 'application/json');
        
        // Process directly through webhook handler
        $result = $this->webhook_handler->handle_webhook($fake_request);
        
        return $result;
    }
    
    /**
     * Get connection status
     */
    public function get_status() {
        return new WP_REST_Response(array(
            'connected' => $this->is_connected(),
            'version' => SEO_MAX_VERSION,
            'wp_version' => get_bloginfo('version'),
            'wc_version' => defined('WC_VERSION') ? WC_VERSION : null,
            'site_url' => get_site_url(),
            'site_name' => get_bloginfo('name'),
        ), 200);
    }
    
    /**
     * Check if connected to SEO Max
     */
    public function is_connected() {
        $api_key = get_option('seo_max_api_key', '');
        $store_id = get_option('seo_max_store_id', '');
        return !empty($api_key) && !empty($store_id);
    }
    
    /**
     * Get API key
     */
    public function get_api_key() {
        return get_option('seo_max_api_key', '');
    }
    
    /**
     * Get store ID
     */
    public function get_store_id() {
        return get_option('seo_max_store_id', '');
    }
}

/**
 * Get main plugin instance
 */
function seo_max() {
    return SEO_Max_Connector::instance();
}

// Initialize the plugin
seo_max();
