<?php
/**
 * Plugin Name: SEO Max
 * Plugin URI: https://seo-max-pink.vercel.app
 * Description: Advanced SEO optimization for WordPress & WooCommerce. Syncs with SEO Max platform for AI-powered improvements, rank tracking, and comprehensive SEO management.
 * Version: 1.0.0
 * Author: SEO Max
 * Author URI: https://seo-max-pink.vercel.app
 * License: GPL v2 or later
 * Text Domain: seo-max
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * WC tested up to: 9.0
 */

if (!defined('ABSPATH')) {
    exit;
}

define('SEO_MAX_VERSION', '1.0.0');
define('SEO_MAX_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SEO_MAX_PLUGIN_URL', plugin_dir_url(__FILE__));

class SEO_Max_Plugin {
    private static $instance = null;
    private $api_key = null;
    private $api_url = 'https://seo-max-pink.vercel.app/api/v1';
    private $store_id = null;

    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->load_dependencies();
        $this->init_hooks();
        $this->detect_conflicts();
    }

    private function load_dependencies() {
        require_once SEO_MAX_PLUGIN_DIR . 'includes/class-api-client.php';
        require_once SEO_MAX_PLUGIN_DIR . 'includes/class-sync-manager.php';
        require_once SEO_MAX_PLUGIN_DIR . 'includes/class-schema-generator.php';
        require_once SEO_MAX_PLUGIN_DIR . 'includes/class-conflict-detector.php';
        require_once SEO_MAX_PLUGIN_DIR . 'includes/class-meta-box.php';
        
        if (class_exists('WooCommerce')) {
            require_once SEO_MAX_PLUGIN_DIR . 'includes/woocommerce/class-product-seo.php';
            require_once SEO_MAX_PLUGIN_DIR . 'includes/woocommerce/class-feed-generator.php';
        }
    }

    private function init_hooks() {
        // Admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Admin scripts
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        
        // Save hooks
        add_action('save_post', array($this, 'sync_post_save'), 10, 3);
        add_action('woocommerce_update_product', array($this, 'sync_product_save'), 10, 1);
        
        // Meta boxes
        add_action('add_meta_boxes', array($this, 'add_seo_meta_boxes'));
        
        // AJAX handlers
        add_action('wp_ajax_seo_max_optimize_content', array($this, 'ajax_optimize_content'));
        add_action('wp_ajax_seo_max_generate_schema', array($this, 'ajax_generate_schema'));
        add_action('wp_ajax_seo_max_check_keyword', array($this, 'ajax_check_keyword'));
        
        // REST API endpoints
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        
        // Cron for sync
        add_action('seo_max_sync_cron', array($this, 'run_scheduled_sync'));
        
        if (!wp_next_scheduled('seo_max_sync_cron')) {
            wp_schedule_event(time(), 'hourly', 'seo_max_sync_cron');
        }
    }

    private function detect_conflicts() {
        $conflicts = array();
        
        // Check for Yoast SEO
        if (defined('WPSEO_VERSION')) {
            $conflicts[] = 'yoast';
            update_option('seo_max_yoast_detected', true);
        }
        
        // Check for Rank Math
        if (defined('RANK_MATH_VERSION')) {
            $conflicts[] = 'rankmath';
            update_option('seo_max_rankmath_detected', true);
        }
        
        // Check for All in One SEO
        if (defined('AIOSEO_VERSION')) {
            $conflicts[] = 'aioseo';
            update_option('seo_max_aioseo_detected', true);
        }
        
        update_option('seo_max_detected_plugins', $conflicts);
    }

    public function add_admin_menu() {
        add_menu_page(
            'SEO Max',
            'SEO Max',
            'manage_options',
            'seo-max',
            array($this, 'render_dashboard_page'),
            'dashicons-chart-line',
            30
        );
        
        add_submenu_page(
            'seo-max',
            'Dashboard',
            'Dashboard',
            'manage_options',
            'seo-max',
            array($this, 'render_dashboard_page')
        );
        
        add_submenu_page(
            'seo-max',
            'Settings',
            'Settings',
            'manage_options',
            'seo-max-settings',
            array($this, 'render_settings_page')
        );
        
        add_submenu_page(
            'seo-max',
            'Bulk Operations',
            'Bulk Operations',
            'manage_options',
            'seo-max-bulk',
            array($this, 'render_bulk_operations_page')
        );
    }

    public function add_seo_meta_boxes() {
        $screens = array('post', 'page', 'product');
        
        foreach ($screens as $screen) {
            add_meta_box(
                'seo_max_meta_box',
                'SEO Max Optimization',
                array($this, 'render_meta_box'),
                $screen,
                'normal',
                'high'
            );
        }
    }

    public function render_meta_box($post) {
        // Only show if no conflicts OR user chose to show anyway
        $conflicts = get_option('seo_max_detected_plugins', array());
        $show_anyway = get_option('seo_max_show_despite_conflicts', false);
        
        if (!empty($conflicts) && !$show_anyway) {
            echo '<div class="notice notice-info">';
            echo '<p>SEO Max detected: ' . implode(', ', $conflicts) . '</p>';
            echo '<p>To avoid conflicts, SEO Max meta boxes are hidden. You can enable them in Settings if you want to use both plugins.</p>';
            echo '</div>';
            return;
        }
        
        require_once SEO_MAX_PLUGIN_DIR . 'includes/views/meta-box.php';
    }

    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'seo-max') === false && !in_array($hook, array('post.php', 'post-new.php'))) {
            return;
        }
        
        wp_enqueue_style('seo-max-admin', SEO_MAX_PLUGIN_URL . 'assets/css/admin.css', array(), SEO_MAX_VERSION);
        wp_enqueue_script('seo-max-admin', SEO_MAX_PLUGIN_URL . 'assets/js/admin.js', array('jquery'), SEO_MAX_VERSION, true);
        
        wp_localize_script('seo-max-admin', 'seoMaxData', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('seo_max_nonce'),
            'storeId' => get_option('seo_max_store_id'),
            'apiKey' => get_option('seo_max_api_key'),
        ));
    }

    public function sync_post_save($post_id, $post, $update) {
        // Avoid autosaves and revisions
        if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) {
            return;
        }
        
        // Check if sync is enabled
        if (!get_option('seo_max_sync_enabled', true)) {
            return;
        }
        
        // Sync to platform
        $sync_manager = new SEO_Max_Sync_Manager();
        $sync_manager->sync_post($post_id);
    }

    public function sync_product_save($product_id) {
        if (!get_option('seo_max_sync_enabled', true)) {
            return;
        }
        
        $sync_manager = new SEO_Max_Sync_Manager();
        $sync_manager->sync_product($product_id);
    }

    public function ajax_optimize_content() {
        check_ajax_referer('seo_max_nonce', 'nonce');
        
        $content = sanitize_textarea_field($_POST['content'] ?? '');
        $title = sanitize_text_field($_POST['title'] ?? '');
        $description = sanitize_textarea_field($_POST['description'] ?? '');
        $keyword = sanitize_text_field($_POST['keyword'] ?? '');
        
        $api_client = new SEO_Max_API_Client();
        $result = $api_client->optimize_content($content, array(
            'title' => $title,
            'description' => $description,
            'focusKeyword' => $keyword,
        ));
        
        wp_send_json_success($result);
    }

    public function ajax_generate_schema() {
        check_ajax_referer('seo_max_nonce', 'nonce');
        
        $post_id = intval($_POST['post_id'] ?? 0);
        
        if (!$post_id) {
            wp_send_json_error('Invalid post ID');
            return;
        }
        
        $schema_generator = new SEO_Max_Schema_Generator();
        $schema = $schema_generator->generate_for_post($post_id);
        
        wp_send_json_success($schema);
    }

    public function register_rest_routes() {
        register_rest_route('seo-max/v1', '/sync', array(
            'methods' => 'POST',
            'callback' => array($this, 'rest_trigger_sync'),
            'permission_callback' => array($this, 'check_api_key_permission'),
        ));
        
        register_rest_route('seo-max/v1', '/improvements', array(
            'methods' => 'GET',
            'callback' => array($this, 'rest_get_improvements'),
            'permission_callback' => array($this, 'check_api_key_permission'),
        ));
        
        register_rest_route('seo-max/v1', '/apply-improvement', array(
            'methods' => 'POST',
            'callback' => array($this, 'rest_apply_improvement'),
            'permission_callback' => array($this, 'check_api_key_permission'),
        ));
    }

    public function check_api_key_permission($request) {
        $api_key = $request->get_header('X-API-Key');
        $stored_key = get_option('seo_max_api_key');
        
        return $api_key && $api_key === $stored_key;
    }

    public function rest_trigger_sync($request) {
        $sync_manager = new SEO_Max_Sync_Manager();
        $result = $sync_manager->full_sync();
        
        return rest_ensure_response($result);
    }

    public function rest_get_improvements($request) {
        $api_client = new SEO_Max_API_Client();
        $improvements = $api_client->get_improvements();
        
        return rest_ensure_response($improvements);
    }

    public function rest_apply_improvement($request) {
        $improvement_id = $request->get_param('improvement_id');
        
        if (!$improvement_id) {
            return new WP_Error('missing_param', 'Improvement ID is required', array('status' => 400));
        }
        
        $api_client = new SEO_Max_API_Client();
        $result = $api_client->apply_improvement($improvement_id);
        
        return rest_ensure_response($result);
    }

    public function run_scheduled_sync() {
        if (!get_option('seo_max_sync_enabled', true)) {
            return;
        }
        
        $sync_manager = new SEO_Max_Sync_Manager();
        $sync_manager->incremental_sync();
    }

    public function render_dashboard_page() {
        require_once SEO_MAX_PLUGIN_DIR . 'includes/views/dashboard.php';
    }

    public function render_settings_page() {
        require_once SEO_MAX_PLUGIN_DIR . 'includes/views/settings.php';
    }

    public function render_bulk_operations_page() {
        require_once SEO_MAX_PLUGIN_DIR . 'includes/views/bulk-operations.php';
    }
}

// Initialize plugin
function seo_max_init() {
    return SEO_Max_Plugin::get_instance();
}

add_action('plugins_loaded', 'seo_max_init');

// Activation hook
register_activation_hook(__FILE__, 'seo_max_activate');
function seo_max_activate() {
    // Create necessary database tables or options
    update_option('seo_max_version', SEO_MAX_VERSION);
    update_option('seo_max_activated_at', current_time('mysql'));
    
    // Schedule cron
    if (!wp_next_scheduled('seo_max_sync_cron')) {
        wp_schedule_event(time(), 'hourly', 'seo_max_sync_cron');
    }
}

// Deactivation hook
register_deactivation_hook(__FILE__, 'seo_max_deactivate');
function seo_max_deactivate() {
    wp_clear_scheduled_hook('seo_max_sync_cron');
}
