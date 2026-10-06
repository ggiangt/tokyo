// Paper sound + falling sakura petals (moved unchanged from index.html).
(function () {
  var petalLayer = document.getElementById("petal-layer");
  var audioContext = null;

  function getAudioContext() {
    if (!audioContext) {
      var AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) {
        return null;
      }
      audioContext = new AudioContextCtor();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    return audioContext;
  }

  function playPaperSound() {
    var context = getAudioContext();
    if (!context) {
      return;
    }

    var now = context.currentTime;
    var bufferSize = context.sampleRate * 0.14;
    var noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    var source = context.createBufferSource();
    source.buffer = noiseBuffer;

    var filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(0.9, now);

    var gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);

    source.start(now);
    source.stop(now + 0.18);
  }

  function spawnPetal(seed) {
    var petal = document.createElement("div");
    var duration = 14 + Math.random() * 10;
    var delay = seed ? Math.random() * -duration : 0;
    petal.className = "petal";
    petal.style.left = Math.random() * 100 + "vw";
    petal.style.animationDuration = duration + "s";
    petal.style.animationDelay = delay + "s";
    petal.style.opacity = (0.28 + Math.random() * 0.2).toFixed(2);
    petal.style.width = 8 + Math.random() * 8 + "px";
    petal.style.height = 7 + Math.random() * 7 + "px";
    petal.style.filter = "blur(" + (Math.random() * 0.3).toFixed(2) + "px)";
    petalLayer.appendChild(petal);

    petal.addEventListener("animationiteration", function () {
      petal.style.left = Math.random() * 100 + "vw";
    });
  }

  for (var i = 0; i < 12; i += 1) {
    spawnPetal(true);
  }

  window.Effects = {
    playPaperSound: playPaperSound,
  };
})();
