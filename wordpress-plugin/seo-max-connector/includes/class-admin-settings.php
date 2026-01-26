<?php
/**
 * Admin Settings Page for SEO Max Connector
 */

if (!defined('ABSPATH')) {
    exit;
}

class SEO_Max_Admin_Settings {
    
    /**
     * API client instance
     */
    private $api_client;
    
    /**
     * Data sync instance
     */
    private $data_sync;
    
    /**
     * Constructor
     */
    public function __construct($api_client, $data_sync) {
        $this->api_client = $api_client;
        $this->data_sync = $data_sync;
        
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_ajax_seo_max_test_connection', array($this, 'ajax_test_connection'));
        add_action('wp_ajax_seo_max_sync_now', array($this, 'ajax_sync_now'));
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            __('SEO Max', 'seo-max-connector'),
            __('SEO Max', 'seo-max-connector'),
            'manage_options',
            'seo-max-settings',
            array($this, 'render_settings_page'),
            'dashicons-chart-line',
            80
        );
        
        add_submenu_page(
            'seo-max-settings',
            __('Settings', 'seo-max-connector'),
            __('Settings', 'seo-max-connector'),
            'manage_options',
            'seo-max-settings',
            array($this, 'render_settings_page')
        );
        
        add_submenu_page(
            'seo-max-settings',
            __('Sync Status', 'seo-max-connector'),
            __('Sync Status', 'seo-max-connector'),
            'manage_options',
            'seo-max-sync',
            array($this, 'render_sync_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('seo_max_settings', 'seo_max_api_key', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
        ));
        
        register_setting('seo_max_settings', 'seo_max_auto_sync', array(
            'type' => 'boolean',
            'default' => true,
        ));
        
        register_setting('seo_max_settings', 'seo_max_sync_frequency', array(
            'type' => 'string',
            'default' => 'daily',
            'sanitize_callback' => 'sanitize_text_field',
        ));
    }
    
    /**
     * Enqueue admin scripts
     */
    public function enqueue_scripts($hook) {
        if (strpos($hook, 'seo-max') === false) {
            return;
        }
        
        wp_enqueue_style(
            'seo-max-admin',
            SEO_MAX_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            SEO_MAX_VERSION
        );
        
        wp_enqueue_script(
            'seo-max-admin',
            SEO_MAX_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            SEO_MAX_VERSION,
            true
        );
        
        wp_localize_script('seo-max-admin', 'seoMaxAdmin', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('seo_max_admin'),
            'strings' => array(
                'testing' => __('Testing connection...', 'seo-max-connector'),
                'syncing' => __('Syncing data...', 'seo-max-connector'),
                'success' => __('Success!', 'seo-max-connector'),
                'error' => __('Error occurred', 'seo-max-connector'),
            ),
        ));
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        $api_key = get_option('seo_max_api_key', '');
        $store_id = get_option('seo_max_store_id', '');
        $connected_at = get_option('seo_max_connected_at', '');
        $auto_sync = get_option('seo_max_auto_sync', true);
        $is_connected = !empty($api_key) && !empty($store_id);
        ?>
        <div class="wrap seo-max-settings">
            <h1><?php _e('SEO Max Settings', 'seo-max-connector'); ?></h1>
            
            <div class="seo-max-card">
                <h2><?php _e('Connection Status', 'seo-max-connector'); ?></h2>
                <div class="seo-max-status <?php echo $is_connected ? 'connected' : 'disconnected'; ?>">
                    <span class="status-indicator"></span>
                    <span class="status-text">
                        <?php echo $is_connected ? __('Connected', 'seo-max-connector') : __('Not Connected', 'seo-max-connector'); ?>
                    </span>
                    <?php if ($is_connected && $connected_at): ?>
                        <span class="status-date">
                            <?php printf(__('Since %s', 'seo-max-connector'), date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($connected_at))); ?>
                        </span>
                    <?php endif; ?>
                </div>
                
                <?php if ($is_connected): ?>
                    <p class="store-id">
                        <strong><?php _e('Store ID:', 'seo-max-connector'); ?></strong> 
                        <code><?php echo esc_html($store_id); ?></code>
                    </p>
                <?php endif; ?>
            </div>
            
            <form method="post" action="options.php" class="seo-max-card">
                <?php settings_fields('seo_max_settings'); ?>
                
                <h2><?php _e('API Configuration', 'seo-max-connector'); ?></h2>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="seo_max_api_key"><?php _e('API Key', 'seo-max-connector'); ?></label>
                        </th>
                        <td>
                            <input type="text" 
                                   id="seo_max_api_key" 
                                   name="seo_max_api_key" 
                                   value="<?php echo esc_attr($api_key); ?>" 
                                   class="regular-text"
                                   placeholder="seomax_xxxxxxxxxxxx" />
                            <p class="description">
                                <?php _e('Enter your API key from the SEO Max dashboard.', 'seo-max-connector'); ?>
                                <a href="https://seo-max-pink.vercel.app/dashboard/stores" target="_blank">
                                    <?php _e('Get your API key', 'seo-max-connector'); ?>
                                </a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="seo_max_auto_sync"><?php _e('Auto Sync', 'seo-max-connector'); ?></label>
                        </th>
                        <td>
                            <label>
                                <input type="checkbox" 
                                       id="seo_max_auto_sync" 
                                       name="seo_max_auto_sync" 
                                       value="1" 
                                       <?php checked($auto_sync); ?> />
                                <?php _e('Automatically sync changes to SEO Max', 'seo-max-connector'); ?>
                            </label>
                            <p class="description">
                                <?php _e('When enabled, product, page, and post changes will be automatically sent to the SEO Max platform.', 'seo-max-connector'); ?>
                            </p>
                        </td>
                    </tr>
                </table>
                
                <p class="submit">
                    <?php submit_button(__('Save Settings', 'seo-max-connector'), 'primary', 'submit', false); ?>
                    <button type="button" id="seo-max-test-connection" class="button button-secondary">
                        <?php _e('Test Connection', 'seo-max-connector'); ?>
                    </button>
                </p>
            </form>
            
            <div class="seo-max-card">
                <h2><?php _e('Quick Actions', 'seo-max-connector'); ?></h2>
                <p>
                    <button type="button" id="seo-max-sync-now" class="button button-primary" <?php echo !$is_connected ? 'disabled' : ''; ?>>
                        <?php _e('Sync All Data Now', 'seo-max-connector'); ?>
                    </button>
                    <span class="description">
                        <?php _e('Manually sync all products, pages, and posts to SEO Max.', 'seo-max-connector'); ?>
                    </span>
                </p>
                <div id="seo-max-sync-result"></div>
            </div>
            
            <div class="seo-max-card seo-max-info">
                <h2><?php _e('How It Works', 'seo-max-connector'); ?></h2>
                <ol>
                    <li><?php _e('Get your API key from the SEO Max dashboard', 'seo-max-connector'); ?></li>
                    <li><?php _e('Enter the API key above and save settings', 'seo-max-connector'); ?></li>
                    <li><?php _e('Click "Test Connection" to verify the connection', 'seo-max-connector'); ?></li>
                    <li><?php _e('Click "Sync All Data Now" to send your site data to SEO Max', 'seo-max-connector'); ?></li>
                    <li><?php _e('Manage your SEO from the SEO Max dashboard!', 'seo-max-connector'); ?></li>
                </ol>
                <p>
                    <a href="https://seo-max-pink.vercel.app/dashboard" target="_blank" class="button">
                        <?php _e('Open SEO Max Dashboard', 'seo-max-connector'); ?>
                    </a>
                </p>
            </div>
        </div>
        <?php
    }
    
    /**
     * Render sync status page
     */
    public function render_sync_page() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'seo_max_sync_log';
        $logs = $wpdb->get_results("SELECT * FROM $table_name ORDER BY created_at DESC LIMIT 20");
        
        // Get counts
        $product_count = class_exists('WooCommerce') ? wp_count_posts('product')->publish : 0;
        $page_count = wp_count_posts('page')->publish;
        $post_count = wp_count_posts('post')->publish;
        ?>
        <div class="wrap seo-max-settings">
            <h1><?php _e('Sync Status', 'seo-max-connector'); ?></h1>
            
            <div class="seo-max-stats">
                <div class="seo-max-stat">
                    <span class="stat-number"><?php echo esc_html($product_count); ?></span>
                    <span class="stat-label"><?php _e('Products', 'seo-max-connector'); ?></span>
                </div>
                <div class="seo-max-stat">
                    <span class="stat-number"><?php echo esc_html($page_count); ?></span>
                    <span class="stat-label"><?php _e('Pages', 'seo-max-connector'); ?></span>
                </div>
                <div class="seo-max-stat">
                    <span class="stat-number"><?php echo esc_html($post_count); ?></span>
                    <span class="stat-label"><?php _e('Posts', 'seo-max-connector'); ?></span>
                </div>
            </div>
            
            <div class="seo-max-card">
                <h2><?php _e('Recent Sync Activity', 'seo-max-connector'); ?></h2>
                
                <?php if (empty($logs)): ?>
                    <p><?php _e('No sync activity yet.', 'seo-max-connector'); ?></p>
                <?php else: ?>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th><?php _e('Date', 'seo-max-connector'); ?></th>
                                <th><?php _e('Type', 'seo-max-connector'); ?></th>
                                <th><?php _e('Items', 'seo-max-connector'); ?></th>
                                <th><?php _e('Status', 'seo-max-connector'); ?></th>
                                <th><?php _e('Message', 'seo-max-connector'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($logs as $log): ?>
                                <tr>
                                    <td><?php echo esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($log->created_at))); ?></td>
                                    <td><?php echo esc_html($log->sync_type); ?></td>
                                    <td><?php echo esc_html($log->items_synced); ?></td>
                                    <td>
                                        <span class="sync-status sync-status-<?php echo esc_attr($log->status); ?>">
                                            <?php echo esc_html($log->status); ?>
                                        </span>
                                    </td>
                                    <td><?php echo esc_html($log->message); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }
    
    /**
     * AJAX: Test connection
     */
    public function ajax_test_connection() {
        check_ajax_referer('seo_max_admin', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => __('Permission denied', 'seo-max-connector')));
        }
        
        $api_key = isset($_POST['api_key']) ? sanitize_text_field($_POST['api_key']) : get_option('seo_max_api_key', '');
        
        if (empty($api_key)) {
            wp_send_json_error(array('message' => __('Please enter an API key', 'seo-max-connector')));
        }
        
        $this->api_client->set_api_key($api_key);
        $result = $this->api_client->connect();
        
        if ($result['success']) {
            update_option('seo_max_api_key', $api_key);
            wp_send_json_success(array(
                'message' => __('Connection successful!', 'seo-max-connector'),
                'store' => $result['data']['store'],
            ));
        } else {
            wp_send_json_error(array(
                'message' => isset($result['error']) ? $result['error'] : __('Connection failed', 'seo-max-connector'),
            ));
        }
    }
    
    /**
     * AJAX: Sync now
     */
    public function ajax_sync_now() {
        check_ajax_referer('seo_max_admin', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => __('Permission denied', 'seo-max-connector')));
        }
        
        if (!seo_max()->is_connected()) {
            wp_send_json_error(array('message' => __('Not connected to SEO Max', 'seo-max-connector')));
        }
        
        $results = $this->data_sync->sync_all();
        
        $total_synced = 0;
        $errors = array();
        
        foreach ($results as $type => $result) {
            if (isset($result['count'])) {
                $total_synced += $result['count'];
            }
            if (isset($result['success']) && !$result['success']) {
                $errors[] = $type . ': ' . (isset($result['error']) ? $result['error'] : 'Unknown error');
            }
        }
        
        if (empty($errors)) {
            wp_send_json_success(array(
                'message' => sprintf(__('Successfully synced %d items', 'seo-max-connector'), $total_synced),
                'results' => $results,
            ));
        } else {
            wp_send_json_error(array(
                'message' => implode('; ', $errors),
                'results' => $results,
            ));
        }
    }
}
