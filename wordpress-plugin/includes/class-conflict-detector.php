<?php
/**
 * SEO Plugin Conflict Detector
 * Detects and manages conflicts with Yoast, RankMath, and other SEO plugins
 */

if (!defined('ABSPATH')) {
    exit;
}

class SEO_Max_Conflict_Detector {
    private $detected_plugins = array();
    
    public function __construct() {
        $this->detect_plugins();
    }
    
    private function detect_plugins() {
        // Yoast SEO
        if (defined('WPSEO_VERSION')) {
            $this->detected_plugins['yoast'] = array(
                'name' => 'Yoast SEO',
                'version' => WPSEO_VERSION,
                'active' => true,
            );
        }
        
        // Rank Math
        if (defined('RANK_MATH_VERSION')) {
            $this->detected_plugins['rankmath'] = array(
                'name' => 'Rank Math',
                'version' => RANK_MATH_VERSION,
                'active' => true,
            );
        }
        
        // All in One SEO
        if (defined('AIOSEO_VERSION')) {
            $this->detected_plugins['aioseo'] = array(
                'name' => 'All in One SEO',
                'version' => AIOSEO_VERSION,
                'active' => true,
            );
        }
        
        // SEOPress
        if (defined('SEOPRESS_VERSION')) {
            $this->detected_plugins['seopress'] = array(
                'name' => 'SEOPress',
                'version' => SEOPRESS_VERSION,
                'active' => true,
            );
        }
        
        update_option('seo_max_detected_plugins', $this->detected_plugins);
    }
    
    public function get_detected_plugins() {
        return $this->detected_plugins;
    }
    
    public function has_conflicts() {
        return !empty($this->detected_plugins);
    }
    
    public function should_disable_feature($feature) {
        // Features that should be disabled if other SEO plugins are active
        $conflict_features = array(
            'meta_title' => true,
            'meta_description' => true,
            'meta_robots' => true,
            'canonical' => true,
            'og_tags' => true,
            'twitter_cards' => true,
        );
        
        // Non-conflicting features (can run alongside other plugins)
        $safe_features = array(
            'rank_tracking' => true,
            'keyword_research' => true,
            'site_audit' => true,
            'content_scoring' => false, // Can show but won't overwrite
            'schema_generation' => false, // Can add additional schemas
            'analytics' => true,
            'backlink_monitoring' => true,
        );
        
        // If no conflicts, all features enabled
        if (!$this->has_conflicts()) {
            return false;
        }
        
        // If conflicts exist, check if feature is safe
        if (isset($safe_features[$feature])) {
            return !$safe_features[$feature];
        }
        
        // If feature has conflicts and user hasn't chosen to override
        if (isset($conflict_features[$feature])) {
            return !get_option('seo_max_override_conflicts', false);
        }
        
        return false;
    }
    
    public function get_meta_source($post_id, $meta_key) {
        // Determine which plugin is managing this meta field
        $sources = array();
        
        if (isset($this->detected_plugins['yoast'])) {
            $yoast_value = get_post_meta($post_id, '_yoast_wpseo_' . $meta_key, true);
            if (!empty($yoast_value)) {
                $sources['yoast'] = $yoast_value;
            }
        }
        
        if (isset($this->detected_plugins['rankmath'])) {
            $rm_value = get_post_meta($post_id, 'rank_math_' . $meta_key, true);
            if (!empty($rm_value)) {
                $sources['rankmath'] = $rm_value;
            }
        }
        
        $seo_max_value = get_post_meta($post_id, '_seo_max_' . $meta_key, true);
        if (!empty($seo_max_value)) {
            $sources['seo_max'] = $seo_max_value;
        }
        
        return $sources;
    }
    
    public function get_effective_meta($post_id, $meta_key) {
        // Priority order (configurable)
        $priority = get_option('seo_max_meta_priority', array('yoast', 'rankmath', 'aioseo', 'seo_max'));
        
        $sources = $this->get_meta_source($post_id, $meta_key);
        
        foreach ($priority as $plugin) {
            if (isset($sources[$plugin]) && !empty($sources[$plugin])) {
                return array(
                    'value' => $sources[$plugin],
                    'source' => $plugin,
                );
            }
        }
        
        return null;
    }
    
    public function safe_update_meta($post_id, $meta_key, $value, $force = false) {
        // Don't overwrite if other plugin is managing it (unless forced)
        if (!$force) {
            $effective = $this->get_effective_meta($post_id, $meta_key);
            if ($effective && $effective['source'] !== 'seo_max') {
                // Other plugin is managing this meta - don't overwrite
                return false;
            }
        }
        
        update_post_meta($post_id, '_seo_max_' . $meta_key, $value);
        return true;
    }
}
