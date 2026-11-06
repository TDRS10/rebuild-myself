$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function New-Icon([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.PixelOffsetMode = 'HighQuality'
  $u = $size / 512.0   # design on a 512 grid, scale to any size

  # background: charcoal -> night blue gradient
  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect,
    [System.Drawing.Color]::FromArgb(255, 11, 15, 20),
    [System.Drawing.Color]::FromArgb(255, 20, 40, 70), 90)
  $g.FillRectangle($brush, $rect)

  $gold = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 212, 175, 55))
  $emerald = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 16, 185, 129))
  $stemPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 16, 185, 129), 12 * $u)
  $stemPen.StartCap = 'Round'; $stemPen.EndCap = 'Round'
  $arcPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 212, 175, 55), 14 * $u)
  $arcPen.StartCap = 'Round'; $arcPen.EndCap = 'Round'

  # gold arc opening at the top (new beginning)
  $g.DrawArc($arcPen, 64 * $u, 64 * $u, 384 * $u, 384 * $u, 20, 320)

  # stem
  $g.DrawLine($stemPen, 256 * $u, 356 * $u, 256 * $u, 246 * $u)

  # two leaves (rotated ellipses from the stem top)
  $g.ResetTransform()
  $g.TranslateTransform(256 * $u, 300 * $u)
  $g.RotateTransform(-42)
  $g.FillEllipse($emerald, 0, -19 * $u, 108 * $u, 38 * $u)
  $g.ResetTransform()
  $g.TranslateTransform(256 * $u, 300 * $u)
  $g.RotateTransform(-138)
  $g.FillEllipse($emerald, 0, -19 * $u, 108 * $u, 38 * $u)

  # gold dot on top (spark of hope)
  $g.ResetTransform()
  $g.FillEllipse($gold, 246 * $u, 200 * $u, 20 * $u, 20 * $u)

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose(); $brush.Dispose()
  $gold.Dispose(); $emerald.Dispose(); $stemPen.Dispose(); $arcPen.Dispose()
}

New-Item -ItemType Directory -Force -Path "$PSScriptRoot\icons" | Out-Null
New-Icon 512 "$PSScriptRoot\icons\icon-512.png"
New-Icon 192 "$PSScriptRoot\icons\icon-192.png"
Write-Output "icons created"
