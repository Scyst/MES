<?php
// MES/page/components/php/i18n.php

// Determine the current language (default to 'th')
$currentLang = $_SESSION['user']['language_preference'] ?? 'th';
$langFilePath = __DIR__ . "/../../../lang/{$currentLang}.json";

// Fallback to Thai if the selected language file doesn't exist
if (!file_exists($langFilePath)) {
    $langFilePath = __DIR__ . "/../../../lang/th.json";
}

$GLOBALS['i18n_translations'] = [];

if (file_exists($langFilePath)) {
    $jsonContent = file_get_contents($langFilePath);
    $parsed = json_decode($jsonContent, true);
    if (is_array($parsed)) {
        $GLOBALS['i18n_translations'] = $parsed;
    }
}

/**
 * Translate a key into the current language.
 * Format: __('module.key', 'Fallback Text')
 * Example: __('profile.title', 'My Profile')
 */
if (!function_exists('__')) {
    function __($keyPath, $fallback = null) {
        $keys = explode('.', $keyPath);
        $current = $GLOBALS['i18n_translations'];
        
        foreach ($keys as $k) {
            if (isset($current[$k])) {
                $current = $current[$k];
            } else {
                return $fallback !== null ? $fallback : $keyPath;
            }
        }
        
        return is_string($current) ? $current : ($fallback !== null ? $fallback : $keyPath);
    }
}

/**
 * Echo a translated string
 */
if (!function_exists('_e')) {
    function _e($keyPath, $fallback = null) {
        echo htmlspecialchars(__($keyPath, $fallback));
    }
}
?>
