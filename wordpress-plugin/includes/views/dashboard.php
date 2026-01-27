<?php
/**
 * WordPress Plugin Dashboard
 */

if (!defined('ABSPATH')) {
    exit;
}

$api_key = get_option('seo_max_api_key');
$store_id = get_option('seo_max_store_id');
$is_configured = !empty($api_key) && !empty($store_id);

$sync_manager = new SEO_Max_Sync_Manager();
$last_sync = get_option('seo_max_last_sync', 'Never');

// Get stats
$product_count = wp_count_posts('product');
$post_count = wp_count_posts('post');
$detected_plugins = get_option('seo_max_detected_plugins', array());
?>

<div class="wrap">
    <h1>SEO Max Dashboard</h1>
    
    <?php if (!$is_configured): ?>
        <div class="notice notice-warning">
            <p><strong>Setup Required:</strong> Please configure your API key in <a href="<?php echo admin_url('admin.php?page=seo-max-settings'); ?>">Settings</a> to enable sync with the SEO Max platform.</p>
        </div>
    <?php endif; ?>
    
    <?php if (!empty($detected_plugins)): ?>
        <div class="notice notice-info">
            <p>
                <strong>Other SEO plugins detected:</strong> <?php echo implode(', ', array_column($detected_plugins, 'name')); ?>
                <br>
                SEO Max is working in compatible mode to avoid conflicts. You can adjust this in Settings.
            </p>
        </div>
    <?php endif; ?>
    
    <div class="seo-max-dashboard-grid">
        <!-- Connection Status -->
        <div class="postbox">
            <h2 class="hndle">Connection Status</h2>
            <div class="inside">
                <table class="form-table">
                    <tr>
                        <td><strong>Platform Connection:</strong></td>
                        <td>
                            <?php if ($is_configured): ?>
                                <span class="dashicons dashicons-yes-alt" style="color: green;"></span> Connected
                            <?php else: ?>
                                <span class="dashicons dashicons-warning" style="color: orange;"></span> Not Configured
                            <?php endif; ?>
                        </td>
                    </tr>
                    <tr>
                        <td><strong>Last Sync:</strong></td>
                        <td><?php echo esc_html($last_sync); ?></td>
                    </tr>
                    <tr>
                        <td><strong>WordPress Version:</strong></td>
                        <td><?php echo get_bloginfo('version'); ?></td>
                    </tr>
                    <?php if (class_exists('WooCommerce')): ?>
                    <tr>
                        <td><strong>WooCommerce:</strong></td>
                        <td>
                            <span class="dashicons dashicons-yes-alt" style="color: green;"></span> 
                            Version <?php echo WC()->version; ?>
                        </td>
                    </tr>
                    <?php endif; ?>
                </table>
                
                <?php if ($is_configured): ?>
                    <p>
                        <button type="button" class="button button-primary" id="trigger-sync">
                            Sync Now
                        </button>
                        <a href="https://seo-max-pink.vercel.app/dashboard/stores/<?php echo esc_attr($store_id); ?>" 
                           target="_blank" 
                           class="button">
                            Open Platform Dashboard
                        </a>
                    </p>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- Content Stats -->
        <div class="postbox">
            <h2 class="hndle">Content Statistics</h2>
            <div class="inside">
                <table class="form-table">
                    <?php if (class_exists('WooCommerce')): ?>
                    <tr>
                        <td><strong>Products:</strong></td>
                        <td><?php echo $product_count->publish ?? 0; ?></td>
                    </tr>
                    <?php endif; ?>
                    <tr>
                        <td><strong>Blog Posts:</strong></td>
                        <td><?php echo $post_count->publish ?? 0; ?></td>
                    </tr>
                    <tr>
                        <td><strong>Pages:</strong></td>
                        <td><?php echo wp_count_posts('page')->publish ?? 0; ?></td>
                    </tr>
                </table>
            </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="postbox">
            <h2 class="hndle">Quick Actions</h2>
            <div class="inside">
                <p>
                    <a href="<?php echo admin_url('admin.php?page=seo-max-bulk'); ?>" class="button button-secondary">
                        Bulk Operations
                    </a>
                </p>
                <p>
                    <a href="<?php echo admin_url('edit.php?post_type=product'); ?>" class="button">
                        Manage Products
                    </a>
                </p>
                <p>
                    <a href="<?php echo admin_url('edit.php'); ?>" class="button">
                        Manage Posts
                    </a>
                </p>
            </div>
        </div>
    </div>
</div>

<style>
.seo-max-dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.seo-max-dashboard-grid .postbox {
    margin-bottom: 0;
}
</style>

<script>
jQuery(document).ready(function($) {
    $('#trigger-sync').on('click', function() {
        var btn = $(this);
        btn.prop('disabled', true).text('Syncing...');
        
        $.ajax({
            url: '<?php echo rest_url('seo-max/v1/sync'); ?>',
            type: 'POST',
            headers: {
                'X-API-Key': '<?php echo esc_js($api_key); ?>',
            },
            success: function(response) {
                alert('Sync complete! ' + response.posts + ' posts, ' + response.products + ' products synced.');
                btn.prop('disabled', false).text('Sync Now');
                location.reload();
            },
            error: function() {
                alert('Sync failed. Please check your settings.');
                btn.prop('disabled', false).text('Sync Now');
            }
        });
    });
});
</script>
