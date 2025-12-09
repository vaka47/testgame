const boardElement = document.getElementById("board");
const statusText = document.getElementById("statusText");
const promoBlock = document.getElementById("promoBlock");
const promoCodeElement = document.getElementById("promoCode");
const promoHint = document.getElementById("promoHint");
const restartButton = document.getElementById("restartButton");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const modeTitle = document.getElementById("modeTitle");
const modeDescription = document.getElementById("modeDescription");
const gameToggle = document.getElementById("gameToggle");
const ruleModal = document.getElementById("ruleModal");
const ruleModalText = document.getElementById("ruleModalText");
const ruleModalButton = document.getElementById("ruleModalButton");
const resultModal = document.getElementById("resultModal");
const resultModalTitle = document.getElementById("resultModalTitle");
const resultModalText = document.getElementById("resultModalText");
const resultModalPromo = document.getElementById("resultModalPromo");
const resultModalPromoCode = document.getElementById("resultModalPromoCode");
const resultModalPlay = document.getElementById("resultModalPlay");

let gameMode = "tic-tac-toe";
let isPlayerTurn = true;
let isFinished = false;

// --- Конфигурация режимов игры ---

const GAME_CONFIGS = {
  "tic-tac-toe": {
    boardCells: 9,
    columns: 3,
    title: "Крестики‑нолики",
    subtitle:
      "Небольшая игра‑пауза: победите компьютер и получите промокод на скидку.",
    panelTitle: "Ваш ход — «X»",
    panelDescription: "Компьютер играет «O». Победа даёт 5‑значный промокод."
  },
  battleship: {
    boardCells: 25,
    columns: 5,
    title: "Морской бой",
    subtitle:
      "Попробуйте найти корабль компьютера раньше, чем он найдёт ваш.",
    panelTitle: "Выстрелы по кораблю",
    panelDescription:
      "Компьютер спрятал корабль. Найдите все его части, пока он ищет ваш."
  },
  checkers: {
    boardCells: 64,
    columns: 8,
    title: "Шашки",
    subtitle:
      "Классические шашки в укороченной версии: выиграйте у компьютера.",
    panelTitle: "Ваш ход в шашках",
    panelDescription:
      "Ходите по диагонали; бить можно вперёд и назад. Победа — когда у компьютера не останется ходов или шашек."
  }
};

// --- Состояние для крестиков-ноликов ---

let tttBoard = Array(9).fill(null); // null | "X" | "O"

const TTT_WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

// --- Состояние для морского боя ---

let battleshipState = {
  cells: Array(25).fill(null), // "hit" | "miss" | null
  shipCells: [],
  hits: 0,
  phase: "placement",
  playerShip: [],
  enemyShots: Array(25).fill(null), // "hit" | "miss" | null
  enemyHits: 0,
  enemyTargetQueue: [],
  enemyHitCells: []
};

// --- Состояние для шашек ---

let checkersState = {
  board: Array(64).fill(null), // "P" | "PK" | "C" | "CK" | null
  selectedIndex: null,
  mustContinueFrom: null
};

function showRuleModal(message) {
  ruleModalText.textContent = message;
  ruleModal.hidden = false;
}

function hideRuleModal() {
  ruleModal.hidden = true;
}

function isMobile() {
  return window.matchMedia("(max-width: 800px)").matches;
}

function setPromoHintDefaultDesktop() {
  if (isMobile()) return;
  promoHint.textContent = "Промокод в случае вашей победы появится здесь.";
  promoHint.hidden = false;
}

function setPromoHintCheerDesktop() {
  if (isMobile()) return;
  promoHint.textContent = "Болею за вас. 🙂";
  promoHint.hidden = false;
}

function showResultModal(variant, promoCode) {
  if (!isMobile()) return;

  let title = "Результат игры";
  let message = "";

  if (variant === "win") {
    title = "Победа";
    message = "Вы победили! 🎉";
  } else if (variant === "lose") {
    title = "Компьютер победил";
    message = "В этот раз победил компьютер.";
  } else if (variant === "draw") {
    title = "Ничья";
    message = "Ничья. Можно попробовать ещё раз.";
  }

  resultModalTitle.textContent = title;
  resultModalText.textContent = message;

  if (promoCode) {
    resultModalPromoCode.textContent = promoCode;
    resultModalPromo.hidden = false;
  } else {
    resultModalPromo.hidden = true;
    resultModalPromoCode.textContent = "";
  }

  resultModal.hidden = false;
}

function hideResultModal() {
  resultModal.hidden = true;
}

// --- Общие функции интерфейса ---

function applyGameConfig() {
  const config = GAME_CONFIGS[gameMode];
  if (!config) return;

  pageTitle.textContent = config.title;
  pageSubtitle.textContent = config.subtitle;
  modeTitle.textContent = config.panelTitle;
  modeDescription.textContent = config.panelDescription;

  const rows = Math.ceil(config.boardCells / config.columns);
  boardElement.style.setProperty("--board-columns", String(config.columns));
  boardElement.style.setProperty("--board-rows", String(rows));

  boardElement.classList.toggle("board--checkers", gameMode === "checkers");
  boardElement.classList.toggle(
    "board--battleship",
    gameMode === "battleship"
  );
}

function createBoard() {
  const config = GAME_CONFIGS[gameMode];
  boardElement.innerHTML = "";
  const total = config.boardCells;

  for (let i = 0; i < total; i++) {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.dataset.index = i;
    if (gameMode === "checkers") {
      const size = GAME_CONFIGS.checkers.columns;
      const row = Math.floor(i / size);
      const col = i % size;
      if ((row + col) % 2 === 1) {
        cell.classList.add("cell--dark");
      } else {
        cell.classList.add("cell--light");
      }
    }
    cell.addEventListener("click", onCellClick);
    boardElement.appendChild(cell);
  }
}

function onCellClick(event) {
  if (isFinished) return;

  const index = Number(event.currentTarget.dataset.index);

  if (gameMode === "tic-tac-toe") {
    handleTicTacToeClick(index);
  } else if (gameMode === "battleship") {
    handleBattleshipClick(index);
  } else if (gameMode === "checkers") {
    handleCheckersClick(index);
  }
}

function generatePromoCode() {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

async function sendTelegramEvent(type, promoCode) {
  try {
    await fetch("/api/telegram/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, promoCode })
    });
  } catch (e) {
    console.error("Ошибка отправки в Telegram:", e);
  }
}
// --- Общие финальные состояния ---

function finishWin(statusMessage) {
  isFinished = true;
  disableBoard();
  const finalStatus = statusMessage || "Вы победили! 🎉";
  statusText.textContent = finalStatus;

  const code = generatePromoCode();

  if (isMobile()) {
    showResultModal("win", code);
  } else {
    promoCodeElement.textContent = code;
    // После победы на десктопе показываем только заголовок и код,
    // без дополнительного текста под ним.
    promoHint.textContent = "";
    promoHint.hidden = true;
    promoCodeElement.hidden = false;
    restartButton.style.display = "inline-flex";
    restartButton.textContent = "Сыграть ещё раз";
  }

  sendTelegramEvent("win", code);
}

function finishLose(statusMessage) {
  isFinished = true;
  disableBoard();
  const finalStatus = statusMessage || "В этот раз победил компьютер.";
  statusText.textContent = finalStatus;

  if (isMobile()) {
    showResultModal("lose");
  } else {
    setPromoHintDefaultDesktop();
    restartButton.style.display = "inline-flex";
    restartButton.textContent = "Сыграть ещё раз";
  }

  sendTelegramEvent("lose");
}

function finishDraw() {
  isFinished = true;
  disableBoard();
  const finalStatus = "Ничья. Можно попробовать ещё раз.";
  statusText.textContent = finalStatus;

  if (isMobile()) {
    showResultModal("draw");
  } else {
    setPromoHintDefaultDesktop();
    restartButton.style.display = "inline-flex";
    restartButton.textContent = "Сыграть ещё раз";
  }
}

// --- Крестики-нолики ---

function handleTicTacToeClick(index) {
  if (!isPlayerTurn || tttBoard[index]) return;

  setPromoHintCheerDesktop();
  makeTttMove(index, "X");
  isPlayerTurn = false;

  const result = checkTttResult();
  if (result) {
    applyTttResult(result);
    return;
  }

  statusText.textContent = "Ход компьютера…";

  setTimeout(() => {
    const aiIndex = chooseTttAiMove();
    if (aiIndex != null) {
      makeTttMove(aiIndex, "O");
    }

    const afterAiResult = checkTttResult();
    if (afterAiResult) {
      applyTttResult(afterAiResult);
      return;
    }

    isPlayerTurn = true;
    statusText.textContent = "Ваш ход";
  }, 500);
}

function makeTttMove(index, symbol) {
  tttBoard[index] = symbol;
  const cell = boardElement.querySelector(`[data-index="${index}"]`);
  cell.textContent = symbol;
  if (symbol === "O") {
    cell.classList.add("cell--o");
  }
}

function checkTttResult() {
  for (const [a, b, c] of TTT_WIN_LINES) {
    if (tttBoard[a] && tttBoard[a] === tttBoard[b] && tttBoard[a] === tttBoard[c]) {
      return { type: "win", winner: tttBoard[a], line: [a, b, c] };
    }
  }

  if (tttBoard.every((cell) => cell)) {
    return { type: "draw" };
  }

  return null;
}

function chooseTttAiMove() {
  const empties = tttBoard
    .map((value, index) => (value ? null : index))
    .filter((v) => v !== null);

  if (empties.length === 0) return null;

  return empties[Math.floor(Math.random() * empties.length)];
}

function applyTttResult(result) {
  disableBoard();

  if (result.type === "win" && result.winner === "X") {
    if (result.line) {
      highlightLine(result.line);
    }
    finishWin("Вы победили! 🎉");
  } else if (result.type === "win" && result.winner === "O") {
    if (result.line) {
      highlightLine(result.line);
    }
    finishLose("Компьютер победил в этот раз.");
  } else if (result.type === "draw") {
    finishDraw();
  }
}

// --- Морской бой ---

function initBattleshipState() {
  battleshipState = {
    cells: Array(25).fill(null),
    shipCells: [],
    hits: 0,
    phase: "placement",
    playerShip: [],
    enemyShots: Array(25).fill(null),
    enemyHits: 0,
    enemyTargetQueue: [],
    enemyHitCells: []
  };

  // корабль длиной 3 клетки по горизонтали в квадратной сетке 5x5
  const size = 5;
  const possibleLines = [];
  for (let row = 0; row < size; row++) {
    const base = row * size;
    possibleLines.push([base, base + 1, base + 2]);
    possibleLines.push([base + 1, base + 2, base + 3]);
    possibleLines.push([base + 2, base + 3, base + 4]);
  }
  const line =
    possibleLines[Math.floor(Math.random() * possibleLines.length)];
  battleshipState.shipCells = line;
}

function handleBattleshipClick(index) {
  if (isFinished) return;
  const state = battleshipState;

  if (state.phase === "placement") {
    handleBattleshipPlacementClick(index);
    return;
  }

  if (!isPlayerTurn) return;

  if (state.cells[index]) return;

  const cell = boardElement.querySelector(`[data-index="${index}"]`);
  const isHit = state.shipCells.includes(index);

  if (isHit) {
    state.cells[index] = "hit";
    state.hits += 1;
    // если корабль компьютера пересекается с нашим — перекрашиваем клетку в цвет попадания по компьютеру
    if (state.playerShip.includes(index)) {
      cell.classList.remove(
        "cell--battleship-player",
        "cell--battleship-player-hit",
        "cell--battleship-enemy-shot"
      );
    }
    cell.textContent = "";
    cell.classList.add("cell--battleship-hit");
  } else {
    state.cells[index] = "miss";
    cell.textContent = "×";
    cell.classList.add("cell--battleship-miss");
  }
  if (state.hits === state.shipCells.length) {
    finishWin("Корабль найден! Вы победили. 🎉");
    return;
  }

  if (isHit) {
    statusText.textContent = "Попадание! Можно стрелять ещё раз.";
    return;
  }

  // ход компьютера после промаха
  isPlayerTurn = false;
  statusText.textContent = "Ход компьютера…";
  setTimeout(() => {
    computerBattleshipShot();
    if (!isFinished) {
      isPlayerTurn = true;
      statusText.textContent = "Ваш ход. Ищите корабль компьютера.";
    }
  }, 700);
}

function handleBattleshipPlacementClick(index) {
  const state = battleshipState;
  const size = 5;
  const cell = boardElement.querySelector(`[data-index="${index}"]`);
  if (!cell) return;

  // переключаем выделение клетки корабля
  if (state.playerShip.includes(index)) {
    state.playerShip = state.playerShip.filter((i) => i !== index);
    cell.classList.remove("cell--battleship-player");
  } else {
    if (state.playerShip.length >= 3) {
      showRuleModal(
        "Корабль должен состоять из трёх клеток. Снимите выделение с лишней клетки, чтобы изменить форму."
      );
      return;
    }

    // новая клетка должна быть соседней по стороне хотя бы к одной уже выбранной
    if (state.playerShip.length > 0) {
      const isNeighbour = state.playerShip.some((i) => {
        const rowA = Math.floor(i / size);
        const colA = i % size;
        const rowB = Math.floor(index / size);
        const colB = index % size;
        const dist =
          Math.abs(rowA - rowB) + Math.abs(colA - colB);
        return dist === 1;
      });

      if (!isNeighbour) {
        showRuleModal(
          "Каждая следующая клетка корабля должна быть рядом с предыдущими по стороне."
        );
        return;
      }
    }

    state.playerShip.push(index);
    cell.classList.add("cell--battleship-player");
  }

  if (state.playerShip.length < 3) {
    statusText.textContent =
      "Отметьте три соседние клетки — ваш корабль.";
    return;
  }

  // проверяем форму корабля
  const isValid = isValidThreeCellShip(state.playerShip, size);
  if (!isValid) {
    // отменяем последнюю клетку, чтобы не получился угловой корабль
    state.playerShip = state.playerShip.filter((i) => i !== index);
    cell.classList.remove("cell--battleship-player");
    showRuleModal(
      "Корабль не может быть «углом». Он должен занимать три соседние клетки по прямой."
    );
    statusText.textContent =
      "Отметьте три соседние клетки — ваш корабль.";
    return;
  }

  state.phase = "shooting";
  statusText.textContent =
    "Корабль отмечен. Ваш ход — ищите корабль компьютера.";
  showRuleModal(
    "Корабль отмечен. Теперь стреляйте по полю, чтобы найти корабль компьютера."
  );
  setPromoHintCheerDesktop();
}

// --- Шашки ---

function initCheckersState() {
  const size = 8;
  const board = Array(64).fill(null);

  // две верхние строки — компьютер
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < size; col++) {
      if ((row + col) % 2 === 1) {
        board[row * size + col] = "C";
      }
    }
  }

  // две нижние строки — игрок
  for (let row = size - 2; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if ((row + col) % 2 === 1) {
        board[row * size + col] = "P";
      }
    }
  }

  checkersState = {
    board,
    selectedIndex: null,
    mustContinueFrom: null
  };
}

function handleCheckersClick(index) {
  if (!isPlayerTurn) return;

  const state = checkersState;
  const cellValue = state.board[index];

  // выбор своей шашки
  if (isPlayerPiece(cellValue)) {
    if (
      state.mustContinueFrom != null &&
      index !== state.mustContinueFrom
    ) {
      showRuleModal("Нужно продолжить взятия этой шашкой.");
      return;
    }
    setPromoHintCheerDesktop();
    state.selectedIndex = index;
    highlightSelected(index);
    return;
  }

  if (state.selectedIndex === null) return;

  // попытка хода
  const from = state.selectedIndex;
  const to = index;
  if (tryMakePlayerCheckersMove(from, to)) {
    clearSelected();

    if (checkersState.mustContinueFrom != null && !isFinished) {
      // продолжаем серию взятий этой же шашкой — не требуем повторного клика
      state.selectedIndex = checkersState.mustContinueFrom;
      highlightSelected(checkersState.mustContinueFrom);
      statusText.textContent = "Можно продолжить взятие этой шашкой.";
      return;
    }

    state.selectedIndex = null;

    if (isCheckersSideDefeated("C")) {
      finishWin("Вы выиграли партию в шашки! 🎉");
      return;
    }

    isPlayerTurn = false;
    statusText.textContent = "Ход компьютера…";

    setTimeout(() => {
      makeComputerCheckersMove();
      if (isCheckersSideDefeated("P")) {
        finishLose("В шашках победил компьютер.");
        return;
      }
      if (!isFinished) {
        isPlayerTurn = true;
        statusText.textContent = "Ваш ход";
      }
    }, 600);
  }
}

function indexToRowCol(index, size) {
  return { row: Math.floor(index / size), col: index % size };
}

function tryMakePlayerCheckersMove(from, to) {
  const size = 8;
  const board = checkersState.board;
  const piece = board[from];
  if (!isPlayerPiece(piece) || board[to] !== null) return false;

  // если есть обязательные взятия — простой ход делать нельзя
  const allCaptures = getAllCaptureMovesForSide("P", board);
  const mustCapture = allCaptures.length > 0;

  // проверим, является ли ход взятием
  const captureMove = allCaptures.find(
    (m) => m.from === from && m.to === to
  );

  if (mustCapture && !captureMove) {
    showRuleModal(
      "По правилам сначала нужно побить шашку соперника."
    );
    return false;
  }

  if (captureMove) {
    // выполняем взятие
    performCheckersCapture(board, captureMove);
    maybePromotePiece(to, "P");
    renderCheckersBoard();

    // проверяем, можно ли продолжить серию взятий этой же шашкой
    const furtherCaptures = getCaptureMovesForPiece(to, "P", board);
    if (furtherCaptures.length > 0) {
      checkersState.mustContinueFrom = to;
    } else {
      checkersState.mustContinueFrom = null;
    }
    return true;
  }

  // если взятий нет — разрешаем обычный ход
  const fromPos = indexToRowCol(from, size);
  const toPos = indexToRowCol(to, size);
  const dRow = toPos.row - fromPos.row;
  const dCol = toPos.col - fromPos.col;
  const king = isKing(piece);

  if (king) {
    // дамка ходит на любое расстояние по диагонали
    if (Math.abs(dRow) !== Math.abs(dCol)) return false;
    const stepRow = dRow > 0 ? 1 : -1;
    const stepCol = dCol > 0 ? 1 : -1;
    let r = fromPos.row + stepRow;
    let c = fromPos.col + stepCol;
    while (r !== toPos.row && c !== toPos.col) {
      if (board[r * size + c] !== null) return false;
      r += stepRow;
      c += stepCol;
    }
  } else {
    const directions = getSimpleMoveDirectionsForPiece("P", piece);
    const isAllowed = directions.some(
      (dir) => dir.dRow === dRow && dir.dCol === dCol
    );

    if (!isAllowed) return false;
  }

  board[to] = piece;
  board[from] = null;
  maybePromotePiece(to, "P");
  renderCheckersBoard();
  checkersState.mustContinueFrom = null;
  return true;
}

function makeComputerCheckersMove() {
  const size = 8;
  const board = checkersState.board;
  checkersState.mustContinueFrom = null;

  const captureMoves = getAllCaptureMovesForSide("C", board);

  if (captureMoves.length === 0) {
    // простые ходы
    const simpleMoves = [];
    for (let i = 0; i < board.length; i++) {
      const piece = board[i];
      if (!isComputerPiece(piece)) continue;
      const { row, col } = indexToRowCol(i, size);
      const king = isKing(piece);
      if (king) {
        const kingDirs = [
          { dRow: -1, dCol: -1 },
          { dRow: -1, dCol: 1 },
          { dRow: 1, dCol: -1 },
          { dRow: 1, dCol: 1 }
        ];
        for (const dir of kingDirs) {
          let r = row + dir.dRow;
          let c = col + dir.dCol;
          while (r >= 0 && r < size && c >= 0 && c < size) {
            const idx = r * size + c;
            if (board[idx] !== null) break;
            simpleMoves.push({ from: i, to: idx });
            r += dir.dRow;
            c += dir.dCol;
          }
        }
      } else {
        const directions = getSimpleMoveDirectionsForPiece("C", piece);
        for (const dir of directions) {
          const r = row + dir.dRow;
          const c = col + dir.dCol;
          if (r < 0 || r >= size || c < 0 || c >= size) continue;
          const idx = r * size + c;
          if (board[idx] === null) {
            simpleMoves.push({ from: i, to: idx });
          }
        }
      }
    }

    if (simpleMoves.length === 0) {
      // нет ходов — вы победили
      finishWin("Вы выиграли партию в шашки! 🎉");
      return;
    }

    // пытаемся избегать ходов "под бой" соперника
    const safeMoves = simpleMoves.filter(
      (m) => !isMoveImmediatelyLosingForComputer(m, board)
    );
    const pool = safeMoves.length > 0 ? safeMoves : simpleMoves;

    const move = pool[Math.floor(Math.random() * pool.length)];
    board[move.to] = board[move.from];
    board[move.from] = null;
    maybePromotePiece(move.to, "C");
    renderCheckersBoard();
    return;
  }

  // есть обязательные взятия — выбираем одно и выполняем серию
  let move =
    captureMoves[Math.floor(Math.random() * captureMoves.length)];
  performCheckersCapture(board, move);
  maybePromotePiece(move.to, "C");

  while (true) {
    const further = getCaptureMovesForPiece(move.to, "C", board);
    if (further.length === 0) break;
    move = further[Math.floor(Math.random() * further.length)];
    performCheckersCapture(board, move);
    maybePromotePiece(move.to, "C");
  }

  renderCheckersBoard();

  if (isCheckersSideDefeated("P")) {
    finishLose("В шашках победил компьютер.");
  }

  if (isCheckersSideDefeated("C")) {
    // нет ходов — вы победили
    finishWin("Вы выиграли партию в шашки! 🎉");
  }
}

function isCheckersSideDefeated(side) {
  const board = checkersState.board;
  if (side === "P") {
    return !board.some((cell) => isPlayerPiece(cell));
  }
  return !board.some((cell) => isComputerPiece(cell));
}

function isPlayerPiece(value) {
  return value === "P" || value === "PK";
}

function isComputerPiece(value) {
  return value === "C" || value === "CK";
}

function isKing(value) {
  return value === "PK" || value === "CK";
}

function getSimpleMoveDirectionsForPiece(side, piece) {
  const king = isKing(piece);
  if (king) {
    return [
      { dRow: -1, dCol: -1 },
      { dRow: -1, dCol: 1 },
      { dRow: 1, dCol: -1 },
      { dRow: 1, dCol: 1 }
    ];
  }

  if (side === "P") {
    return [
      { dRow: -1, dCol: -1 },
      { dRow: -1, dCol: 1 }
    ];
  }

  return [
    { dRow: 1, dCol: -1 },
    { dRow: 1, dCol: 1 }
  ];
}

function getCaptureMovesForPiece(index, side, board) {
  const size = 8;
  const piece = board[index];
  if (!piece) return [];

  const { row, col } = indexToRowCol(index, size);
  const moves = [];
  const king = isKing(piece);

  if (!king) {
    const directions = [
      { dRow: -2, dCol: -2 },
      { dRow: -2, dCol: 2 },
      { dRow: 2, dCol: -2 },
      { dRow: 2, dCol: 2 }
    ];

    for (const dir of directions) {
      const r = row + dir.dRow;
      const c = col + dir.dCol;
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      const toIndex = r * size + c;
      if (board[toIndex] !== null) continue;

      const midRow = row + dir.dRow / 2;
      const midCol = col + dir.dCol / 2;
      const midIndex = midRow * size + midCol;
      const midValue = board[midIndex];

      if (
        side === "P" ? isComputerPiece(midValue) : isPlayerPiece(midValue)
      ) {
        moves.push({ from: index, to: toIndex, capture: midIndex });
      }
    }

    return moves;
  }

  const kingDirs = [
    { dRow: -1, dCol: -1 },
    { dRow: -1, dCol: 1 },
    { dRow: 1, dCol: -1 },
    { dRow: 1, dCol: 1 }
  ];

  for (const dir of kingDirs) {
    let r = row + dir.dRow;
    let c = col + dir.dCol;
    let captureIndex = null;

    while (r >= 0 && r < size && c >= 0 && c < size) {
      const idx = r * size + c;
      const value = board[idx];

      if (value === null) {
        if (captureIndex != null) {
          moves.push({ from: index, to: idx, capture: captureIndex });
        }
        r += dir.dRow;
        c += dir.dCol;
        continue;
      }

      if (captureIndex == null) {
        if (
          side === "P"
            ? isComputerPiece(value)
            : isPlayerPiece(value)
        ) {
          captureIndex = idx;
          r += dir.dRow;
          c += dir.dCol;
          continue;
        }
        // своя шашка блокирует
        break;
      } else {
        // после побитой шашки встретили ещё одну — дальше уже нельзя
        break;
      }
    }
  }

  return moves;
}

function getAllCaptureMovesForSide(side, board) {
  const moves = [];
  for (let i = 0; i < board.length; i++) {
    const cell = board[i];
    if (side === "P" ? !isPlayerPiece(cell) : !isComputerPiece(cell)) continue;
    moves.push(...getCaptureMovesForPiece(i, side, board));
  }
  return moves;
}

function isMoveImmediatelyLosingForComputer(move, board) {
  const size = 8;
  const copy = board.slice();
  const piece = copy[move.from];
  copy[move.from] = null;
  copy[move.to] = piece;

  // простое локальное промо для оценки
  const { row } = indexToRowCol(move.to, size);
  if (piece === "C" && row === size - 1) {
    copy[move.to] = "CK";
  }

  const playerCaptures = getAllCaptureMovesForSide("P", copy);
  return playerCaptures.some((m) => m.capture === move.to);
}

function isValidThreeCellShip(indices, size) {
  if (indices.length !== 3) return false;
  const coords = indices
    .map((i) => ({
      row: Math.floor(i / size),
      col: i % size
    }))
    .sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row));

  const [a, b, c] = coords;

  // горизонтальный 3-клеточный корабль
  if (a.row === b.row && b.row === c.row) {
    return b.col === a.col + 1 && c.col === b.col + 1;
  }

  // вертикальный 3-клеточный корабль
  if (a.col === b.col && b.col === c.col) {
    return b.row === a.row + 1 && c.row === b.row + 1;
  }

  return false;
}

function getBattleshipNeighbours(index, size) {
  const row = Math.floor(index / size);
  const col = index % size;
  const result = [];

  const positions = [
    { r: row - 1, c: col },
    { r: row + 1, c: col },
    { r: row, c: col - 1 },
    { r: row, c: col + 1 }
  ];

  for (const p of positions) {
    if (p.r < 0 || p.r >= size || p.c < 0 || p.c >= size) continue;
    result.push(p.r * size + p.c);
  }

  return result;
}

function getBattleshipOrientation(hitCells, size) {
  if (!hitCells || hitCells.length < 2) return null;
  const first = hitCells[0];
  const row1 = Math.floor(first / size);
  const col1 = first % size;

  let hasSameRow = false;
  let hasSameCol = false;

  for (let i = 1; i < hitCells.length; i++) {
    const idx = hitCells[i];
    const r = Math.floor(idx / size);
    const c = idx % size;
    if (r === row1) hasSameRow = true;
    if (c === col1) hasSameCol = true;
  }

  if (hasSameRow) {
    return { type: "row", row: row1 };
  }
  if (hasSameCol) {
    return { type: "col", col: col1 };
  }
  return null;
}

function isIndexCompatibleWithOrientation(index, orientation, size) {
  const row = Math.floor(index / size);
  const col = index % size;
  if (orientation.type === "row") {
    return row === orientation.row;
  }
  if (orientation.type === "col") {
    return col === orientation.col;
  }
  return true;
}

function getBattleshipNeighboursForHit(index, size, hitCells) {
  const baseNeighbours = getBattleshipNeighbours(index, size);
  const orientation = getBattleshipOrientation(hitCells, size);
  if (!orientation) return baseNeighbours;
  return baseNeighbours.filter((i) =>
    isIndexCompatibleWithOrientation(i, orientation, size)
  );
}

function computerBattleshipShot() {
  if (isFinished) return;
  const state = battleshipState;
  const size = 5;

  // вычисляем ориентацию уже найденного корабля (если есть 2+ попадания)
  const orientation = getBattleshipOrientation(state.enemyHitCells, size);

  // убираем из очереди уже прострелянные клетки
  state.enemyTargetQueue = state.enemyTargetQueue.filter(
    (i) =>
      !state.enemyShots[i] &&
      (orientation ? isIndexCompatibleWithOrientation(i, orientation, size) : true)
  );

  let index = null;

  if (state.enemyTargetQueue.length > 0) {
    index = state.enemyTargetQueue.shift();
  } else {
    const available = [];
    for (let i = 0; i < state.enemyShots.length; i++) {
      if (!state.enemyShots[i]) {
        available.push(i);
      }
    }
    if (available.length === 0) return;
    index = available[Math.floor(Math.random() * available.length)];
  }

  const cell = boardElement.querySelector(`[data-index="${index}"]`);

  const isHit = state.playerShip.includes(index);
  state.enemyShots[index] = isHit ? "hit" : "miss";

  if (cell) {
    if (isHit) {
      cell.classList.add("cell--battleship-player-hit");
    } else {
      if (!cell.textContent) {
        cell.textContent = "•";
      }
      cell.classList.add("cell--battleship-enemy-shot");
    }
  }

  if (isHit) {
    state.enemyHits += 1;
    if (!state.enemyHitCells.includes(index)) {
      state.enemyHitCells.push(index);
    }
    // добавляем соседние клетки в очередь для следующих выстрелов
    const neighbours = getBattleshipNeighboursForHit(
      index,
      size,
      state.enemyHitCells
    );
    neighbours.forEach((n) => {
      if (!state.enemyShots[n] && !state.enemyTargetQueue.includes(n)) {
        state.enemyTargetQueue.push(n);
      }
    });

    if (state.enemyHits >= state.playerShip.length) {
      finishLose("Компьютер нашёл и потопил ваш корабль.");
    }
  }
}

function performCheckersCapture(board, move) {
  board[move.to] = board[move.from];
  board[move.from] = null;
  board[move.capture] = null;
}

function maybePromotePiece(index, side) {
  const size = 8;
  const board = checkersState.board;
  const { row } = indexToRowCol(index, size);
  if (side === "P" && row === 0 && board[index] === "P") {
    board[index] = "PK";
  } else if (side === "C" && row === size - 1 && board[index] === "C") {
    board[index] = "CK";
  }
}

function renderCheckersBoard() {
  const board = checkersState.board;
  for (let i = 0; i < board.length; i++) {
    const cell = boardElement.querySelector(`[data-index="${i}"]`);
    if (!cell) continue;
    cell.textContent = "";
    cell.classList.remove(
      "cell--o",
      "cell--win",
      "cell--disabled",
      "cell--selected",
      "cell--checker-piece",
      "cell--checker-piece-player",
      "cell--checker-piece-computer",
      "cell--checker-king"
    );

    if (isPlayerPiece(board[i])) {
      cell.classList.add(
        "cell--checker-piece",
        "cell--checker-piece-player"
      );
    } else if (isComputerPiece(board[i])) {
      cell.classList.add(
        "cell--checker-piece",
        "cell--checker-piece-computer"
      );
    }

    if (isKing(board[i])) {
      cell.classList.add("cell--checker-king");
    }
  }
}

function highlightSelected(index) {
  clearSelected();
  const cell = boardElement.querySelector(`[data-index="${index}"]`);
  if (cell) {
    cell.classList.add("cell--selected");
  }
}

function clearSelected() {
  boardElement
    .querySelectorAll(".cell--selected")
    .forEach((c) => c.classList.remove("cell--selected"));
}

function highlightLine(line) {
  line.forEach((index) => {
    const cell = boardElement.querySelector(`[data-index="${index}"]`);
    if (cell) {
      cell.classList.add("cell--win");
    }
  });
}

function disableBoard() {
  boardElement.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.add("cell--disabled");
  });
}

function resetBoard() {
  isPlayerTurn = true;
  isFinished = false;
  statusText.textContent = "Ваш ход";
  setPromoHintDefaultDesktop();
  promoCodeElement.textContent = "";
  promoCodeElement.hidden = true;
  restartButton.style.display = "none";

  applyGameConfig();
  createBoard();

  if (gameMode === "tic-tac-toe") {
    tttBoard = Array(9).fill(null);
  } else if (gameMode === "battleship") {
    initBattleshipState();
    statusText.textContent =
      "Сначала отметьте корабль: три соседние клетки.";
  } else if (gameMode === "checkers") {
    initCheckersState();
    renderCheckersBoard();
  }

  hideResultModal();
}

function handleGameToggleClick(event) {
  const button = event.target.closest("[data-game]");
  if (!button) return;

  const mode = button.dataset.game;
  if (!GAME_CONFIGS[mode] || mode === gameMode) return;

  gameMode = mode;

  gameToggle
    .querySelectorAll(".game-toggle__btn")
    .forEach((btn) => btn.classList.remove("game-toggle__btn--active"));
  button.classList.add("game-toggle__btn--active");

  clearSelected();
  resetBoard();
}

restartButton.addEventListener("click", resetBoard);
gameToggle.addEventListener("click", handleGameToggleClick);
ruleModalButton.addEventListener("click", hideRuleModal);
ruleModal.addEventListener("click", (event) => {
  if (event.target === ruleModal) {
    hideRuleModal();
  }
});
resultModalPlay.addEventListener("click", () => {
  hideResultModal();
  resetBoard();
});
resultModal.addEventListener("click", (event) => {
  if (event.target === resultModal) {
    hideResultModal();
  }
});

resetBoard();
