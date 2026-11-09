# Code-drawn application icons. Run from the project root on Windows.
Add-Type -AssemblyName System.Drawing
foreach ($iconSize in @(180, 192, 512)) {
  $bitmap = [Drawing.Bitmap]::new($iconSize, $iconSize)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([Drawing.ColorTranslator]::FromHtml('#397258'))
  $pen = [Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#f5f6e9'), $iconSize * 0.025)
  $pen.StartCap = [Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [Drawing.Drawing2D.LineJoin]::Round
  $left = [Drawing.PointF[]]@([Drawing.PointF]::new($iconSize*.25,$iconSize*.30),[Drawing.PointF]::new($iconSize*.38,$iconSize*.30),[Drawing.PointF]::new($iconSize*.50,$iconSize*.35),[Drawing.PointF]::new($iconSize*.50,$iconSize*.70),[Drawing.PointF]::new($iconSize*.38,$iconSize*.65),[Drawing.PointF]::new($iconSize*.25,$iconSize*.65),[Drawing.PointF]::new($iconSize*.25,$iconSize*.30))
  $right = [Drawing.PointF[]]@([Drawing.PointF]::new($iconSize*.50,$iconSize*.35),[Drawing.PointF]::new($iconSize*.62,$iconSize*.30),[Drawing.PointF]::new($iconSize*.75,$iconSize*.30),[Drawing.PointF]::new($iconSize*.75,$iconSize*.65),[Drawing.PointF]::new($iconSize*.62,$iconSize*.65),[Drawing.PointF]::new($iconSize*.50,$iconSize*.70))
  $graphics.DrawLines($pen, $left)
  $graphics.DrawLines($pen, $right)
  $fileName = if ($iconSize -eq 180) { 'apple-touch-icon.png' } else { "icon-$iconSize.png" }
  $bitmap.Save((Join-Path (Join-Path (Get-Location) 'public') $fileName), [Drawing.Imaging.ImageFormat]::Png)
  $pen.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}
