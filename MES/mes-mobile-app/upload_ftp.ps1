$ftpServer = "ftp://10.0.0.2/MobileApp"
$ftpUser = "Naphat"
$ftpPass = "O@m11o1toolBox"
$localPath = "e:\MES\MES\MES\mes-mobile-app\dist"

function Upload-FtpDirectory {
    param (
        [string]$localDir,
        [string]$remoteDir
    )

    $files = Get-ChildItem -Path $localDir -File
    foreach ($file in $files) {
        $uri = "$remoteDir/$($file.Name)"
        Write-Host "Uploading $($file.FullName) to $uri"
        $webclient = New-Object System.Net.WebClient
        $webclient.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
        try {
            $webclient.UploadFile($uri, $file.FullName)
        }
        catch {
            Write-Host "Error uploading $($file.Name): $_"
        }   
    }

    $dirs = Get-ChildItem -Path $localDir -Directory
    foreach ($dir in $dirs) {
        $newRemoteDir = "$remoteDir/$($dir.Name)"
        
        # Try to create directory
        try {
            $request = [System.Net.WebRequest]::Create($newRemoteDir)
            $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
            $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
            $response = $request.GetResponse()
            $response.Close()
        }
        catch {
            # Directory might exist, ignore error
        }
        
        Upload-FtpDirectory -localDir $dir.FullName -remoteDir $newRemoteDir
    }
}

Upload-FtpDirectory -localDir $localPath -remoteDir $ftpServer
