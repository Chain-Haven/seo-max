<?php
/**
 * SEO Max Meta Box View
 * Real-time content optimization in the WordPress editor
 */

if (!defined('ABSPATH')) {
    exit;
}

$post_id = get_the_ID();
$focus_keyword = get_post_meta($post_id, '_seo_max_focus_keyword', true);
$seo_title = get_post_meta($post_id, '_seo_max_title', true);
$seo_description = get_post_meta($post_id, '_seo_max_description', true);
?>

<div id="seo-max-meta-box" class="seo-max-container">
    <div class="seo-max-tabs">
        <button class="seo-max-tab active" data-tab="general">General</button>
        <button class="seo-max-tab" data-tab="schema">Schema</button>
        <button class="seo-max-tab" data-tab="analysis">Content Analysis</button>
    </div>
    
    <!-- General Tab -->
    <div class="seo-max-tab-content active" data-tab="general">
        <div class="seo-max-field">
            <label for="seo_max_focus_keyword">
                <strong>Focus Keyword</strong>
                <span class="seo-max-help" title="Main keyword you want to rank for">?</span>
            </label>
            <input type="text" 
                   id="seo_max_focus_keyword" 
                   name="seo_max_focus_keyword" 
                   value="<?php echo esc_attr($focus_keyword); ?>"
                   class="widefat"
                   placeholder="Enter your target keyword">
        </div>
        
        <div class="seo-max-field">
            <label for="seo_max_title">
                <strong>SEO Title</strong>
                <span class="seo-max-counter" id="title-counter">0/60</span>
            </label>
            <input type="text" 
                   id="seo_max_title" 
                   name="seo_max_title" 
                   value="<?php echo esc_attr($seo_title); ?>"
                   class="widefat"
                   placeholder="<?php echo esc_attr(get_the_title($post_id)); ?>"
                   maxlength="60">
            <p class="description">Recommended: 50-60 characters</p>
        </div>
        
        <div class="seo-max-field">
            <label for="seo_max_description">
                <strong>Meta Description</strong>
                <span class="seo-max-counter" id="desc-counter">0/160</span>
            </label>
            <textarea id="seo_max_description" 
                      name="seo_max_description" 
                      rows="3"
                      class="widefat"
                      maxlength="160"><?php echo esc_textarea($seo_description); ?></textarea>
            <p class="description">Recommended: 120-160 characters</p>
        </div>
        
        <!-- SERP Preview -->
        <div class="seo-max-serp-preview">
            <h4>Search Preview</h4>
            <div class="serp-preview-box">
                <div class="serp-url"><?php echo esc_html(get_site_url()); ?></div>
                <div class="serp-title" id="serp-preview-title">
                    <?php echo esc_html($seo_title ?: get_the_title($post_id)); ?>
                </div>
                <div class="serp-description" id="serp-preview-description">
                    <?php echo esc_html($seo_description ?: 'Your meta description will appear here...'); ?>
                </div>
            </div>
        </div>
        
        <!-- SEO Score -->
        <div class="seo-max-score-box">
            <div class="score-circle" id="seo-score-circle">
                <span class="score-value" id="seo-score-value">--</span>
            </div>
            <div class="score-details">
                <h4>SEO Score</h4>
                <button type="button" class="button" id="analyze-content-btn">
                    Analyze Content
                </button>
            </div>
        </div>
        
        <!-- Suggestions -->
        <div id="seo-suggestions" class="seo-max-suggestions hidden">
            <h4>Optimization Suggestions</h4>
            <ul id="suggestions-list"></ul>
        </div>
    </div>
    
    <!-- Schema Tab -->
    <div class="seo-max-tab-content" data-tab="schema">
        <div class="seo-max-field">
            <label><strong>Structured Data</strong></label>
            <button type="button" class="button button-primary" id="generate-schema-btn">
                Generate Schema Markup
            </button>
            <p class="description">Automatically generate schema.org markup for this content</p>
        </div>
        
        <div id="schema-output" class="hidden">
            <label><strong>Generated Schema (JSON-LD)</strong></label>
            <textarea id="schema-json" readonly rows="10" class="widefat"></textarea>
            <button type="button" class="button" id="validate-schema-btn">
                Validate Schema
            </button>
            <div id="schema-validation-results"></div>
        </div>
    </div>
    
    <!-- Analysis Tab -->
    <div class="seo-max-tab-content" data-tab="analysis">
        <div id="content-analysis-results">
            <div class="seo-max-placeholder">
                <p>Click "Analyze Content" to see detailed SEO analysis</p>
            </div>
        </div>
        
        <div class="seo-max-checks">
            <h4>SEO Checks</h4>
            <ul id="seo-checks-list">
                <li class="check-item pending">
                    <span class="check-icon">○</span>
                    <span class="check-label">Focus keyword in title</span>
                </li>
                <li class="check-item pending">
                    <span class="check-icon">○</span>
                    <span class="check-label">Focus keyword in first paragraph</span>
                </li>
                <li class="check-item pending">
                    <span class="check-icon">○</span>
                    <span class="check-label">Content length (300+ words)</span>
                </li>
                <li class="check-item pending">
                    <span class="check-icon">○</span>
                    <span class="check-label">Meta description present</span>
                </li>
                <li class="check-item pending">
                    <span class="check-icon">○</span>
                    <span class="check-label">Images have alt text</span>
                </li>
            </ul>
        </div>
    </div>
</div>

<script type="text/javascript">
jQuery(document).ready(function($) {
    // Tab switching
    $('.seo-max-tab').on('click', function() {
        var tab = $(this).data('tab');
        $('.seo-max-tab').removeClass('active');
        $('.seo-max-tab-content').removeClass('active');
        $(this).addClass('active');
        $(`.seo-max-tab-content[data-tab="${tab}"]`).addClass('active');
    });
    
    // Character counters
    function updateCounter(inputId, counterId, max) {
        var length = $(inputId).val().length;
        $(counterId).text(length + '/' + max);
        
        if (length > max) {
            $(counterId).addClass('over-limit');
        } else {
            $(counterId).removeClass('over-limit');
        }
    }
    
    $('#seo_max_title').on('input', function() {
        updateCounter('#seo_max_title', '#title-counter', 60);
        $('#serp-preview-title').text($(this).val() || '<?php echo esc_js(get_the_title($post_id)); ?>');
    });
    
    $('#seo_max_description').on('input', function() {
        updateCounter('#seo_max_description', '#desc-counter', 160);
        $('#serp-preview-description').text($(this).val() || 'Your meta description will appear here...');
    });
    
    // Initial counters
    updateCounter('#seo_max_title', '#title-counter', 60);
    updateCounter('#seo_max_description', '#desc-counter', 160);
    
    // Content analysis
    $('#analyze-content-btn').on('click', function() {
        var btn = $(this);
        btn.prop('disabled', true).text('Analyzing...');
        
        // Get content from editor
        var content = '';
        if (typeof wp !== 'undefined' && wp.data && wp.data.select('core/editor')) {
            content = wp.data.select('core/editor').getEditedPostContent();
        } else if (typeof tinyMCE !== 'undefined' && tinyMCE.activeEditor) {
            content = tinyMCE.activeEditor.getContent();
        } else {
            content = $('#content').val();
        }
        
        $.ajax({
            url: seoMaxData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'seo_max_optimize_content',
                nonce: seoMaxData.nonce,
                content: content,
                title: $('#seo_max_title').val(),
                description: $('#seo_max_description').val(),
                keyword: $('#seo_max_focus_keyword').val(),
            },
            success: function(response) {
                if (response.success) {
                    var data = response.data;
                    $('#seo-score-value').text(data.score);
                    $('#seo-score-circle').removeClass('score-low score-medium score-high');
                    
                    if (data.score >= 80) {
                        $('#seo-score-circle').addClass('score-high');
                    } else if (data.score >= 60) {
                        $('#seo-score-circle').addClass('score-medium');
                    } else {
                        $('#seo-score-circle').addClass('score-low');
                    }
                    
                    // Show suggestions
                    var suggestionsList = $('#suggestions-list');
                    suggestionsList.empty();
                    
                    if (data.suggestions && data.suggestions.length > 0) {
                        data.suggestions.forEach(function(suggestion) {
                            var icon = suggestion.type === 'error' ? '❌' : 
                                     suggestion.type === 'warning' ? '⚠️' : '💡';
                            suggestionsList.append(
                                '<li class="suggestion-' + suggestion.type + '">' +
                                '<span class="suggestion-icon">' + icon + '</span>' +
                                '<span>' + suggestion.message + '</span>' +
                                '</li>'
                            );
                        });
                        $('#seo-suggestions').removeClass('hidden');
                    }
                }
                
                btn.prop('disabled', false).text('Analyze Content');
            },
            error: function() {
                alert('Analysis failed. Please try again.');
                btn.prop('disabled', false).text('Analyze Content');
            }
        });
    });
    
    // Generate schema
    $('#generate-schema-btn').on('click', function() {
        var btn = $(this);
        btn.prop('disabled', true).text('Generating...');
        
        $.ajax({
            url: seoMaxData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'seo_max_generate_schema',
                nonce: seoMaxData.nonce,
                post_id: <?php echo $post_id; ?>,
            },
            success: function(response) {
                if (response.success) {
                    $('#schema-json').val(JSON.stringify(response.data, null, 2));
                    $('#schema-output').removeClass('hidden');
                }
                btn.prop('disabled', false).text('Generate Schema Markup');
            },
            error: function() {
                alert('Schema generation failed.');
                btn.prop('disabled', false).text('Generate Schema Markup');
            }
        });
    });
});
</script>

<style>
.seo-max-container {
    padding: 10px;
}

.seo-max-tabs {
    border-bottom: 1px solid #ddd;
    margin-bottom: 20px;
}

.seo-max-tab {
    background: none;
    border: none;
    padding: 10px 20px;
    cursor: pointer;
    font-weight: 500;
    border-bottom: 3px solid transparent;
}

.seo-max-tab.active {
    border-bottom-color: #0073aa;
    color: #0073aa;
}

.seo-max-tab-content {
    display: none;
}

.seo-max-tab-content.active {
    display: block;
}

.seo-max-field {
    margin-bottom: 20px;
}

.seo-max-field label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.seo-max-counter {
    font-size: 12px;
    color: #666;
}

.seo-max-counter.over-limit {
    color: #dc3232;
    font-weight: bold;
}

.seo-max-serp-preview {
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 15px;
    margin: 20px 0;
}

.serp-preview-box {
    background: white;
    padding: 12px;
    border-radius: 4px;
}

.serp-url {
    font-size: 12px;
    color: #006621;
    margin-bottom: 4px;
}

.serp-title {
    font-size: 18px;
    color: #1a0dab;
    font-weight: 500;
    margin-bottom: 4px;
    cursor: pointer;
}

.serp-title:hover {
    text-decoration: underline;
}

.serp-description {
    font-size: 13px;
    color: #545454;
    line-height: 1.4;
}

.seo-max-score-box {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 15px;
    background: #f9f9f9;
    border-radius: 4px;
    margin: 20px 0;
}

.score-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 6px solid #ddd;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
}

.score-circle.score-high {
    border-color: #46b450;
    color: #46b450;
}

.score-circle.score-medium {
    border-color: #ffb900;
    color: #ffb900;
}

.score-circle.score-low {
    border-color: #dc3232;
    color: #dc3232;
}

.seo-max-suggestions {
    margin-top: 20px;
}

.seo-max-suggestions ul {
    list-style: none;
    margin: 0;
    padding: 0;
}

.seo-max-suggestions li {
    padding: 10px;
    margin-bottom: 8px;
    border-left: 4px solid #ddd;
    background: #f9f9f9;
}

.suggestion-error {
    border-left-color: #dc3232;
}

.suggestion-warning {
    border-left-color: #ffb900;
}

.suggestion-improvement {
    border-left-color: #0073aa;
}

.suggestion-icon {
    margin-right: 8px;
}

.hidden {
    display: none !important;
}
</style>
