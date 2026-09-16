# Published-scene pronunciation assets

These ten WAV files are the production pronunciation source for the first mini-program MVP. They were generated as 16 kHz, 16-bit, mono PCM with the installed Microsoft Zira `en-US` system voice, at speech rate `-1`.

The `speech-synthesize` cloud function validates the generated published-vocabulary allow-list and WAV header before returning an asset. The 130 files cover every word in the 13 published scenes. When published vocabulary or pronunciation audio changes, regenerate the files with `miniapp/scripts/generate-pronunciation-assets.ps1` and bump the `all-scenes-standard-en-v2` cache key.
