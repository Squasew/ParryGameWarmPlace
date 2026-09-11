var DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1547345479132782725/evTPsL1Ywcq2ECpeRk9eb9OzJ51A-xYoZ8HyUk8jg_ZsGc21829T0clg0nPSJevEn8h5';

const params = new URLSearchParams(window.location.search);
const songId = params.get('song');

var loadSong = function (callback) {
  if (!songId) {
    console.error('No se ha especificado ninguna canción.');
    return;
  }

  var script = document.createElement('script');

  script.src = 'songs/' + songId + '.js';

  script.onload = function () {

    console.log('Canción cargada:', song);

    var songAudio = document.querySelector('.song');

    songAudio.src = song.audio;

    document.querySelector('.game-title').textContent = 'Strixhaven';
    document.querySelector('.game-subtitle').textContent = song.subtitle;
    document.querySelector('.song-title').textContent = song.title;

    document.title = song.id + ' >> ' + song.title;

    callback();
  };

  script.onerror = function () {
    console.error('No se pudo cargar la canción:', songId);
  };

  document.body.appendChild(script);
};


var isHolding = {
  q: false,
  w: false,
  e: false
};

var hits = {
  perfect: 0,
  good: 0,
  bad: 0,
  miss: 0
};

var multiplier = {
  perfect: 1,
  good: 0.8,
  bad: 0.5,
  miss: 0,
  combo40: 1.05,
  combo80: 1.10
};

var isPlaying = false;
var combo = 0;
var maxCombo = 0;
var score = 0;
var startTime;
var trackContainer;
var tracks;
var keypress;
var comboText;
var missSound;
var hitSound;
var hitNoPerfectSound;
var playerName = '';

var initializeNotes = function () {
  var noteElement;
  var trackElement;

  while (trackContainer.hasChildNodes()) {
    trackContainer.removeChild(trackContainer.lastChild);
  }

  song.sheet.forEach(function (key, index) {
    trackElement = document.createElement('div');
    trackElement.classList.add('track');

    key.notes.forEach(function (note) {
      noteElement = document.createElement('div');
      noteElement.classList.add('note');
      noteElement.classList.add('note--' + index);
      noteElement.style.backgroundColor = key.color;
      noteElement.style.animationName = 'moveDown';
      noteElement.style.animationTimingFunction = 'linear';
      noteElement.style.animationDuration = note.duration + 's';
      noteElement.style.animationDelay = note.delay + 's';
      noteElement.style.animationPlayState = 'paused';

      trackElement.appendChild(noteElement);
    });

    trackContainer.appendChild(trackElement);
  });

  tracks = document.querySelectorAll('.track');
};

var setupStartButton = function () {
  var startButton = document.querySelector('.btn--start');
  var nameInput = document.querySelector('.start__name');
  var status = document.querySelector('.start__status');

  startButton.addEventListener('click', function (event) {
    event.preventDefault();

    if (isPlaying) {
      return;
    }

    var name = nameInput.value.trim();
    if (!name) {
      status.innerHTML = 'Escribe un nombre para comenzar.';
      nameInput.focus();
      return;
    }

    playerName = name;
    status.innerHTML = '';

    isPlaying = true;
    startTime = performance.now();

    document.querySelector('.menu').style.opacity = 0;

    var songAudio = document.querySelector('.song');
    songAudio.currentTime = 0;

    var playPromise = songAudio.play();

    if (playPromise !== undefined) {
      playPromise.catch(function (error) {
        console.error(error);
        isPlaying = false;
      });
    }

    document.querySelectorAll('.note').forEach(function (note) {
      note.style.animationPlayState = 'running';
    });

    startTimer(song.duration);
  });
};

var startTimer = function (duration) {
  var display = document.querySelector('.summary__timer');
  var start = performance.now();
  var durationMs = duration * 1000;

  display.style.display = 'block';
  display.style.opacity = 1;

  var updateTimer = function () {
    if (!isPlaying) {
      return;
    }

    var elapsed = performance.now() - start;
    var remaining = Math.max(0, durationMs - elapsed);

    var totalSeconds = Math.ceil(remaining / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;

    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    display.innerHTML = minutes + ':' + seconds;

    if (remaining <= 0) {
      finishGame();
      return;
    }

    requestAnimationFrame(updateTimer);
  };

  requestAnimationFrame(updateTimer);
};

var finishGame = function () {
  if (!isPlaying) {
    return;
  }

  isPlaying = false;

  var songAudio = document.querySelector('.song');
  songAudio.pause();
  songAudio.currentTime = 0;

  document.querySelectorAll('.note').forEach(function (note) {
    note.style.animationPlayState = 'paused';
  });

  showResult();
  sendResultToDiscord();

  comboText.style.transition = 'all 1s';
  comboText.style.opacity = 0;
};

var showResult = function () {
  document.querySelector('.perfect__count').innerHTML = hits.perfect;
  document.querySelector('.good__count').innerHTML = hits.good;
  document.querySelector('.bad__count').innerHTML = hits.bad;
  document.querySelector('.miss__count').innerHTML = hits.miss;
  document.querySelector('.combo__count').innerHTML = maxCombo;
  document.querySelector('.score__count').innerHTML = Math.floor(score);

  document.querySelector('.summary__timer').style.opacity = 0;

  var result = document.querySelector('.summary__result');
  result.style.opacity = 1;
  result.style.pointerEvents = 'auto';
};

var sendResultToDiscord = function () {
  var message = {
    username: 'A warm place - Dnd + Parry',
    embeds: [{
      title: 'Resultado - ' + document.title,
      color: 0x5865F2,
      fields: [
        {
          name: 'Jugador',
          value: playerName,
          inline: false
        },
        {
          name: 'Perfecto',
          value: String(hits.perfect),
          inline: true
        },
        {
          name: 'Bien',
          value: String(hits.good),
          inline: true
        },
        {
          name: 'Mal',
          value: String(hits.bad),
          inline: true
        },
        {
          name: 'Fallo',
          value: String(hits.miss),
          inline: true
        },
        {
          name: '🔥 Max Combo',
          value: String(maxCombo),
          inline: true
        },
        {
          name: '⭐ Score',
          value: String(Math.floor(score)),
          inline: true
        }
      ]
    }]
  };

  fetch(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Error al enviar');
      }

      document.querySelector('.result__send').disabled = true;
    })
    .catch(function (error) {
      console.error(error);
    });
};

var setupNoteMiss = function () {
  trackContainer.addEventListener('animationend', function (event) {
    if (!event.target.classList.contains('note')) {
      return;
    }

    if (!isPlaying) {
      return;
    }

    var classes = event.target.classList;
    var noteClass = Array.from(classes).find(function (className) {
      return className.indexOf('note--') === 0;
    });

    if (!noteClass) {
      return;
    }

    var index = parseInt(noteClass.replace('note--', ''), 10);

    if (isNaN(index)) {
      return;
    }

    displayAccuracy('miss');
    playMissSound();
    updateHits('miss');
    updateCombo('miss');
    updateMaxCombo();

    removeNoteFromTrack(event.target.parentNode, event.target);
    updateNext(index);
  });
};

var setupKeys = function () {
  document.addEventListener('keydown', function (event) {
    var key = event.key.toLowerCase();

    if (!Object.prototype.hasOwnProperty.call(isHolding, key)) {
      return;
    }

    if (isHolding[key]) {
      return;
    }

    isHolding[key] = true;

    var keyIndex = getKeyIndex(key);

    if (keypress[keyIndex]) {
      keypress[keyIndex].style.display = 'block';
    }

    if (isPlaying && tracks[keyIndex] && tracks[keyIndex].firstChild) {
      judge(keyIndex);
    }
  });

  document.addEventListener('keyup', function (event) {
    var key = event.key.toLowerCase();

    if (!Object.prototype.hasOwnProperty.call(isHolding, key)) {
      return;
    }

    var keyIndex = getKeyIndex(key);

    isHolding[key] = false;

    if (keypress[keyIndex]) {
      keypress[keyIndex].style.display = 'none';
    }
  });
};

var getKeyIndex = function (key) {
  if (key === 'q') {
    return 0;
  }

  if (key === 'w') {
    return 1;
  }

  if (key === 'e') {
    return 2;
  }

  return -1;
};

var judge = function (index) {
  if (!isPlaying) {
    return;
  }

  var nextNoteIndex = song.sheet[index].next;
  var nextNote = song.sheet[index].notes[nextNoteIndex];

  if (!nextNote) {
    return;
  }

  var songAudio = document.querySelector('.song');
  var currentTime = songAudio.currentTime;

  var perfectTime = nextNote.delay + nextNote.duration;
  var accuracy = Math.abs(currentTime - perfectTime);

  if (accuracy > 0.3) {
    return;
  }

  var hitJudgement = getHitJudgement(accuracy);

  displayAccuracy(hitJudgement);
  playHitSound(hitJudgement);
  showHitEffect(index);
  updateHits(hitJudgement);
  updateCombo(hitJudgement);
  updateMaxCombo();
  calculateScore(hitJudgement);

  removeNoteFromTrack(tracks[index], tracks[index].firstChild);
  updateNext(index);
};

var getHitJudgement = function (accuracy) {
  if (accuracy < 0.15) {
    return 'perfect';
  }

  if (accuracy < 0.25) {
    return 'good';
  }

  if (accuracy < 0.35) {
    return 'bad';
  }

  return 'miss';
};

var displayAccuracy = function (accuracy) {
  var oldAccuracy = document.querySelector('.hit__accuracy');

  if (oldAccuracy) {
    oldAccuracy.remove();
  }

  var accuracyText = document.createElement('div');

  accuracyText.classList.add('hit__accuracy');
  accuracyText.classList.add('hit__accuracy--' + accuracy);
  accuracyText.innerHTML = accuracy;

  document.querySelector('.hit').appendChild(accuracyText);
};

var showHitEffect = function (index) {
  var keys = document.querySelectorAll('.key');
  var key = keys[index];

  if (!key) {
    return;
  }

  var hitEffect = document.createElement('div');

  hitEffect.classList.add('key__hit');

  key.appendChild(hitEffect);

  setTimeout(function () {
    if (hitEffect.parentNode) {
      hitEffect.remove();
    }
  }, 1000);
};

var updateHits = function (judgement) {
  if (hits[judgement] !== undefined) {
    hits[judgement]++;
  }
};

var updateCombo = function (judgement) {
  if (judgement === 'bad' || judgement === 'miss') {
    combo = 0;
    comboText.innerHTML = '';
    return;
  }

  combo++;
  comboText.innerHTML = combo;
};

var updateMaxCombo = function () {
  if (combo > maxCombo) {
    maxCombo = combo;
  }
};

var playHitSound = function (judgement) {
  if (!hitSound) {
    return;
  }
  if (!hitNoPerfectSound){
    return;
  }

  if (
    judgement !== 'perfect' &&
    judgement !== 'good' &&
    judgement !== 'bad'
  ) {
    return;
  }

  if (judgement == 'perfect')
  {
    hitSound.currentTime = 0;
    hitSound.play().catch(function (error) {
      console.error('No se pudo reproducir el sonido de acierto:', error);
    });
  } else
  {
    hitNoPerfectSound.currentTime = 0;
    hitNoPerfectSound.play().catch(function (error) {
      console.error('No se pudo reproducir el sonido de acierto:', error);
    });
  }

};

var playMissSound = function () {
  if (!missSound) {
    return;
  }

  missSound.currentTime = 0;
  missSound.play().catch(function (error) {
    console.error('No se pudo reproducir el sonido de fallo:', error);
  });
};

var calculateScore = function (judgement) {
  var points = 1000;

  if (judgement === 'perfect') {
    points *= multiplier.perfect;
  } else if (judgement === 'good') {
    points *= multiplier.good;
  } else if (judgement === 'bad') {
    points *= multiplier.bad;
  } else {
    points *= multiplier.miss;
  }

  if (combo >= 80) {
    points *= multiplier.combo80;
  } else if (combo >= 40) {
    points *= multiplier.combo40;
  }

  score += points;
};

var removeNoteFromTrack = function (parent, child) {
  if (parent && child && child.parentNode === parent) {
    parent.removeChild(child);
  }
};

var updateNext = function (index) {
  if (
    song.sheet[index] &&
    song.sheet[index].next < song.sheet[index].notes.length
  ) {
    song.sheet[index].next++;
  }
};

window.onload = function () {

  loadSong(function () {

    trackContainer = document.querySelector('.track-container');
    keypress = document.querySelectorAll('.keypress');
    comboText = document.querySelector('.hit__combo');

    missSound = new Audio('media/miss.mp3');
    hitSound = new Audio('media/hit.mp3');
    hitNoPerfectSound = new Audio('media/hitNoPerfect.mp3');

    missSound.preload = 'auto';
    hitSound.preload = 'auto';

    initializeNotes();
    setupStartButton();
    setupKeys();
    setupNoteMiss();

    var sendButton = document.querySelector('.result__send');

    if (sendButton) {
      sendButton.addEventListener('click', sendResultToDiscord);
    }

  });

};