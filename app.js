// Pixel Music Player - App Logic

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const audioPlayer = document.getElementById('audio-player');
  const fileInput = document.getElementById('file-input');
  const fileCount = document.getElementById('file-count');
  const playlistEl = document.getElementById('playlist');
  const currentTrackTitle = document.getElementById('current-track-title');
  const currentTimeEl = document.getElementById('current-time');
  const remainingTimeEl = document.getElementById('remaining-time');
  const totalTimeEl = document.getElementById('total-time');
  const progressBar = document.getElementById('progress-bar');
  const soundBars = document.getElementById('sound-bars');

  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  // State
  let playlist = []; // Array of { name, url }
  let currentIndex = -1;
  let isPlaying = false;

  // Web Audio Context for retro sound effects on button click
  let audioCtx = null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function play8BitBeep(freq = 440, type = 'square', duration = 0.08) {
    try {
      initAudioContext();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // AudioContext might be blocked or unsupported
    }
  }

  // Format seconds to MM:SS
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Handle File Upload
  fileInput.addEventListener('change', (e) => {
    play8BitBeep(523, 'triangle');
    const files = Array.from(e.target.files).filter(file =>
      file.type.includes('audio') || file.name.endsWith('.mp3')
    );

    if (files.length === 0) return;

    // Clean up previous URLs
    playlist.forEach(item => URL.revokeObjectURL(item.url));

    playlist = files.map(file => ({
      name: file.name.replace(/\.[^/.]+$/, ''), // remove extension
      url: URL.createObjectURL(file)
    }));

    fileCount.textContent = `${playlist.length} música(s) carregada(s)`;
    renderPlaylist();

    // Auto load first song if not currently playing
    if (playlist.length > 0) {
      loadTrack(0, false);
    }
  });

  // Render Playlist UI
  function renderPlaylist() {
    playlistEl.innerHTML = '';

    if (playlist.length === 0) {
      playlistEl.innerHTML = '<li class="empty-playlist-msg">Selecione arquivos MP3 acima para criar sua playlist.</li>';
      return;
    }

    playlist.forEach((track, index) => {
      const li = document.createElement('li');
      li.className = `playlist-item ${index === currentIndex ? 'active' : ''}`;
      li.innerHTML = `<span>${index === currentIndex ? '▶ ' : ''}${index + 1}. ${track.name}</span>`;
      li.addEventListener('click', () => {
        play8BitBeep(659, 'square');
        loadTrack(index, true);
      });
      playlistEl.appendChild(li);
    });
  }

  // Load Track by index
  function loadTrack(index, autoPlay = true) {
    if (index < 0 || index >= playlist.length) return;

    currentIndex = index;
    const track = playlist[currentIndex];
    audioPlayer.src = track.url;
    currentTrackTitle.textContent = track.name.toUpperCase();
    renderPlaylist();

    if (autoPlay) {
      playAudio();
    } else {
      pauseAudio();
    }
  }

  // Play / Pause Logic
  function playAudio() {
    if (playlist.length === 0) return;
    initAudioContext();
    audioPlayer.play().then(() => {
      isPlaying = true;
      btnPlayPause.textContent = 'PAUSE';
      btnPlayPause.classList.remove('is-primary');
      btnPlayPause.classList.add('is-error');
      soundBars.classList.add('playing');
    }).catch(err => {
      console.error('Error playing audio:', err);
    });
  }

  function pauseAudio() {
    audioPlayer.pause();
    isPlaying = false;
    btnPlayPause.textContent = 'PLAY';
    btnPlayPause.classList.remove('is-error');
    btnPlayPause.classList.add('is-primary');
    soundBars.classList.remove('playing');
  }

  function togglePlayPause() {
    play8BitBeep(440, 'square');
    if (playlist.length === 0) return;
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  }

  // Navigation: Next / Prev
  function nextTrack() {
    play8BitBeep(587, 'square');
    if (playlist.length === 0) return;
    const nextIdx = (currentIndex + 1) % playlist.length;
    loadTrack(nextIdx, true);
  }

  function prevTrack() {
    play8BitBeep(349, 'square');
    if (playlist.length === 0) return;
    const prevIdx = (currentIndex - 1 + playlist.length) % playlist.length;
    loadTrack(prevIdx, true);
  }

  // Event Listeners for Controls
  btnPlayPause.addEventListener('click', togglePlayPause);
  btnNext.addEventListener('click', nextTrack);
  btnPrev.addEventListener('click', prevTrack);

  // Update Audio Progress & Time Remaining
  audioPlayer.addEventListener('timeupdate', () => {
    const curTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration;

    currentTimeEl.textContent = formatTime(curTime);

    if (!isNaN(duration) && duration > 0) {
      totalTimeEl.textContent = formatTime(duration);
      const remaining = duration - curTime;
      remainingTimeEl.textContent = `-${formatTime(remaining)}`;
      const progressPercent = (curTime / duration) * 100;
      progressBar.value = progressPercent;
    } else {
      totalTimeEl.textContent = '00:00';
      remainingTimeEl.textContent = '-00:00';
      progressBar.value = 0;
    }
  });

  // Track Ended -> Auto Play Next
  audioPlayer.addEventListener('ended', () => {
    nextTrack();
  });

  // Seek functionality on progress bar click
  progressBar.addEventListener('click', (e) => {
    if (!audioPlayer.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const seekTime = (clickX / width) * audioPlayer.duration;
    audioPlayer.currentTime = seekTime;
  });
});
