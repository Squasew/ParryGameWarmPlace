var DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1547345479132782725/evTPsL1Ywcq2ECpeRk9eb9OzJ51A-xYoZ8HyUk8jg_ZsGc21829T0clg0nPSJevEn8h5';

var isHolding = {
  q: false,
  w: false,
  e: false
};

var hits = { perfect: 0, good: 0, bad: 0, miss: 0 };
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
    tracks = document.querySelectorAll('.track');
  });
};

var updateAnimation = function () {
  animation = 'moveDownFade';
  initializeNotes();
};

var setupStartButton = function () {
  var startButton = document.querySelector('.btn--start');
  startButton.addEventListener('click', function () {
    isPlaying = true;
    startTime = Date.now();

    startTimer(song.duration);
    document.querySelector('.menu').style.opacity = 0;
    document.querySelector('.song').play();
    document.querySelectorAll('.note').forEach(function (note) {
      note.style.animationPlayState = 'running';
    });
  });
};

var startTimer = function (duration) {
  var display = document.querySelector('.summary__timer');
  var timer = duration;
  var minutes;
  var seconds;

  display.style.display = 'block';
  display.style.opacity = 1;

  var songDurationInterval = setInterval(function () {
    minutes = Math.floor(timer / 60);
    seconds = timer % 60;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    display.innerHTML = minutes + ':' + seconds;

    if (--timer < 0) {
      clearInterval(songDurationInterval);
	  
	  isPlaying = false;
	  
	  var songAudio = document.querySelector('.song');
      songAudio.pause();
      songAudio.currentTime = 0;
	  
      showResult();
      comboText.style.transition = 'all 1s';
      comboText.style.opacity = 0;
    }
  }, 1000);
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
  var nameInput = document.querySelector('.result__name');
  var status = document.querySelector('.result__status');

  var name = nameInput.value.trim();

  if (!name) {
    status.innerHTML = 'Escribe un nombre.';
    return;
  }

  var message = {
    username: 'Rhythm',
    embeds: [{
      title: document.title,
      color: 0x5865F2,
      fields: [
        {
          name: 'Jugador',
          value: name,
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

  status.innerHTML = 'Enviando...';

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

      status.innerHTML = 'Enviado.';
      nameInput.disabled = true;
      document.querySelector('.result__send').disabled = true;
    })
    .catch(function (error) {
      console.error(error);
      status.innerHTML = 'No se pudo enviar el resultado.';
    });
};


var setupNoteMiss = function () {
  trackContainer.addEventListener('animationend', function (event) {
    var index = event.target.classList.item(1)[6];

    displayAccuracy('miss');
    updateHits('miss');
    updateCombo('miss');
    updateMaxCombo();
    removeNoteFromTrack(event.target.parentNode, event.target);
    updateNext(index);
  });
};

/**
 * Allows keys to be only pressed one time. Prevents keydown event
 * from being handled multiple times while held down.
 */
var setupKeys = function () {
  document.addEventListener('keydown', function (event) {
    var keyIndex = getKeyIndex(event.key);

    if (Object.keys(isHolding).indexOf(event.key) !== -1
      && !isHolding[event.key]) {
      isHolding[event.key] = true;
      keypress[keyIndex].style.display = 'block';

      if (isPlaying && tracks[keyIndex].firstChild) {
        judge(keyIndex);
      }
    }
  });

  document.addEventListener('keyup', function (event) {
    if (Object.keys(isHolding).indexOf(event.key) !== -1) {
      var keyIndex = getKeyIndex(event.key);
      isHolding[event.key] = false;
      keypress[keyIndex].style.display = 'none';
    }
  });
};

var getKeyIndex = function (key) {
  if (key === 'q') {
    return 0;
  } else if (key === 'w') {
    return 1;
  } else if (key === 'e') {
    return 2;
  }
};

var judge = function (index) {
  var timeInSecond = (Date.now() - startTime) / 1000;
  var nextNoteIndex = song.sheet[index].next;
  var nextNote = song.sheet[index].notes[nextNoteIndex];
  var perfectTime = nextNote.duration + nextNote.delay;
  var accuracy = Math.abs(timeInSecond - perfectTime);
  var hitJudgement;

  /**
   * As long as the note has travelled less than 3/4 of the height of
   * the track, any key press on this track will be ignored.
   */
  if (accuracy > (nextNote.duration - speed) / 4) {
    return;
  }

  hitJudgement = getHitJudgement(accuracy);
  displayAccuracy(hitJudgement);
  showHitEffect(index);
  updateHits(hitJudgement);
  updateCombo(hitJudgement);
  updateMaxCombo();
  calculateScore(hitJudgement);
  removeNoteFromTrack(tracks[index], tracks[index].firstChild);
  updateNext(index);
};

var getHitJudgement = function (accuracy) {
  if (accuracy < 0.1) {
    return 'perfect';
  } else if (accuracy < 0.2) {
    return 'good';
  } else if (accuracy < 0.3) {
    return 'bad';
  } else {
    return 'miss';
  }
};

var displayAccuracy = function (accuracy) {
  var accuracyText = document.createElement('div');
  document.querySelector('.hit__accuracy').remove();
  accuracyText.classList.add('hit__accuracy');
  accuracyText.classList.add('hit__accuracy--' + accuracy);
  accuracyText.innerHTML = accuracy;
  document.querySelector('.hit').appendChild(accuracyText);
};

var showHitEffect = function (index) {
  var key = document.querySelectorAll('.key')[index];
  var hitEffect = document.createElement('div');
  hitEffect.classList.add('key__hit');
  key.appendChild(hitEffect);
};

var updateHits = function (judgement) {
  hits[judgement]++;
};

var updateCombo = function (judgement) {
  if (judgement === 'bad' || judgement === 'miss') {
    combo = 0;
    comboText.innerHTML = '';
  } else {
    comboText.innerHTML = ++combo;
  }
};

var updateMaxCombo = function () {
  maxCombo = maxCombo > combo ? maxCombo : combo;
};

var calculateScore = function (judgement) {
  if (combo >= 80) {
    score += 1000 * multiplier[judgement] * multiplier.combo80;
  } else if (combo >= 40) {
    score += 1000 * multiplier[judgement] * multiplier.combo40;
  } else {
    score += 1000 * multiplier[judgement];
  }
};

var removeNoteFromTrack = function (parent, child) {
  parent.removeChild(child);
};

var updateNext = function (index) {
  song.sheet[index].next++;
};

window.onload = function () {
  trackContainer = document.querySelector('.track-container');
  keypress = document.querySelectorAll('.keypress');
  comboText = document.querySelector('.hit__combo');

  initializeNotes();
  setupStartButton();
  setupKeys();
  setupNoteMiss();

  var sendButton = document.querySelector('.result__send');

  if (sendButton) {
    sendButton.addEventListener('click', sendResultToDiscord);
  }
};

