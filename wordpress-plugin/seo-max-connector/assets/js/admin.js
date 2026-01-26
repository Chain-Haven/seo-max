/**
 * SEO Max Connector - Admin JavaScript
 */

(function($) {
    'use strict';
    
    // Test connection
    $('#seo-max-test-connection').on('click', function(e) {
        e.preventDefault();
        
        var $button = $(this);
        var $apiKeyInput = $('#seo_max_api_key');
        var apiKey = $apiKeyInput.val();
        
        if (!apiKey) {
            alert(seoMaxAdmin.strings.error + ': Please enter an API key');
            $apiKeyInput.focus();
            return;
        }
        
        $button.prop('disabled', true).text(seoMaxAdmin.strings.testing);
        
        $.ajax({
            url: seoMaxAdmin.ajaxUrl,
            type: 'POST',
            data: {
                action: 'seo_max_test_connection',
                nonce: seoMaxAdmin.nonce,
                api_key: apiKey
            },
            success: function(response) {
                if (response.success) {
                    alert(seoMaxAdmin.strings.success + '\n\nStore: ' + response.data.store.name);
                    location.reload();
                } else {
                    alert(seoMaxAdmin.strings.error + ': ' + response.data.message);
                }
            },
            error: function() {
                alert(seoMaxAdmin.strings.error + ': Network error');
            },
            complete: function() {
                $button.prop('disabled', false).text('Test Connection');
            }
        });
    });
    
    // Sync now
    $('#seo-max-sync-now').on('click', function(e) {
        e.preventDefault();
        
        var $button = $(this);
        var $result = $('#seo-max-sync-result');
        
        $button.prop('disabled', true).text(seoMaxAdmin.strings.syncing);
        $result.html('<p><em>' + seoMaxAdmin.strings.syncing + '</em></p>');
        
        $.ajax({
            url: seoMaxAdmin.ajaxUrl,
            type: 'POST',
            data: {
                action: 'seo_max_sync_now',
                nonce: seoMaxAdmin.nonce
            },
            success: function(response) {
                if (response.success) {
                    $result.html(
                        '<div class="notice notice-success"><p>' + 
                        response.data.message + 
                        '</p></div>'
                    );
                    
                    // Show detailed results
                    if (response.data.results) {
                        var details = '<ul>';
                        $.each(response.data.results, function(type, result) {
                            var count = result.count || 0;
                            var status = result.success !== false ? '✓' : '✗';
                            details += '<li>' + status + ' ' + type + ': ' + count + ' items</li>';
                        });
                        details += '</ul>';
                        $result.append(details);
                    }
                } else {
                    $result.html(
                        '<div class="notice notice-error"><p>' + 
                        response.data.message + 
                        '</p></div>'
                    );
                }
            },
            error: function() {
                $result.html(
                    '<div class="notice notice-error"><p>' + 
                    seoMaxAdmin.strings.error + ': Network error' + 
                    '</p></div>'
                );
            },
            complete: function() {
                $button.prop('disabled', false).text('Sync All Data Now');
            }
        });
    });
    
    // Auto-save API key on blur
    $('#seo_max_api_key').on('change', function() {
        // Visual feedback that key has changed
        var $input = $(this);
        var originalBg = $input.css('background-color');
        $input.css('background-color', '#ffffcc');
        setTimeout(function() {
            $input.css('background-color', originalBg);
        }, 500);
    });
    
})(jQuery);
