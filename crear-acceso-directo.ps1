$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcut = $shell.CreateShortcut((Join-Path $desktop 'Excluvas Inteligentes.lnk'))
$shortcut.TargetPath = (Join-Path $PSScriptRoot 'Excluvas Inteligentes.bat')
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.Description = 'Abrir CRM local Excluvas Inteligentes'
$shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,13"
$shortcut.Save()
Write-Host 'Acceso directo creado en el escritorio.'
