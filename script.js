// ================================================================================= //
// 定数定義
// ================================================================================= //
const ROW_COUNT = 20; // ゲーム盤の行数
const COLUMN_COUNT = 10; // ゲーム盤の列数
const BLOCK_SIZE = 30; // 1ブロックのピクセルサイズ
const EMPTY_COLOR = "black"; // 空マスの色
const GAME_SPEED = 1000; // テトリミノの自動落下速度 (ミリ秒)

// テトリミノの形状と色、IDを定義
const TETROMINOES = {
    'I': { id: "I", shape: [[1, 1, 1, 1]], color: "cyan" },
    'L': { id: "L", shape: [[1, 0, 0], [1, 1, 1]], color: "orange" },
    'J': { id: "J", shape: [[0, 0, 1], [1, 1, 1]], color: "blue" },
    'T': { id: "T", shape: [[0, 1, 0], [1, 1, 1]], color: "purple" },
    'O': { id: "O", shape: [[1, 1], [1, 1]], color: "yellow" },
    'S': { id: "S", shape: [[0, 1, 1], [1, 1, 0]], color: "green" },
    'Z': { id: "Z", shape: [[1, 1, 0], [0, 1, 1]], color: "red" }
};

// ================================================================================= //
// グローバル変数定義
// ================================================================================= //
let gameCanvas;             // ゲーム用キャンバス要素
let gameContext;            // ゲーム用キャンバスの2Dコンテキスト
let nextTetrominoCanvas;    // 次のテトリミノ表示用キャンバス要素
let nextTetrominoContext;   // 次のテトリミノ表示用キャンバスの2Dコンテキスト
let scoreElement;           // スコア表示用DOM要素
let timeElement;            // 時間表示用DOM要素

let gameBoard;              // ゲーム盤の状態を保持する2次元配列
let currentTetromino;       // 現在操作中のテトリミノオブジェクト
let currentX;               // 現在のテトリミノのX座標 (列番号)
let currentY;               // 現在のテトリミノのY座標 (行番号)
let nextTetromino;          // 次に出現するテトリミノオブジェクト
let score;                  // 現在のスコア
let isGameOver;             // ゲームオーバー状態フラグ (true: ゲームオーバー)
let gameIntervalId;         // setIntervalのID (自動落下処理用)
let elapsedTime;            // 経過時間 (秒)
let timerIntervalId;        // setIntervalのID (時間計測用)

// ================================================================================= //
// 初期化処理
// ================================================================================= //

/**
 * ゲーム盤を初期化する関数。
 * ROW_COUNT x COLUMN_COUNT の2次元配列を作成し、全て EMPTY_COLOR で初期化する。
 * @returns {string[][]} 初期化されたゲーム盤
 */
function initializeBoard() {
    const board = [];
    for (let row = 0; row < ROW_COUNT; row++) {
        board[row] = [];
        for (let col = 0; col < COLUMN_COUNT; col++) {
            board[row][col] = EMPTY_COLOR;
        }
    }
    return board;
}

// ================================================================================= //
// 描画関連関数
// ================================================================================= //

/**
 * ゲーム盤を描画する関数。
 * @param {string[][]} board - 描画する盤面の状態
 * @param {CanvasRenderingContext2D} context - 描画に使用するキャンバスのコンテキスト
 */
function drawBoard(board, context) {
    for (let row = 0; row < ROW_COUNT; row++) {
        for (let col = 0; col < COLUMN_COUNT; col++) {
            const color = board[row][col];
            context.fillStyle = color;
            context.fillRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            // 空でないブロックには枠線を描画
            if (color !== EMPTY_COLOR) {
                context.strokeStyle = "black";
                context.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }
}

/**
 * 指定されたテトリミノを描画する関数。
 * @param {number[][]} tetrominoShape - テトリミノの形状を表す2次元配列
 * @param {number} x - 描画開始位置のX座標 (列番号)
 * @param {number} y - 描画開始位置のY座標 (行番号)
 * @param {CanvasRenderingContext2D} context - 描画に使用するキャンバスのコンテキスト
 * @param {string} color - テトリミノの色
 */
function drawTetromino(tetrominoShape, x, y, context, color) {
    context.fillStyle = color;
    tetrominoShape.forEach((row, rIndex) => {
        row.forEach((cell, cIndex) => {
            if (cell === 1) { // セルの値が1の場合にブロックを描画
                const actualX = (x + cIndex) * BLOCK_SIZE;
                const actualY = (y + rIndex) * BLOCK_SIZE;
                context.fillRect(actualX, actualY, BLOCK_SIZE, BLOCK_SIZE);
                context.strokeStyle = "black";
                context.strokeRect(actualX, actualY, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });
}

/**
 * 次のテトリミノ表示エリアにテトリミノを描画する関数。
 */
function drawNextTetromino() {
    // 表示エリアをクリア (背景色で塗りつぶし)
    nextTetrominoContext.fillStyle = EMPTY_COLOR;
    nextTetrominoContext.fillRect(0, 0, nextTetrominoCanvas.width, nextTetrominoCanvas.height);

    const shape = nextTetromino.shape;
    const color = nextTetromino.color;

    // テトリミノを中央に描画するためのオフセット計算
    const offsetX = (nextTetrominoCanvas.width / BLOCK_SIZE - shape[0].length) / 2;
    const offsetY = (nextTetrominoCanvas.height / BLOCK_SIZE - shape.length) / 2;

    drawTetromino(shape, offsetX, offsetY, nextTetrominoContext, color);
}

// ================================================================================= //
// テトリミノ操作・ロジック関数
// ================================================================================= //

/**
 * 定義されたテトリミノの中からランダムに1つを返す関数。
 * @returns {object} ランダムに選択されたテトリミノオブジェクト (id, shape, color を含む)
 */
function getRandomTetromino() {
    const keys = Object.keys(TETROMINOES);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return TETROMINOES[randomKey];
}

/**
 * 衝突判定関数。指定された位置にテトリミノを配置できるか判定する。
 * @param {number[][]} tetrominoShape - テトリミノの形状
 * @param {number} x - 配置予定のX座標 (列番号)
 * @param {number} y - 配置予定のY座標 (行番号)
 * @param {string[][]} board - 現在のゲーム盤の状態
 * @returns {boolean} true の場合衝突、false の場合配置可能
 */
function checkCollision(tetrominoShape, x, y, board) {
    for (let r = 0; r < tetrominoShape.length; r++) {
        for (let c = 0; c < tetrominoShape[r].length; c++) {
            if (tetrominoShape[r][c] === 1) { // テトリミノのブロック部分のみ判定
                const boardX = x + c; // 盤面上のX座標
                const boardY = y + r; // 盤面上のY座標

                // 盤面の境界チェック
                if (boardX < 0 || boardX >= COLUMN_COUNT || boardY >= ROW_COUNT) {
                    return true; // 盤外には配置不可
                }
                // 盤面上の既存ブロックとの衝突チェック (Y座標が0未満の場合は盤面上部なので無視)
                if (boardY >= 0 && board[boardY][boardX] !== EMPTY_COLOR) {
                    return true; // 他のブロックと衝突
                }
            }
        }
    }
    return false; // 衝突なし
}

/**
 * テトリミノの形状配列を時計回りに90度回転させる関数。
 * @param {number[][]} tetrominoShape - 回転前のテトリミノ形状
 * @returns {number[][]} 回転後のテトリミノ形状
 */
function rotateTetromino(tetrominoShape) {
    const rows = tetrominoShape.length;
    const cols = tetrominoShape[0].length;
    const newShape = [];
    // 新しい形状の行と列を入れ替える
    for (let c = 0; c < cols; c++) {
        newShape[c] = [];
        for (let r = 0; r < rows; r++) {
            newShape[c][r] = tetrominoShape[rows - 1 - r][c];
        }
    }
    return newShape;
}

/**
 * テトリミノを盤面に固定（配置）する関数。
 * @param {number[][]} tetrominoShape - 固定するテトリミノの形状
 * @param {number} x - 固定する位置のX座標 (列番号)
 * @param {number} y - 固定する位置のY座標 (行番号)
 * @param {string[][]} board - ゲーム盤の状態配列
 * @param {string} color - 固定するテトリミノの色
 * @param {string} tetrominoId - 固定するテトリミノのID (ログ出力用)
 */
function placeTetromino(tetrominoShape, x, y, board, color, tetrominoId) {
    tetrominoShape.forEach((row, rIndex) => {
        row.forEach((cell, cIndex) => {
            if (cell === 1) {
                const boardX = x + cIndex;
                const boardY = y + rIndex;
                // 盤面内にのみブロックを配置
                if (boardY >= 0 && boardY < ROW_COUNT && boardX >= 0 && boardX < COLUMN_COUNT) {
                    board[boardY][boardX] = color;
                }
            }
        });
    });
    console.log(`ミノ固定完了: ${tetrominoId} at X: ${x}, Y: ${y}`);
    checkLineClear(); // ライン消去のチェックと処理を実行
}

/**
 * 新しいテトリミノを生成し、初期位置に配置する関数。
 * 配置時にゲームオーバーかどうかも判定する。
 */
function spawnNewTetromino() {
    currentTetromino = nextTetromino; // 次のテトリミノを現在のテトリミノに設定
    nextTetromino = getRandomTetromino(); // 新しい次のテトリミノを生成
    // 現在のテトリミノの初期位置を盤面中央上部に設定
    currentX = Math.floor(COLUMN_COUNT / 2) - Math.floor(currentTetromino.shape[0].length / 2);
    currentY = 0;
    console.log(`新しいテミノ生成: ${currentTetromino.id}, 初期位置 X: ${currentX}, Y: ${currentY}`);

    // 新しいテトリミノが初期位置で既に衝突している場合、ゲームオーバー
    if (checkCollision(currentTetromino.shape, currentX, currentY, gameBoard)) {
        isGameOver = true;
        console.log("ゲームオーバー！");
        clearInterval(gameIntervalId); // 自動落下処理を停止
        clearInterval(timerIntervalId); // 時間計測処理を停止
        // ゲームオーバーメッセージをキャンバスに表示
        gameContext.fillStyle = 'rgba(0, 0, 0, 0.75)';
        gameContext.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
        gameContext.font = 'bold 30px Arial';
        gameContext.fillStyle = 'red';
        gameContext.textAlign = 'center';
        gameContext.fillText('ゲームオーバー', gameCanvas.width / 2, gameCanvas.height / 2 - 20);
        gameContext.font = 'bold 20px Arial';
        gameContext.fillText('Enterでリスタート', gameCanvas.width / 2, gameCanvas.height / 2 + 20);
    }
    drawNextTetromino(); // 次のテトリミノ表示エリアを更新
}

// ================================================================================= //
// ゲーム進行・状態管理関数
// ================================================================================= //

/**
 * 揃ったラインを検出し、消去およびスコア加算を行う関数。
 */
function checkLineClear() {
    let linesCleared = 0;
    // 盤面の下の行から上の行に向かってチェック
    for (let r = ROW_COUNT - 1; r >= 0; r--) {
        // 行内の全てのセルがEMPTY_COLORでない場合、その行は揃っている
        if (gameBoard[r].every(cell => cell !== EMPTY_COLOR)) {
            linesCleared++;
            gameBoard.splice(r, 1); // 揃った行を削除
            gameBoard.unshift(Array(COLUMN_COUNT).fill(EMPTY_COLOR)); // 新しい空の行を盤面の一番上に追加
            r++; // 行を削除したため、同じインデックスを再度チェック
        }
    }

    if (linesCleared > 0) {
        let points = 0;
        // 消去したライン数に応じてスコアを設定
        if (linesCleared === 1) points = 100;
        else if (linesCleared === 2) points = 300;
        else if (linesCleared === 3) points = 500;
        else if (linesCleared === 4) points = 800; // テトリスの場合
        score += points;
        scoreElement.textContent = `スコア: ${score}`;
        console.log(`ライン消去: ${linesCleared}ライン、獲得スコア: ${points}点、合計スコア: ${score}点`);
    }
    // else {
    //    console.log("ラインチェック完了、消去なし"); // 消去なしの場合のログ（必要に応じて有効化）
    // }
}

/**
 * ゲームのメインループ関数。ゲーム画面の再描画を行う。
 */
function gameLoop() {
    if (isGameOver) return; // ゲームオーバー時は処理中断

    // 1. ゲームキャンバスをクリア (背景色で塗りつぶし)
    gameContext.fillStyle = EMPTY_COLOR;
    gameContext.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

    // 2. ゲーム盤を描画
    drawBoard(gameBoard, gameContext);

    // 3. 現在操作中のテトリミノを描画
    drawTetromino(currentTetromino.shape, currentX, currentY, gameContext, currentTetromino.color);

    // 4. 次のテトリミノ表示は spawnNewTetromino と startGame で更新
    // 5. スコア表示は checkLineClear と startGame で更新
}

/**
 * テトリミノを自動で1段落下させる関数。
 * GAME_SPEEDの間隔で繰り返し呼び出される。
 */
function autoDrop() {
    if (isGameOver) return; // ゲームオーバー時は処理中断

    // 1段下に移動可能かチェック
    if (!checkCollision(currentTetromino.shape, currentX, currentY + 1, gameBoard)) {
        currentY++; // 移動可能ならY座標をインクリメント
        // console.log(`自動落下: ${currentTetromino.id} to Y: ${currentY}`); // 毎秒ログが出るので、必要に応じてコメントアウト
    } else {
        // 移動できない場合（地面に着地、または他のブロックに衝突）
        placeTetromino(currentTetromino.shape, currentX, currentY, gameBoard, currentTetromino.color, currentTetromino.id);
        spawnNewTetromino(); // 新しいテトリミノを生成（ゲームオーバー判定もここに含まれる）
    }
    gameLoop(); // 盤面状態が変わったので再描画
}

/**
 * ゲームを開始（またはリスタート）する関数。
 * 各種変数を初期化し、ゲームループを開始する。
 */
function startGame() {
    console.log("ゲーム開始");
    if (gameIntervalId) clearInterval(gameIntervalId); // 既存のゲームループがあれば停止
    if (timerIntervalId) clearInterval(timerIntervalId); // 既存の時間計測があれば停止

    isGameOver = false;
    score = 0;
    elapsedTime = 0; // 経過時間をリセット
    scoreElement.textContent = `スコア: ${score}`; // スコア表示を初期化
    timeElement.textContent = `時間: ${elapsedTime}秒`; // 時間表示を初期化

    gameBoard = initializeBoard(); // ゲーム盤を初期化
    currentTetromino = getRandomTetromino(); // 最初のテトリミノを生成
    currentX = Math.floor(COLUMN_COUNT / 2) - Math.floor(currentTetromino.shape[0].length / 2);
    currentY = 0;
    nextTetromino = getRandomTetromino(); // 次のテトリミノを生成

    drawBoard(gameBoard, gameContext); // 初期盤面を描画
    drawNextTetromino(); // 次のテトリミノ表示エリアを更新
    gameLoop(); // ゲームの初回描画（現在のテトリミノなど）

    // 自動落下処理を開始
    gameIntervalId = setInterval(autoDrop, GAME_SPEED);
    // 時間計測処理を開始
    timerIntervalId = setInterval(() => {
        elapsedTime++;
        timeElement.textContent = `時間: ${elapsedTime}秒`;
    }, 1000);
}

// ================================================================================= //
// イベントリスナー
// ================================================================================= //

/**
 * キーボードのキー押下イベントを処理する関数。
 * @param {KeyboardEvent} event - キーボードイベントオブジェクト
 */
function handleKeyPress(event) {
    console.log(`キー入力: ${event.key}`);
    if (isGameOver) {
        // ゲームオーバー時にEnterキーが押されたらゲームをリスタート
        if (event.key === 'Enter') {
            console.log("ゲームリスタート");
            startGame();
        }
        return;
    }

    // ゲームプレイ中のキー操作
    switch (event.key) {
        case 'ArrowLeft': // 左矢印キー
            if (!checkCollision(currentTetromino.shape, currentX - 1, currentY, gameBoard)) {
                currentX--;
                console.log("ミノ移動: 左");
                gameLoop();
            }
            break;
        case 'ArrowRight': // 右矢印キー
            if (!checkCollision(currentTetromino.shape, currentX + 1, currentY, gameBoard)) {
                currentX++;
                console.log("ミノ移動: 右");
                gameLoop();
            }
            break;
        case 'ArrowUp': // 上矢印キー (回転)
            const rotatedShape = rotateTetromino(currentTetromino.shape);
            if (!checkCollision(rotatedShape, currentX, currentY, gameBoard)) {
                currentTetromino.shape = rotatedShape;
                console.log("ミノ回転");
                gameLoop();
            }
            break;
        case 'ArrowDown': // 下矢印キー (ソフトドロップ)
            if (!checkCollision(currentTetromino.shape, currentX, currentY + 1, gameBoard)) {
                currentY++;
                console.log("ミノ移動: 下");
                gameLoop();
            } else {
                // 衝突したら固定
                placeTetromino(currentTetromino.shape, currentX, currentY, gameBoard, currentTetromino.color, currentTetromino.id);
                spawnNewTetromino();
                gameLoop(); // ソフトドロップで固定後も再描画
            }
            break;
        case ' ': // Spaceキー (ハードドロップ)
        case 'Spacebar': // IE/Edge用の古いSpaceキーのevent.key値（念のため）
            if (event.code === 'Space') { // event.codeの方が確実
                console.log("ミノ一括落下 (ハードドロップ)");
                while (!checkCollision(currentTetromino.shape, currentX, currentY + 1, gameBoard)) {
                    currentY++;
                }
                placeTetromino(currentTetromino.shape, currentX, currentY, gameBoard, currentTetromino.color, currentTetromino.id);
                spawnNewTetromino();
                gameLoop();
            }
            break;
    }
}

// DOMが完全に読み込まれたら初期化処理を実行
document.addEventListener('DOMContentLoaded', () => {
    gameCanvas = document.getElementById('gameCanvas');
    gameContext = gameCanvas.getContext('2d');
    nextTetrominoCanvas = document.getElementById('nextTetrominoCanvas');
    nextTetrominoContext = nextTetrominoCanvas.getContext('2d');
    scoreElement = document.getElementById('scoreArea');
    timeElement = document.getElementById('timeArea'); // timeElementを初期化

    startGame(); // ゲームを開始
});

document.addEventListener('keydown', handleKeyPress);
