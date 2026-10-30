<?php
require_once 'db_helper.php';

$method = $_SERVER['REQUEST_METHOD'];

function ensureUserSettingsTable($pdo) {
    try {
        $sql = "
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TeamPlanner_UserSettings' and xtype='U')
            BEGIN
                CREATE TABLE TeamPlanner_UserSettings (
                    Username NVARCHAR(100) PRIMARY KEY,
                    GithubUsername NVARCHAR(255) NULL,
                    GithubToken NVARCHAR(255) NULL
                )
            END
        ";
        $pdo->exec($sql);
    } catch (Exception $e) {
        error_log("Failed to initialize user settings: " . $e->getMessage());
    }
}

try {
    $currentUsername = $_SESSION['user']['username'] ?? '';
    if (!$currentUsername) {
        sendJson(['error' => 'Unauthorized'], 401);
    }

    ensureUserSettingsTable($pdo);

    if ($method === 'GET') {
        // Get AKA
        $stmt = $pdo->prepare("SELECT aka FROM USERS WHERE username = ?");
        $stmt->execute([$currentUsername]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        $aka = $user ? $user['aka'] : '';

        // Get Github Settings
        $stmt2 = $pdo->prepare("SELECT GithubUsername, GithubToken FROM TeamPlanner_UserSettings WHERE Username = ?");
        $stmt2->execute([$currentUsername]);
        $settings = $stmt2->fetch(PDO::FETCH_ASSOC);

        sendJson([
            'aka' => $aka,
            'githubUsername' => $settings ? $settings['GithubUsername'] : '',
            'githubToken' => $settings ? $settings['GithubToken'] : ''
        ]);
    } 
    elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $aka = $data['aka'] ?? '';
        $githubUsername = $data['githubUsername'] ?? '';
        $githubToken = $data['githubToken'] ?? '';
        
        // Update AKA
        $stmt = $pdo->prepare("UPDATE USERS SET aka = ? WHERE username = ?");
        $stmt->execute([$aka, $currentUsername]);

        // Upsert Github Settings
        $stmt2 = $pdo->prepare("
            IF EXISTS (SELECT 1 FROM TeamPlanner_UserSettings WHERE Username = ?)
            BEGIN
                UPDATE TeamPlanner_UserSettings SET GithubUsername = ?, GithubToken = ? WHERE Username = ?
            END
            ELSE
            BEGIN
                INSERT INTO TeamPlanner_UserSettings (Username, GithubUsername, GithubToken) VALUES (?, ?, ?)
            END
        ");
        $stmt2->execute([
            $currentUsername, 
            $githubUsername, $githubToken, $currentUsername,
            $currentUsername, $githubUsername, $githubToken
        ]);
        
        sendJson(['success' => true, 'aka' => $aka, 'githubUsername' => $githubUsername]);
    } else {
        sendJson(['error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    sendJson(['error' => $e->getMessage()], 500);
}
?>
