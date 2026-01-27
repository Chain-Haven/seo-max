<?php
/**
 * Bulk Operations View
 */

if (!defined('ABSPATH')) {
    exit;
}

// Get products without meta
$args = array(
    'post_type' => 'product',
    'posts_per_page' => -1,
    'meta_query' => array(
        'relation' => 'OR',
        array(
            'key' => '_seo_max_title',
            'compare' => 'NOT EXISTS',
        ),
        array(
            'key' => '_seo_max_description',
            'compare' => 'NOT EXISTS',
        ),
    ),
);

$products_needing_meta = get_posts($args);
$products_with_images = get_posts(array(
    'post_type' => 'product',
    'posts_per_page' => -1,
));

$images_needing_alt = 0;
foreach ($products_with_images as $product) {
    $product_obj = wc_get_product($product->ID);
    if ($product_obj) {
        $image_id = $product_obj->get_image_id();
        if ($image_id && !get_post_meta($image_id, '_wp_attachment_image_alt', true)) {
            $images_needing_alt++;
        }
    }
}
?>

<div class="wrap">
    <h1>Bulk Operations</h1>
    
    <div class="seo-max-bulk-summary">
        <div class="seo-max-stat-card">
            <div class="stat-number"><?php echo count($products_needing_meta); ?></div>
            <div class="stat-label">Products Need Meta</div>
        </div>
        <div class="seo-max-stat-card">
            <div class="stat-number"><?php echo $images_needing_alt; ?></div>
            <div class="stat-label">Images Need Alt Text</div>
        </div>
    </div>
    
    <div class="seo-max-bulk-operations">
        <!-- Meta Data Generation -->
        <div class="postbox">
            <h2 class="hndle">Bulk Generate Meta Data</h2>
            <div class="inside">
                <p>Generate SEO-optimized titles and descriptions for products missing them.</p>
                
                <?php if (count($products_needing_meta) > 0): ?>
                    <form method="post" id="bulk-meta-form">
                        <?php wp_nonce_field('seo_max_bulk_meta'); ?>
                        <input type="hidden" name="seo_max_bulk_action" value="generate_meta">
                        
                        <table class="wp-list-table widefat fixed striped">
                            <thead>
                                <tr>
                                    <td class="check-column">
                                        <input type="checkbox" id="select-all-meta">
                                    </td>
                                    <th>Product</th>
                                    <th>Missing</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach (array_slice($products_needing_meta, 0, 50) as $product): ?>
                                    <tr>
                                        <th class="check-column">
                                            <input type="checkbox" 
                                                   name="product_ids[]" 
                                                   value="<?php echo $product->ID; ?>">
                                        </th>
                                        <td><?php echo esc_html($product->post_title); ?></td>
                                        <td>
                                            <?php if (!get_post_meta($product->ID, '_seo_max_title', true)): ?>
                                                <span class="dashicons dashicons-warning" title="Missing title"></span>
                                            <?php endif; ?>
                                            <?php if (!get_post_meta($product->ID, '_seo_max_description', true)): ?>
                                                <span class="dashicons dashicons-warning" title="Missing description"></span>
                                            <?php endif; ?>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                        
                        <p class="submit">
                            <button type="submit" class="button button-primary">
                                Generate Meta Data for Selected Products
                            </button>
                        </p>
                    </form>
                <?php else: ?>
                    <p class="description">All products have meta data! ✓</p>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- Alt Text Generation -->
        <div class="postbox">
            <h2 class="hndle">Bulk Generate Alt Text</h2>
            <div class="inside">
                <p>Automatically generate descriptive alt text for product images.</p>
                
                <?php if ($images_needing_alt > 0): ?>
                    <form method="post" id="bulk-alt-form">
                        <?php wp_nonce_field('seo_max_bulk_alt'); ?>
                        <input type="hidden" name="seo_max_bulk_action" value="generate_alt">
                        
                        <p>
                            <strong><?php echo $images_needing_alt; ?></strong> images need alt text.
                        </p>
                        
                        <p class="submit">
                            <button type="submit" class="button button-primary">
                                Generate Alt Text for All Images
                            </button>
                        </p>
                    </form>
                <?php else: ?>
                    <p class="description">All images have alt text! ✓</p>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- Schema Generation -->
        <div class="postbox">
            <h2 class="hndle">Bulk Generate Schema Markup</h2>
            <div class="inside">
                <p>Add structured data to all products for better search appearance.</p>
                
                <form method="post" id="bulk-schema-form">
                    <?php wp_nonce_field('seo_max_bulk_schema'); ?>
                    <input type="hidden" name="seo_max_bulk_action" value="generate_schema">
                    
                    <p class="submit">
                        <button type="submit" class="button button-primary">
                            Generate Schema for All Products
                        </button>
                    </p>
                </form>
            </div>
        </div>
    </div>
</div>

<style>
.seo-max-bulk-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin: 20px 0;
}

.seo-max-stat-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 20px;
    text-align: center;
}

.stat-number {
    font-size: 36px;
    font-weight: bold;
    color: #0073aa;
}

.stat-label {
    font-size: 14px;
    color: #666;
    margin-top: 5px;
}

.seo-max-bulk-operations .postbox {
    margin-bottom: 20px;
}
</style>

<script>
jQuery(document).ready(function($) {
    $('#select-all-meta').on('change', function() {
        $('#bulk-meta-form input[name="product_ids[]"]').prop('checked', this.checked);
    });
});
</script>
