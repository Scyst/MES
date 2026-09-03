<?php
// utils/i18n.php
// Translation helper for Internationalization (i18n)

if (!function_exists('__')) {
    /**
     * Get the translated string for a given key.
     * Supports dot notation, e.g. __('profile.tab_info')
     *
     * @param string $key The translation key
     * @return string The translated string, or the key itself if not found
     */
    function __($key) {
        // 1. Get current lang from session or default 'th'
        // If the session isn't available yet (e.g. CLI or pre-auth), default to 'th'
        $lang = 'th';
        if (isset($_SESSION['user']['preferred_lang'])) {
            $lang = $_SESSION['user']['preferred_lang'];
        }

        // 2. Load dictionary (Singleton pattern to read file only once per request)
        static $dict = null;
        if ($dict === null) {
            $file = __DIR__ . "/../lang/{$lang}.json";
            if (file_exists($file)) {
                $dict = json_decode(file_get_contents($file), true);
            } else {
                $dict = [];
            }
        }

        // 3. Resolve dot notation (e.g., 'profile.tab_info')
        $keys = explode('.', $key);
        $val = $dict;
        foreach ($keys as $k) {
            if (isset($val[$k])) {
                $val = $val[$k];
            } else {
                return $key; // Fallback to key if not found
            }
        }

        return is_string($val) ? $val : $key;
    }
}
?>
