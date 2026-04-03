# Recadre par projection (colonnes/lignes sombres = sujet), puis cover 1024 + fond #0a1628.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class IconCropProj {
  static int Lum(int c) {
    int r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
    return (r + g + b) / 3;
  }

  public static Rectangle ContentBounds(Bitmap bmp) {
    int w = bmp.Width, h = bmp.Height;
    var data = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    int[] px;
    try {
      int stride = Math.Abs(data.Stride);
      byte[] buf = new byte[stride * h];
      Marshal.Copy(data.Scan0, buf, 0, buf.Length);
      px = new int[w * h];
      for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
          px[y * w + x] = BitConverter.ToInt32(buf, y * stride + x * 4);
        }
      }
    } finally {
      bmp.UnlockBits(data);
    }

    // Colonne "significative" si assez de pixels sombres (capsule / pingouin)
    const int darkLum = 188;
    const double frac = 0.04;

    int minX = w, maxX = -1, minY = h, maxY = -1;
    for (int x = 0; x < w; x++) {
      int dark = 0;
      for (int y = 0; y < h; y++) {
        if (Lum(px[y * w + x]) < darkLum) dark++;
      }
      if (dark >= h * frac) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    for (int y = 0; y < h; y++) {
      int dark = 0;
      for (int x = 0; x < w; x++) {
        if (Lum(px[y * w + x]) < darkLum) dark++;
      }
      if (dark >= w * frac) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < minX || maxY < minY) return Rectangle.Empty;
    return Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
  }
}
"@ -ReferencedAssemblies @(
  ([AppDomain]::CurrentDomain.GetAssemblies() | Where-Object { $_.GetName().Name -eq 'System.Drawing' }).Location
)

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
# Optionnel : placer une export brute sous icons\app-icon-src.png (ex. git show d80af24:icons/app-icon.png).
$src = Join-Path $root "icons\app-icon-src.png"
if (-not (Test-Path $src)) { $src = Join-Path $root "icons\app-icon.png" }
$dst = Join-Path $root "icons\app-icon.png"
$tmp = Join-Path $root "icons\app-icon-work.png"

try {
  $img = [System.Drawing.Image]::FromFile($src)
  try {
    $bmp = New-Object System.Drawing.Bitmap $img
    try {
      $r = [IconCropProj]::ContentBounds($bmp)
      if ($r.IsEmpty) { throw "Aucun contenu detecte (projection)" }
      $pad = [Math]::Max(2, [int]([Math]::Min($r.Width, $r.Height) * 0.012))
      $r = [System.Drawing.Rectangle]::FromLTRB(
        [Math]::Max(0, $r.X - $pad),
        [Math]::Max(0, $r.Y - $pad),
        [Math]::Min($bmp.Width, $r.Right + $pad),
        [Math]::Min($bmp.Height, $r.Bottom + $pad)
      )

      $crop = $bmp.Clone($r, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try {
        $out = New-Object System.Drawing.Bitmap(1024, 1024)
        $g = [System.Drawing.Graphics]::FromImage($out)
        try {
          $bg = [System.Drawing.Color]::FromArgb(255, 10, 22, 40)
          $g.Clear($bg)
          $br = New-Object System.Drawing.SolidBrush $bg
          try { $g.FillRectangle($br, 0, 0, 1024, 1024) } finally { $br.Dispose() }
          $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
          $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
          $g.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
          $cw = [double]$crop.Width
          $ch = [double]$crop.Height
          # Contain : tout le sujet visible, bandes remplies par le fond theme (pas de rognage).
          $s = [Math]::Min(1024.0 / $cw, 1024.0 / $ch)
          $nw = [int][Math]::Round($cw * $s)
          $nh = [int][Math]::Round($ch * $s)
          $dx = [int]((1024 - $nw) / 2)
          $dy = [int]((1024 - $nh) / 2)
          $g.DrawImage($crop, $dx, $dy, $nw, $nh)
        } finally { if ($g) { $g.Dispose() } }
        $out.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
      } finally {
        if ($out) { $out.Dispose() }
      }
      $crop.Dispose()
    } finally { $bmp.Dispose() }
  } finally { $img.Dispose() }
  Move-Item -Force $tmp $dst
  Write-Host "OK -> $dst (projection + contain, fond #0a1628)"
} catch {
  if (Test-Path $tmp) { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
  throw
}
