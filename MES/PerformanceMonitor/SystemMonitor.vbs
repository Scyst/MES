Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "e:\MES\MES\MES\PerformanceMonitor"
WshShell.Run "pythonw PerformanceMonitor.py", 0, False
