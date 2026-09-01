<script lang="ts">
  import { AudioPlayer, AudioPlayerControlBar, AudioPlayerDurationDisplay, AudioPlayerElement, AudioPlayerMuteButton, AudioPlayerPlayButton, AudioPlayerSeekForwardButton, AudioPlayerTimeDisplay, AudioPlayerTimeRange, AudioPlayerVolumeRange } from './index.js';
</script>
<AudioPlayer duration={60}>
  <AudioPlayerElement src="/voice.mp3" aria-label="Compound audio" />
  <AudioPlayerControlBar>
    <AudioPlayerPlayButton />
    <AudioPlayerSeekForwardButton seekOffset={10} />
    <AudioPlayerTimeDisplay />
    <AudioPlayerTimeRange />
    <AudioPlayerDurationDisplay />
    <AudioPlayerMuteButton />
    <AudioPlayerVolumeRange />
  </AudioPlayerControlBar>
</AudioPlayer>
