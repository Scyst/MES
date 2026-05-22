<?php
$val = '26/05/2026';
if (preg_match('/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/', $val, $m)) {
    $day   = (int)$m[1];
    $month = (int)$m[2];
    $year  = (int)$m[3];
    if ($month >= 1 && $month <= 12 && $day >= 1 && $day <= 31) {
        if (checkdate($month, $day, $year)) {
            echo sprintf('%04d-%02d-%02d', $year, $month, $day);
        } else {
            echo "invalid checkdate";
        }
    } else {
        echo "invalid month/day ranges";
    }
} else {
    echo "no match";
}
