Set WshShell = CreateObject("WScript.Shell")
' Run the node script completely hidden
WshShell.Run "node E:\MES\MES\MES\performance_dashboard.cjs", 0, False
