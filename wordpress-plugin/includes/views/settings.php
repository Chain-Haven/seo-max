<?php
/**
 * Settings Page
 */

if (!defined('ABSPATH')) {
    exit;
}

// Save settings
if (isset($_POST['seo_max_save_settings'])) {
    check_admin_referer('seo_max_settings');
    
    update_option('seo_max_api_key', sanitize_text_field($_POST['api_key'] ?? ''));
    update_option('seo_max_store_id', sanitize_text_field($_POST['store_id'] ?? ''));
    update_option('seo_max_sync_enabled', isset($_POST['sync_enabled']));
    update_option('seo_max_override_conflicts', isset($_POST['override_conflicts']));
    update_option('seo_max_auto_apply_improvements', isset($_POST['auto_apply']));
    
    echo '<div class="notice notice-success"><p>Settings saved!</p></div>';
}

$api_key = get_option('seo_max_api_key', '');
$store_id = get_option('seo_max_store_id', '');
$sync_enabled = get_option('seo_max_sync_enabled', true);
$override_conflicts = get_option('seo_max_override_conflicts', false);
$auto_apply = get_option('seo_max_auto_apply_improvements', false);
$detected_plugins = get_option('seo_max_detected_plugins', array());
?>

<div class="wrap">
    <h1>SEO Max Settings</h1>
    
    <?php if (!empty($detected_plugins)): ?>
        <div class="notice notice-warning">
            <p><strong>Other SEO plugins detected:</strong> <?php echo implode(', ', array_column($detected_plugins, 'name')); ?></p>
            <p>SEO Max will work alongside these plugins without conflicts. Features like meta titles/descriptions will respect the existing plugin's settings unless you choose to override below.</p>
        </div>
    <?php endif; ?>
    
    <form method="post" action="">
        <?php wp_nonce_field('seo_max_settings'); ?>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="api_key">API Key</label>
                </th>
                <td>
                    <input type="text" 
                           id="api_key" 
                           name="api_key" 
                           value="<?php echo esc_attr($api_key); ?>" 
                           class="regular-text">
                    <p class="description">
                        Get your API key from <a href="https://seo-max-pink.vercel.app/dashboard/settings" target="_blank">SEO Max Dashboard</a>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="store_id">Store ID</label>
                </th>
                <td>
                    <input type="text" 
                           id="store_id" 
                           name="store_id" 
                           value="<?php echo esc_attr($store_id); ?>" 
                           class="regular-text">
                    <p class="description">Your store UUID from the SEO Max platform</p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">Automatic Sync</th>
                <td>
                    <label>
                        <input type="checkbox" 
                               name="sync_enabled" 
                               value="1" 
                               <?php checked($sync_enabled, true); ?>>
                        Enable automatic sync with SEO Max platform
                    </label>
                    <p class="description">Automatically sync posts/products when saved</p>
                </td>
            </tr>
            
            <?php if (!empty($detected_plugins)): ?>
            <tr>
                <th scope="row">Override Other Plugins</th>
                <td>
                    <label>
                        <input type="checkbox" 
                               name="override_conflicts" 
                               value="1" 
                               <?php checked($override_conflicts, true); ?>>
                        Allow SEO Max to override settings from other SEO plugins
                    </label>
                    <p class="description">
                        <strong>Warning:</strong> This may conflict with <?php echo implode(', ', array_column($detected_plugins, 'name')); ?>. 
                        Only enable if you want SEO Max to take priority.
                    </p>
                </td>
            </tr>
            <?php endif; ?>
            
            <tr>
                <th scope="row">Auto-Apply Improvements</th>
                <td>
                    <label>
                        <input type="checkbox" 
                               name="auto_apply" 
                               value="1" 
                               <?php checked($auto_apply, true); ?>>
                        Automatically apply AI-generated improvements
                    </label>
                    <p class="description">
                        Let SEO Max automatically optimize your content. Improvements will be applied during sync.
                    </p>
                </td>
            </tr>
        </table>
        
        <p class="submit">
            <input type="submit" 
                   name="seo_max_save_settings" 
                   class="button button-primary" 
                   value="Save Settings">
        </p>
    </form>
    
    <hr>
    
    <h2>Connection Status</h2>
    <table class="widefat">
        <tr>
            <td><strong>Plugin Version:</strong></td>
            <td><?php echo SEO_MAX_VERSION; ?></td>
        </tr>
        <tr>
            <td><strong>API Status:</strong></td>
            <td id="api-status">
                <?php if ($api_key && $store_id): ?>
                    <span class="dashicons dashicons-yes-alt" style="color: green;"></span> Connected
                <?php else: ?>
                    <span class="dashicons dashicons-warning" style="color: orange;"></span> Not configured
                <?php endif; ?>
            </td>
        </tr>
        <tr>
            <td><strong>Last Sync:</strong></td>
            <td><?php echo get_option('seo_max_last_sync', 'Never'); ?></td>
        </tr>
        <tr>
            <td><strong>WooCommerce:</strong></td>
            <td>
                <?php if (class_exists('WooCommerce')): ?>
                    <span class="dashicons dashicons-yes-alt" style="color: green;"></span> Active (<?php echo WC()->version; ?>)
                <?php else: ?>
                    <span class="dashicons dashicons-minus"></span> Not installed
                <?php endif; ?>
            </td>
        </tr>
    </table>
</div>
