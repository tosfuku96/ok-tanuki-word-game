// たぬきのOKことば工房
// 文字をクリックして、正しいことばを完成させるミニゲームです。

const questions = [
  "OK",
  "おはよう",
  "ありがとう",
  "そうじ",
  "せいり",
  "しわけ",
  "ていねい",
  "かくにん",
  "つくる",
  "じぶんらしさ"
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

const questionNumber = document.getElementById("question-number");
const scoreElement = document.getElementById("score");
const answerSlots = document.getElementById("answer-slots");
const letterBank = document.getElementById("letter-bank");
const message = document.getElementById("message");
const resultScore = document.getElementById("result-score");
const resultMessage = document.getElementById("result-message");
const tanukiImage = document.getElementById("tanuki-image");
const tanukiFallback = document.getElementById("tanuki-fallback");

let currentQuestionIndex = 0;
let score = 0;
let selectedLetters = [];
let currentLetters = [];
let answered = false;

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

function startGame() {
  currentQuestionIndex = 0;
  score = 0;
  selectedLetters = [];
  answered = false;
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
  const answer = questions[currentQuestionIndex];

  selectedLetters = [];
  answered = false;
  currentLetters = shuffleLetters([...answer]);

  questionNumber.textContent = currentQuestionIndex + 1;
  message.textContent = "";
  message.className = "message";
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
  if (answered || selectedLetters.length >= questions[currentQuestionIndex].length) {
    return;
  }

  selectedLetters.push(letter);
  button.disabled = true;
  button.dataset.used = String(index);
  renderAnswerSlots(questions[currentQuestionIndex].length);
}

function clearAnswer() {
  if (answered) {
    return;
  }

  selectedLetters = [];
  message.textContent = "";
  message.className = "message";
  renderAnswerSlots(questions[currentQuestionIndex].length);

  document.querySelectorAll(".letter-button").forEach((button) => {
    button.disabled = false;
  });
}

function checkAnswer() {
  if (answered) {
    return;
  }

  const answer = questions[currentQuestionIndex];

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
  } else {
    message.textContent = "だいじょうぶ、もう一回やってみよう！";
    message.className = "message wrong";
  }

  window.setTimeout(goToNextQuestion, 1200);
}

function goToNextQuestion() {
  currentQuestionIndex += 1;

  if (currentQuestionIndex >= questions.length) {
    showResult();
    return;
  }

  renderQuestion();
}

function showResult() {
  resultScore.textContent = `${score} / ${questions.length}`;

  if (score === questions.length) {
    resultMessage.textContent = "ぜんぶ正解です。すてきな集中力でした。";
  } else if (score >= 7) {
    resultMessage.textContent = "たくさんできました。もう一回でさらに上手になります。";
  } else {
    resultMessage.textContent = "チャレンジできたことがOKです。ゆっくりまた遊びましょう。";
  }

  showScreen(resultScreen);
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
