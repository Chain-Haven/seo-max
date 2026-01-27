<?php
/**
 * WooCommerce Product SEO
 * Handles product-specific SEO optimizations
 */

if (!defined('ABSPATH')) {
    exit;
}

class SEO_Max_Product_SEO {
    
    public function __construct() {
        // Product meta box
        add_action('add_meta_boxes', array($this, 'add_product_seo_meta_box'));
        
        // Save product SEO data
        add_action('woocommerce_process_product_meta', array($this, 'save_product_seo'));
        
        // Modify product schema (don't conflict with Yoast/RankMath)
        add_filter('woocommerce_structured_data_product', array($this, 'enhance_product_schema'), 20, 2);
        
        // Out of stock handling
        add_action('woocommerce_product_set_stock_status', array($this, 'handle_stock_status_change'), 10, 3);
    }
    
    public function add_product_seo_meta_box() {
        // Check conflicts
        $conflict_detector = new SEO_Max_Conflict_Detector();
        if ($conflict_detector->should_disable_feature('meta_title')) {
            return; // Let other plugin handle it
        }
        
        add_meta_box(
            'seo_max_product_seo',
            'SEO Max - Product Optimization',
            array($this, 'render_product_seo_meta_box'),
            'product',
            'normal',
            'high'
        );
    }
    
    public function render_product_seo_meta_box($post) {
        $product = wc_get_product($post->ID);
        
        if (!$product) {
            return;
        }
        
        $seo_title = get_post_meta($post->ID, '_seo_max_title', true) ?: $product->get_name();
        $seo_description = get_post_meta($post->ID, '_seo_max_description', true) ?: $product->get_short_description();
        $focus_keyword = get_post_meta($post->ID, '_seo_max_focus_keyword', true);
        $schema_enabled = get_post_meta($post->ID, '_seo_max_schema_enabled', true) !== 'no';
        
        ?>
        <div class="seo-max-product-meta">
            <p class="form-field">
                <label for="_seo_max_focus_keyword">Focus Keyword</label>
                <input type="text" 
                       id="_seo_max_focus_keyword" 
                       name="_seo_max_focus_keyword" 
                       value="<?php echo esc_attr($focus_keyword); ?>"
                       placeholder="e.g., wireless headphones"
                       class="short">
            </p>
            
            <p class="form-field">
                <label for="_seo_max_title">
                    SEO Title
                    <span class="seo-max-counter" id="product-title-counter">0/60</span>
                </label>
                <input type="text" 
                       id="_seo_max_title" 
                       name="_seo_max_title" 
                       value="<?php echo esc_attr($seo_title); ?>"
                       placeholder="<?php echo esc_attr($product->get_name()); ?>"
                       maxlength="60"
                       class="short">
            </p>
            
            <p class="form-field">
                <label for="_seo_max_description">
                    Meta Description
                    <span class="seo-max-counter" id="product-desc-counter">0/160</span>
                </label>
                <textarea id="_seo_max_description" 
                          name="_seo_max_description" 
                          rows="3"
                          maxlength="160"
                          class="short"><?php echo esc_textarea($seo_description); ?></textarea>
            </p>
            
            <p class="form-field">
                <label>
                    <input type="checkbox" 
                           name="_seo_max_schema_enabled" 
                           value="yes" 
                           <?php checked($schema_enabled, true); ?>>
                    Enable Product Schema Markup
                </label>
                <span class="description">Automatically generate schema.org Product markup</span>
            </p>
            
            <p class="form-field">
                <button type="button" class="button button-secondary" id="optimize-product-seo">
                    AI Optimize Product SEO
                </button>
                <span class="description">Let AI generate optimized title, description, and schema</span>
            </p>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            function updateCounter(inputId, counterId, max) {
                var length = $(inputId).val().length;
                $(counterId).text(length + '/' + max);
            }
            
            $('#_seo_max_title').on('input', function() {
                updateCounter('#_seo_max_title', '#product-title-counter', 60);
            });
            
            $('#_seo_max_description').on('input', function() {
                updateCounter('#_seo_max_description', '#product-desc-counter', 160);
            });
            
            updateCounter('#_seo_max_title', '#product-title-counter', 60);
            updateCounter('#_seo_max_description', '#product-desc-counter', 160);
            
            $('#optimize-product-seo').on('click', function() {
                var btn = $(this);
                btn.prop('disabled', true).text('Optimizing...');
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'seo_max_optimize_product',
                        product_id: <?php echo $post->ID; ?>,
                        nonce: '<?php echo wp_create_nonce('seo_max_optimize'); ?>',
                    },
                    success: function(response) {
                        if (response.success) {
                            $('#_seo_max_title').val(response.data.metaTitle);
                            $('#_seo_max_description').val(response.data.metaDescription);
                            alert('Product SEO optimized!');
                        }
                        btn.prop('disabled', false).text('AI Optimize Product SEO');
                    }
                });
            });
        });
        </script>
        <?php
    }
    
    public function save_product_seo($product_id) {
        if (isset($_POST['_seo_max_focus_keyword'])) {
            update_post_meta($product_id, '_seo_max_focus_keyword', sanitize_text_field($_POST['_seo_max_focus_keyword']));
        }
        
        if (isset($_POST['_seo_max_title'])) {
            update_post_meta($product_id, '_seo_max_title', sanitize_text_field($_POST['_seo_max_title']));
        }
        
        if (isset($_POST['_seo_max_description'])) {
            update_post_meta($product_id, '_seo_max_description', sanitize_textarea_field($_POST['_seo_max_description']));
        }
        
        $schema_enabled = isset($_POST['_seo_max_schema_enabled']) ? 'yes' : 'no';
        update_post_meta($product_id, '_seo_max_schema_enabled', $schema_enabled);
    }
    
    public function enhance_product_schema($markup, $product) {
        // Only enhance if enabled and no conflicts
        $conflict_detector = new SEO_Max_Conflict_Detector();
        
        if ($conflict_detector->has_conflicts()) {
            // Other plugin managing schema - don't modify
            return $markup;
        }
        
        $product_id = $product->get_id();
        $schema_enabled = get_post_meta($product_id, '_seo_max_schema_enabled', true) !== 'no';
        
        if (!$schema_enabled) {
            return $markup;
        }
        
        // Enhance with additional fields
        if (isset($markup['sku']) && empty($markup['sku'])) {
            $markup['sku'] = $product->get_sku();
        }
        
        // Add brand if available
        $brand_terms = get_the_terms($product_id, 'product_brand');
        if ($brand_terms && !is_wp_error($brand_terms) && !isset($markup['brand'])) {
            $markup['brand'] = array(
                '@type' => 'Brand',
                'name' => $brand_terms[0]->name,
            );
        }
        
        // Add condition
        if (!isset($markup['itemCondition'])) {
            $markup['itemCondition'] = 'https://schema.org/NewCondition';
        }
        
        return $markup;
    }
    
    public function handle_stock_status_change($product_id, $stock_status, $product) {
        // Notify platform of stock status change
        if ($stock_status === 'outofstock') {
            // Check if product has SEO value
            $has_rankings = $this->product_has_rankings($product_id);
            $has_traffic = $this->product_has_traffic($product_id);
            
            if ($has_rankings || $has_traffic) {
                // Important product - don't noindex
                update_post_meta($product_id, '_seo_max_keep_indexed', 'yes');
            } else {
                // Consider noindexing after 30 days
                update_post_meta($product_id, '_seo_max_out_of_stock_date', current_time('mysql'));
            }
        }
    }
    
    private function product_has_rankings($product_id) {
        // Would check with API
        return false;
    }
    
    private function product_has_traffic($product_id) {
        // Would check with API/GA
        return false;
    }
}

new SEO_Max_Product_SEO();
