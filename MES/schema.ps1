$connString = "Server=10.1.1.31;Database=IIOT_TOOLBOX;User Id=TOOLBOX;Password=I1o1@T@#1boX;TrustServerCertificate=True"
$conn = New-Object System.Data.SqlClient.SqlConnection $connString
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'USERS'"
$reader = $cmd.ExecuteReader()
Write-Output "--- USERS TABLE ---"
while ($reader.Read()) { Write-Output "$($reader[0]) - $($reader[1])" }
$reader.Close()

$cmd.CommandText = "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MANPOWER_EMPLOYEES_TEST'"
$reader = $cmd.ExecuteReader()
Write-Output "--- MANPOWER_EMPLOYEES_TEST TABLE ---"
while ($reader.Read()) { Write-Output "$($reader[0]) - $($reader[1])" }
$reader.Close()

$cmd.CommandText = "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MANPOWER_EMPLOYEES'"
$reader = $cmd.ExecuteReader()
Write-Output "--- MANPOWER_EMPLOYEES TABLE ---"
while ($reader.Read()) { Write-Output "$($reader[0]) - $($reader[1])" }
$reader.Close()
$conn.Close()
