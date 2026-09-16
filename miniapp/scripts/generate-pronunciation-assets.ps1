param(
  [string]$Voice = 'Microsoft Zira Desktop'
)

$ErrorActionPreference = 'Stop'
$miniappRoot = Split-Path -Parent $PSScriptRoot
$catalogPath = Join-Path $miniappRoot 'src/data/catalog.generated.json'
$outputDirectory = Join-Path $miniappRoot 'cloudfunctions/speech-synthesize/audio'
$catalog = [System.IO.File]::ReadAllText($catalogPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json

Add-Type -AssemblyName System.Speech
$synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(
  16000,
  [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
  [System.Speech.AudioFormat.AudioChannel]::Mono
)
$synthesizer.SelectVoice($Voice)
$synthesizer.Rate = -1

try {
  foreach ($item in $catalog.vocabulary.PSObject.Properties.Value) {
    $target = Join-Path $outputDirectory ($item.id + '.wav')
    $synthesizer.SetOutputToWaveFile($target, $format)
    $synthesizer.Speak($item.audioText)
  }
} finally {
  $synthesizer.SetOutputToNull()
  $synthesizer.Dispose()
}

$vocabularyCount = @($catalog.vocabulary.PSObject.Properties).Count
Write-Host "Generated $vocabularyCount pronunciation files with $Voice."
