// たぬきのOKことば工房
// 文字をクリックして、正しいことばを完成させるミニゲームです。

const categories = [
  {
    id: "all",
    label: "ぜんぶ",
    words: []
  },
  {
    id: "greeting",
    label: "あいさつ",
    words: ["OK", "おはよう", "こんにちは", "ありがとう", "よろしく", "おつかれ", "またね", "ごめんね", "どうぞ", "いいね"]
  },
  {
    id: "work",
    label: "しごと",
    words: ["そうじ", "せいり", "しわけ", "ていねい", "かくにん", "つくる", "じゅんび", "れんらく", "きろく", "しゅうちゅう"]
  },
  {
    id: "life",
    label: "くらし",
    words: ["じぶんらしさ", "あんしん", "えがお", "やすむ", "ごはん", "さんぽ", "からだ", "きもち", "なかま", "まいにち"]
  }
];

categories[0].words = categories.slice(1).flatMap((category) => category.words);

const difficulties = [
  {
    id: "easy",
    label: "かんたん",
    minLength: 1,
    maxLength: 4
  },
  {
    id: "normal",
    label: "ふつう",
    minLength: 3,
    maxLength: 6
  },
  {
    id: "hard",
    label: "むずかしい",
    minLength: 5,
    maxLength: Infinity
  }
];

// 対応ブラウザでは、ホーム画面追加後も読み込みやすいようにします。
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // ローカル確認中に登録できない環境でも、ゲーム本体はそのまま動きます。
    });
  });
}

const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const resultScreen = document.getElementById("result-screen");

const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");
const checkButton = document.getElementById("check-button");
const clearButton = document.getElementById("clear-button");
const homeButton = document.getElementById("home-button");
const bgmButton = document.getElementById("bgm-button");

const categoryButtons = document.getElementById("category-buttons");
const difficultyButtons = document.getElementById("difficulty-buttons");
const questionNumber = document.getElementById("question-number");
const questionTotal = document.getElementById("question-total");
const currentCategory = document.getElementById("current-category");
const scoreElement = document.getElementById("score");
const answerSlots = document.getElementById("answer-slots");
const letterBank = document.getElementById("letter-bank");
const message = document.getElementById("message");
const workArea = document.querySelector(".work-area");
const resultScore = document.getElementById("result-score");
const resultMessage = document.getElementById("result-message");
const tanukiImage = document.getElementById("tanuki-image");
const tanukiFallback = document.getElementById("tanuki-fallback");

let currentQuestionIndex = 0;
let score = 0;
let selectedLetters = [];
let currentLetters = [];
let answered = false;
let selectedCategoryId = "all";
let selectedDifficultyId = "normal";
let currentQuestions = [];
let audioContext = null;
let bgmMasterGain = null;
let bgmTimer = null;
let bgmStep = 0;
let bgmEnabled = false;

const bgmNotes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];

// 画像がまだ無い場合でも、画面が崩れないように代替表示へ切り替えます。
tanukiImage.addEventListener("error", () => {
  tanukiImage.style.display = "none";
  tanukiFallback.style.display = "grid";
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
checkButton.addEventListener("click", checkAnswer);
clearButton.addEventListener("click", clearAnswer);
homeButton.addEventListener("click", goHome);
bgmButton.addEventListener("click", toggleBgm);
renderCategoryButtons();
renderDifficultyButtons();

function startGame() {
  startBgm();
  currentQuestionIndex = 0;
  score = 0;
  selectedLetters = [];
  answered = false;
  currentQuestions = buildQuestionSet();
  questionTotal.textContent = currentQuestions.length;
  currentCategory.textContent = `${getSelectedCategory().label} / ${getSelectedDifficulty().label}`;
  scoreElement.textContent = score;
  showScreen(gameScreen);
  renderQuestion();
}

function showScreen(activeScreen) {
  [startScreen, gameScreen, resultScreen].forEach((screen) => {
    screen.classList.toggle("screen-active", screen === activeScreen);
  });
}

function goHome() {
  currentQuestionIndex = 0;
  score = 0;
  selectedLetters = [];
  answered = false;
  scoreElement.textContent = score;
  message.textContent = "";
  message.className = "message";
  showScreen(startScreen);
}

function renderQuestion() {
  const answer = currentQuestions[currentQuestionIndex];

  selectedLetters = [];
  answered = false;
  currentLetters = shuffleLetters([...answer]);

  questionNumber.textContent = currentQuestionIndex + 1;
  message.textContent = "";
  message.className = "message";
  resetFeedbackEffect();
  checkButton.disabled = false;
  clearButton.disabled = false;

  renderAnswerSlots(answer.length);
  renderLetterButtons();
}

function renderAnswerSlots(length) {
  answerSlots.innerHTML = "";

  for (let index = 0; index < length; index += 1) {
    const slot = document.createElement("div");
    slot.className = "answer-slot empty";
    slot.textContent = selectedLetters[index] || "";

    if (selectedLetters[index]) {
      slot.classList.remove("empty");
    }

    answerSlots.appendChild(slot);
  }
}

function renderLetterButtons() {
  letterBank.innerHTML = "";

  currentLetters.forEach((letter, index) => {
    const button = document.createElement("button");
    button.className = "letter-button";
    button.type = "button";
    button.textContent = letter;
    button.setAttribute("aria-label", `${letter} をえらぶ`);
    button.addEventListener("click", () => selectLetter(letter, index, button));
    letterBank.appendChild(button);
  });
}

function selectLetter(letter, index, button) {
  if (answered || selectedLetters.length >= currentQuestions[currentQuestionIndex].length) {
    return;
  }

  selectedLetters.push(letter);
  button.disabled = true;
  button.dataset.used = String(index);
  renderAnswerSlots(currentQuestions[currentQuestionIndex].length);
}

function clearAnswer() {
  if (answered) {
    return;
  }

  selectedLetters = [];
  message.textContent = "";
  message.className = "message";
  renderAnswerSlots(currentQuestions[currentQuestionIndex].length);

  document.querySelectorAll(".letter-button").forEach((button) => {
    button.disabled = false;
  });
}

function checkAnswer() {
  if (answered) {
    return;
  }

  const answer = currentQuestions[currentQuestionIndex];

  if (selectedLetters.length < answer.length) {
    message.textContent = "あと少し、文字をぜんぶえらんでみよう！";
    message.className = "message wrong";
    return;
  }

  answered = true;
  checkButton.disabled = true;
  clearButton.disabled = true;

  if (selectedLetters.join("") === answer) {
    score += 1;
    scoreElement.textContent = score;
    message.textContent = "OK！よくできました！";
    message.className = "message correct";
    playFeedbackEffect("correct");
  } else {
    message.textContent = "だいじょうぶ、もう一回やってみよう！";
    message.className = "message wrong";
    playFeedbackEffect("wrong");
  }

  window.setTimeout(goToNextQuestion, 1200);
}

function goToNextQuestion() {
  currentQuestionIndex += 1;

  if (currentQuestionIndex >= currentQuestions.length) {
    showResult();
    return;
  }

  renderQuestion();
}

function showResult() {
  resultScore.textContent = `${score} / ${currentQuestions.length}`;

  if (score === currentQuestions.length) {
    resultMessage.textContent = "ぜんぶ正解です。すてきな集中力でした。";
  } else if (score >= 7) {
    resultMessage.textContent = "たくさんできました。もう一回でさらに上手になります。";
  } else {
    resultMessage.textContent = "チャレンジできたことがOKです。ゆっくりまた遊びましょう。";
  }

  showScreen(resultScreen);
}

function renderCategoryButtons() {
  categoryButtons.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = "category-button";
    button.type = "button";
    button.textContent = category.label;
    button.setAttribute("aria-pressed", String(category.id === selectedCategoryId));
    button.addEventListener("click", () => selectCategory(category.id));
    categoryButtons.appendChild(button);
  });
}

function selectCategory(categoryId) {
  selectedCategoryId = categoryId;
  renderCategoryButtons();
}

function renderDifficultyButtons() {
  difficultyButtons.innerHTML = "";

  difficulties.forEach((difficulty) => {
    const button = document.createElement("button");
    button.className = "difficulty-button";
    button.type = "button";
    button.textContent = difficulty.label;
    button.setAttribute("aria-pressed", String(difficulty.id === selectedDifficultyId));
    button.addEventListener("click", () => selectDifficulty(difficulty.id));
    difficultyButtons.appendChild(button);
  });
}

function selectDifficulty(difficultyId) {
  selectedDifficultyId = difficultyId;
  renderDifficultyButtons();
}

function getSelectedCategory() {
  return categories.find((category) => category.id === selectedCategoryId) || categories[0];
}

function getSelectedDifficulty() {
  return difficulties.find((difficulty) => difficulty.id === selectedDifficultyId) || difficulties[1];
}

function buildQuestionSet() {
  const difficulty = getSelectedDifficulty();
  const words = getSelectedCategory().words;
  const matchedWords = words.filter((word) => {
    return word.length >= difficulty.minLength && word.length <= difficulty.maxLength;
  });
  const fallbackWords = words.filter((word) => !matchedWords.includes(word));
  const prioritizedWords = [...shuffleLetters(matchedWords), ...shuffleLetters(fallbackWords)];

  return prioritizedWords.slice(0, 10);
}

function playFeedbackEffect(result) {
  resetFeedbackEffect();
  workArea.classList.add(`feedback-${result}`);

  if (result === "correct") {
    createCelebrationPieces();
  }
}

function resetFeedbackEffect() {
  workArea.classList.remove("feedback-correct", "feedback-wrong");
  workArea.querySelectorAll(".celebration-piece").forEach((piece) => piece.remove());
}

function createCelebrationPieces() {
  const colors = ["#47b881", "#ffd966", "#8ed9f6", "#f28c8c"];

  for (let index = 0; index < 14; index += 1) {
    const piece = document.createElement("span");
    piece.className = "celebration-piece";
    piece.style.setProperty("--piece-left", `${12 + Math.random() * 76}%`);
    piece.style.setProperty("--piece-delay", `${Math.random() * 0.14}s`);
    piece.style.setProperty("--piece-color", colors[index % colors.length]);
    workArea.appendChild(piece);
  }
}

function toggleBgm() {
  if (bgmEnabled) {
    stopBgm();
    return;
  }

  startBgm();
}

function startBgm() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    bgmButton.textContent = "BGM 不可";
    bgmButton.disabled = true;
    return;
  }

  if (!audioContext) {
    audioContext = new AudioContext();
    bgmMasterGain = audioContext.createGain();
    bgmMasterGain.gain.value = 0.045;
    bgmMasterGain.connect(audioContext.destination);
  }

  audioContext.resume();
  bgmEnabled = true;
  updateBgmButton();

  if (!bgmTimer) {
    playBgmNote();
    bgmTimer = window.setInterval(playBgmNote, 520);
  }
}

function stopBgm() {
  bgmEnabled = false;
  window.clearInterval(bgmTimer);
  bgmTimer = null;
  updateBgmButton();
}

function updateBgmButton() {
  bgmButton.textContent = bgmEnabled ? "BGM オン" : "BGM オフ";
  bgmButton.setAttribute("aria-pressed", String(bgmEnabled));
}

function playBgmNote() {
  if (!audioContext || !bgmMasterGain || !bgmEnabled) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const noteGain = audioContext.createGain();
  const now = audioContext.currentTime;

  oscillator.type = bgmStep % 2 === 0 ? "sine" : "triangle";
  oscillator.frequency.value = bgmNotes[bgmStep % bgmNotes.length];
  noteGain.gain.setValueAtTime(0, now);
  noteGain.gain.linearRampToValueAtTime(0.55, now + 0.03);
  noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  oscillator.connect(noteGain);
  noteGain.connect(bgmMasterGain);
  oscillator.start(now);
  oscillator.stop(now + 0.48);

  bgmStep += 1;
}

function shuffleLetters(letters) {
  const shuffled = [...letters];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  // 偶然そのままの順番になった場合は少し入れ替えて、問題らしくします。
  if (shuffled.join("") === letters.join("") && shuffled.length > 1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled;
}
