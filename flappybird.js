let gameStarted = false;

let startScreen;
let gameOverScreen;
let startBtn;
let retryBtn;
let finalScore;

//board
let board;
let boardWidth = 360;
let boardHeight = 640;
let context;

//bird
let birdWidth = 150; //width/height ratio = 408/228 = 17/12
let birdHeight = 100;
let birdX = boardWidth/8;
let birdY = boardHeight/2 + 40;
let hitboxPaddingX = 18;
let hitboxPaddingY = 10;
let birdImg;

let bird = {
    x : birdX,
    y : birdY,
    width : birdWidth,
    height : birdHeight
}

//pipes
let pipeArray = [];
let pipeWidth = 64; //width/height ratio = 384/3072 = 1/8
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

//physics
let velocityX = -2; //pipes moving left speed
let velocityY = 0; //bird jump speed
let rotation = 0;
let gravity = 0.4;

let gameOver = false;
let score = 0;

let wingSound = new Audio("./sfx_wing.wav");
let hitSound = new Audio("./sfx_hit.wav");
let bgm = new Audio("./bgm_mario.mp3");
let poiintSound = new Audio("./sfx_point.wav");
poiintSound.volume = 0.25;
bgm.loop = true

window.onload = function() {

    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d"); //used for drawing on the board

    //draw flappy bird
    // context.fillStyle = "green";
    // context.fillRect(bird.x, bird.y, bird.width, bird.height);

    //load images
    birdImg = new Image();
    birdImg.src = "./flappybird.png";
    birdImg.onload = function() {
        context.save();

        context.translate(
            bird.x + bird.width / 2,
            bird.y + bird.height / 2
        );

        context.rotate(rotation);

        context.drawImage(
            birdImg,
            -bird.width / 2,
            -bird.height / 2,
            bird.width,
            bird.height
        );

        context.restore();
    }

    topPipeImg = new Image();
    topPipeImg.src = "./toppipe.png";

    bottomPipeImg = new Image();
    bottomPipeImg.src = "./bottompipe.png";

    requestAnimationFrame(update);
    let pipeSpawner; //every 1.5 seconds
    document.addEventListener("keydown", moveBird);

     // Mobile support
    board.addEventListener("touchstart", handleTouch, { passive: false });
    board.addEventListener("click", handleTouch);

    startScreen = document.getElementById("startScreen");
    gameOverScreen = document.getElementById("gameOverScreen");
    startBtn = document.getElementById("startBtn");
    retryBtn = document.getElementById("retryBtn");
    finalScore = document.getElementById("finalScore");

    startBtn.addEventListener("click", startGame);
    retryBtn.addEventListener("click", restartGame);

    
}

function startGame() {
        if (gameStarted) return;

        gameStarted = true;
        startScreen.classList.add("hidden");
        pipeSpawner = setInterval(placePipes, 2500);
        velocityY = -6;

        bgm.play();
    }

    function showGameOverScreen() {
        finalScore.textContent = "Score: " + Math.floor(score);
        gameOverScreen.classList.remove("hidden");
    }

    function restartGame() {
        bird.y = birdY;
        velocityY = 0;

        pipeArray = [];
        score = 0;
        clearInterval(pipeSpawner);

        pipeSpawner = setInterval(placePipes, 2500);

        gameOver = false;
        gameStarted = true;

        gameOverScreen.classList.add("hidden");

        bgm.currentTime = 0;
        bgm.play();
    }

function endGame() {

    if (gameOver) return; // prevent running twice

    gameOver = true;

    bgm.pause();
    bgm.currentTime = 0;

    clearInterval(pipeSpawner);

    showGameOverScreen();
}

function update() {
    requestAnimationFrame(update);

    context.clearRect(0, 0, board.width, board.height);

    // STOP EVERYTHING until start
    if (!gameStarted) {
        context.save();

        context.translate(
            bird.x + bird.width / 2,
            bird.y + bird.height / 2
        );

        context.rotate(rotation);

        context.drawImage(
            birdImg,
            -bird.width / 2,
            -bird.height / 2,
            bird.width,
            bird.height
        );

        context.restore();
        return;
    }

     if (gameOver) {
        return;
    }

    //bird
    velocityY += gravity;
    // bird.y += velocityY;
    bird.y = Math.max(bird.y + velocityY, 0); //apply gravity to current bird.y, limit the bird.y to top of the canvas

    if (velocityY < 0) {
        rotation = -0.35; // nose up
    } else {
        rotation = Math.min(rotation + 0.03, 1.2);
    }

    context.save();

    context.translate(
        bird.x + bird.width / 2,
        bird.y + bird.height / 2
    );

    context.rotate(rotation);

    context.drawImage(
        birdImg,
        -bird.width / 2,
        -bird.height / 2,
        bird.width,
        bird.height
    );

    context.restore();

    if (bird.y > board.height) {
        endGame();
    }

    //pipes
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!gameOver && !pipe.passed && bird.x > pipe.x) {
            poiintSound.play();
            score += 0.5; //0.5 because there are 2 pipes! so 0.5*2 = 1, 1 for each set of pipes
            pipe.passed = true;
        }

        if (detectCollision(bird, pipe)) {
            hitSound.play();
            endGame();
        }
    }

    //clear pipes
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift(); //removes first element from the array
    }

    //score
    context.font = "bold 52px 'Trebuchet MS'";

    context.strokeStyle = "white";
    context.lineWidth = 4;
    context.strokeText(Math.floor(score), 15, 55);

    context.fillStyle = "black";
    context.fillText(Math.floor(score), 15, 55);

    if (gameOver) {
        bgm.pause();
        bgm.currentTime = 0
        context.fillText("GAME OVER", 5, 90);
    }
}

function placePipes() {
    if (gameOver) {
        return;
    }

    //(0-1) * pipeHeight/2.
    // 0 -> -128 (pipeHeight/4)
    // 1 -> -128 - 256 (pipeHeight/4 - pipeHeight/2) = -3/4 pipeHeight
    let randomPipeY = pipeY - pipeHeight/4 - Math.random()*(pipeHeight/2);
    let openingSpace = board.height/3;

    let topPipe = {
        img : topPipeImg,
        x : pipeX,
        y : randomPipeY,
        width : pipeWidth,
        height : pipeHeight,
        passed : false
    }
    pipeArray.push(topPipe);

    let bottomPipe = {
        img : bottomPipeImg,
        x : pipeX,
        y : randomPipeY + pipeHeight + openingSpace,
        width : pipeWidth,
        height : pipeHeight,
        passed : false
    }
    pipeArray.push(bottomPipe);
}

function flap() {

    if (!gameStarted) {
        startGame();
        return;
    }

    if (gameOver) {
        restartGame();
    }

    velocityY = -7;
    wingSound.play();
}

function moveBird(e) {

    if (
        e.code === "Space" ||
        e.code === "ArrowUp" ||
        e.code === "KeyX"
    ) {
        flap();
    }
}

function handleTouch(e) {
    e.preventDefault();
    flap();
}

function detectCollision(a, b) {

    let ax = a.x + hitboxPaddingX;
    let ay = a.y + hitboxPaddingY;
    let aw = a.width - hitboxPaddingX * 2;
    let ah = a.height - hitboxPaddingY * 2;

    return ax < b.x + b.width &&
           ax + aw > b.x &&
           ay < b.y + b.height &&
           ay + ah > b.y;
}