# Kitchen pronunciation assets

These ten WAV files are the production pronunciation source for the first mini-program MVP. They were generated as 16 kHz, 16-bit, mono PCM with the installed Microsoft Zira `en-US` system voice, at speech rate `-1`.

The `speech-synthesize` cloud function validates the fixed vocabulary allow-list and WAV header before returning an asset. When Kitchen vocabulary or pronunciation audio changes, update the files and bump the `kitchen-standard-en-v1` cache key.
