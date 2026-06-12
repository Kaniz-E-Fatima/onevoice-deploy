$outputDir = 'c:\Users\kaniz\OneDrive\Desktop\onevoice-deploy\code_as_text'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$files = @(
    # Root
    'vercel.json',
    '.gitignore',
    # Backend
    'backend\config.py',
    'backend\evaluate.py',
    'backend\main.py',
    'backend\requirements.txt',
    'backend\.env.example',
    # Backend routes
    'backend\routes\admin.py',
    'backend\routes\analytics.py',
    'backend\routes\auth.py',
    'backend\routes\chat.py',
    'backend\routes\__init__.py',
    # Backend services
    'backend\services\gemini_service.py',
    'backend\services\rag_service.py',
    'backend\services\sync_service.py',
    'backend\services\__init__.py',
    # Backend database
    'backend\database\connection.py',
    'backend\database\models.py',
    'backend\database\__init__.py',
    # Frontend root
    'frontend\index.html',
    'frontend\package.json',
    'frontend\vite.config.js',
    'frontend\vercel.json',
    # Frontend src
    'frontend\src\App.jsx',
    'frontend\src\main.jsx',
    # Frontend components
    'frontend\src\components\AdminDashboard.jsx',
    'frontend\src\components\ChatInput.jsx',
    'frontend\src\components\ChatMessages.jsx',
    'frontend\src\components\ChatWidget.jsx',
    'frontend\src\components\Login.jsx',
    'frontend\src\components\TypingIndicator.jsx',
    # Frontend services
    'frontend\src\services\api.js',
    # Frontend styles
    'frontend\src\styles\admin.css',
    'frontend\src\styles\home.css',
    'frontend\src\styles\login.css',
    'frontend\src\styles\widget.css',
    # Frontend public
    'frontend\public\manifest.json',
    'frontend\public\sw.js'
)

$base = 'c:\Users\kaniz\OneDrive\Desktop\onevoice-deploy'

foreach ($rel in $files) {
    $src = Join-Path $base $rel
    if (Test-Path $src) {
        $name = [System.IO.Path]::GetFileName($src)
        $dest = Join-Path $outputDir ($name + '.txt')
        Copy-Item $src $dest -Force
        Write-Host "Copied: $name -> $($name).txt"
    } else {
        Write-Host "SKIP (not found): $rel"
    }
}

Write-Host "`nDone! All files saved to: $outputDir"
