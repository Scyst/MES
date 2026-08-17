Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c node performance_logger.cjs >> logger_crash.log 2>&1", 0, False
WshShell.Run "cmd /c node performance_dashboard.cjs >> dashboard_crash.log 2>&1", 0, False
WshShell.Run "cmd /c node backup_server.cjs >> backup_crash.log 2>&1", 0, False
