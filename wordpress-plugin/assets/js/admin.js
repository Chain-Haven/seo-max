/**
 * SEO Max Admin JavaScript
 */

(function($) {
    'use strict';
    
    // Real-time content analysis
    var analysisDebounce = null;
    
    function analyzeContentRealtime() {
        clearTimeout(analysisDebounce);
        
        analysisDebounce = setTimeout(function() {
            var content = '';
            
            // Get content from Gutenberg
            if (typeof wp !== 'undefined' && wp.data && wp.data.select('core/editor')) {
                content = wp.data.select('core/editor').getEditedPostContent();
            }
            // Get content from Classic Editor
            else if (typeof tinyMCE !== 'undefined' && tinyMCE.activeEditor) {
                content = tinyMCE.activeEditor.getContent();
            }
            // Fallback to textarea
            else {
                content = $('#content').val();
            }
            
            if (!content || content.length < 50) {
                return;
            }
            
            // Quick client-side checks
            updateQuickChecks(content);
        }, 2000);
    }
    
    function updateQuickChecks(content) {
        var focusKeyword = $('#seo_max_focus_keyword').val();
        var title = $('#seo_max_title').val();
        var description = $('#seo_max_description').val();
        
        if (!focusKeyword) {
            return;
        }
        
        var contentLower = content.toLowerCase();
        var keywordLower = focusKeyword.toLowerCase();
        
        // Check 1: Keyword in title
        updateCheck(0, title && title.toLowerCase().includes(keywordLower));
        
        // Check 2: Keyword in first paragraph
        var firstPara = content.substring(0, 500);
        updateCheck(1, firstPara.toLowerCase().includes(keywordLower));
        
        // Check 3: Content length
        var wordCount = content.split(/\s+/).length;
        updateCheck(2, wordCount >= 300);
        
        // Check 4: Meta description
        updateCheck(3, description && description.length >= 120);
        
        // Check 5: Images with alt (approximate)
        var imageCount = (content.match(/<img/gi) || []).length;
        var altCount = (content.match(/alt=/gi) || []).length;
        updateCheck(4, imageCount === 0 || altCount >= imageCount);
    }
    
    function updateCheck(index, passed) {
        var check = $('#seo-checks-list .check-item').eq(index);
        check.removeClass('pending passed failed');
        
        if (passed) {
            check.addClass('passed');
            check.find('.check-icon').text('✓');
        } else {
            check.addClass('failed');
            check.find('.check-icon').text('✗');
        }
    }
    
    // Initialize
    $(document).ready(function() {
        // Monitor content changes
        if (typeof wp !== 'undefined' && wp.data) {
            // Gutenberg
            wp.data.subscribe(function() {
                analyzeContentRealtime();
            });
        } else {
            // Classic Editor
            $(document).on('input', '#content', analyzeContentRealtime);
            
            if (typeof tinyMCE !== 'undefined') {
                tinyMCE.on('AddEditor', function(e) {
                    e.editor.on('input change', analyzeContentRealtime);
                });
            }
        }
        
        // Monitor keyword/meta changes
        $('#seo_max_focus_keyword, #seo_max_title, #seo_max_description').on('input', analyzeContentRealtime);
    });
    
})(jQuery);
