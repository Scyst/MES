$connString = "Server=10.1.1.31;Database=IIOT_TOOLBOX;User Id=TOOLBOX;Password=I1o1@T@#1boX;TrustServerCertificate=True"
$conn = New-Object System.Data.SqlClient.SqlConnection $connString
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LOCATIONS'"
$reader = $cmd.ExecuteReader()
Write-Output "--- LOCATIONS TABLE ---"
while ($reader.Read()) { Write-Output "$($reader[0]) - $($reader[1])" }
$reader.Close()

$cmd.CommandText = "SELECT DISTINCT production_line FROM LOCATIONS WHERE production_line IS NOT NULL"
$reader = $cmd.ExecuteReader()
Write-Output "--- PRODUCTION LINES ---"
while ($reader.Read()) { Write-Output "$($reader[0])" }
$reader.Close()

$cmd.CommandText = "SELECT DISTINCT team_group FROM USERS WHERE team_group IS NOT NULL AND team_group != ''"
$reader = $cmd.ExecuteReader()
Write-Output "--- TEAM GROUPS (USERS) ---"
while ($reader.Read()) { Write-Output "$($reader[0])" }
$reader.Close()

$conn.Close()
