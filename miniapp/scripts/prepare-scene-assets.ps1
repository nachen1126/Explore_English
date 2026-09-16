param(
  [int]$SceneWidth = 960,
  [int]$SceneHeight = 640,
  [int]$ThumbnailWidth = 480,
  [int]$ThumbnailHeight = 320
)

$ErrorActionPreference = 'Stop'
$miniappRoot = Split-Path -Parent $PSScriptRoot
$repositoryRoot = Split-Path -Parent $miniappRoot
$sourceRoot = Join-Path $repositoryRoot 'public'
$outputRoot = Join-Path $miniappRoot 'assets'

$sceneAssets = @(
  'scenes/sports-fitness/swimming-pool-1.webp',
  'scenes/beauty-personal-care/skincare-1.webp',
  'scenes/kitchen-cooking.webp',
  'scenes/food-dining/supermarket-1.webp',
  'scenes/food-dining/cafe-1.webp',
  'scenes/animals/underwater-world-1.webp',
  'scenes/home-living/living-room-1.webp',
  'scenes/home-living/bathroom-1.webp',
  'scenes/home-living/laundry-room-1.webp',
  'scenes/airport-departures.webp',
  'scenes/travel-transport/hotel-room-1.webp',
  'scenes/travel-transport/train-station-1.webp',
  'scenes/study-work/classroom-1.webp'
)

$thumbnailAssets = @(
  'scenes/thumbnails/swimming-pool-1-thumb.webp',
  'scenes/thumbnails/skincare-1-thumb.webp',
  'scenes/kitchen-cooking-thumb.webp',
  'scenes/thumbnails/supermarket-1-thumb.webp',
  'scenes/thumbnails/cafe-1-thumb.webp',
  'scenes/thumbnails/underwater-world-1-thumb.webp',
  'scenes/thumbnails/living-room-1-thumb.webp',
  'scenes/thumbnails/bathroom-1-thumb.webp',
  'scenes/thumbnails/laundry-room-1-thumb.webp',
  'scenes/airport-departures-thumb.webp',
  'scenes/thumbnails/hotel-room-1-thumb.webp',
  'scenes/travel-transport/train-station-1-thumb.webp',
  'scenes/study-work/classroom-1-thumb.webp'
)

function Convert-SceneAsset {
  param(
    [string]$RelativePath,
    [int]$Width,
    [int]$Height,
    [int]$Quality
  )

  $source = Join-Path $sourceRoot $RelativePath
  $target = Join-Path $outputRoot $RelativePath
  $targetDirectory = Split-Path -Parent $target
  New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null

  & npx --yes sharp-cli -i $source -o $target --format webp --quality $Quality resize $Width $Height --fit fill
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to prepare $RelativePath"
  }
}

foreach ($asset in $sceneAssets) {
  Convert-SceneAsset -RelativePath $asset -Width $SceneWidth -Height $SceneHeight -Quality 74
}

foreach ($asset in $thumbnailAssets) {
  Convert-SceneAsset -RelativePath $asset -Width $ThumbnailWidth -Height $ThumbnailHeight -Quality 70
}

$files = Get-ChildItem -LiteralPath $outputRoot -Filter '*.webp' -Recurse
$totalBytes = ($files | Measure-Object -Property Length -Sum).Sum
Write-Host "Prepared $($files.Count) mini-program scene assets ($([Math]::Round($totalBytes / 1MB, 2)) MB)."
