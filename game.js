const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');

// Game constants
const GRAVITY = 0.15;
const JUMP_SPEED = -3;
const TERMINAL_VELOCITY = 6;
const BASE_PIPE_SPEED = 1.5;
const PIPE_WIDTH = 60;
const PIPE_GAP = 130;
const PIPE_SPAWN_INTERVAL = 1600;
const GROUND_HEIGHT = 80;
const BIRD_X = 100;

let currentPipeSpeed = BASE_PIPE_SPEED;

// Game state
let gameState = 'start';
let score = 0;
let bestScore = parseInt(localStorage.getItem('flappyBestScore')) || 0;

// Bird
const bird = {
    x: BIRD_X,
    y: 300,
    width: 30,
    height: 24,
    velocity: 0,
    rotation: 0,

    jump() {
        this.velocity = JUMP_SPEED;
    },

    update() {
        this.velocity += GRAVITY;
        if (this.velocity > TERMINAL_VELOCITY) {
            this.velocity = TERMINAL_VELOCITY;
        }
        this.y += this.velocity;

        // Rotation based on velocity
        this.rotation = Math.min(Math.max(this.velocity * 3, -30), 90);
    },

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate((this.rotation * Math.PI) / 180);

        // Body
        ctx.fillStyle = '#FFD93D';
        ctx.strokeStyle = '#E67E22';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Eye white
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(6, -4, 7, 0, Math.PI * 2);
        ctx.fill();

        // Eye pupil
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(8, -4, 3, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.moveTo(12, 2);
        ctx.lineTo(20, 5);
        ctx.lineTo(12, 8);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    },

    reset() {
        this.y = 300;
        this.velocity = 0;
        this.rotation = 0;
    }
};

// Pipes
let pipes = [];

function createPipe() {
    const minHeight = 60;
    const maxHeight = canvas.height - GROUND_HEIGHT - PIPE_GAP - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

    pipes.push({
        x: canvas.width,
        topHeight: topHeight,
        passed: false
    });
}

function updatePipes() {
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= currentPipeSpeed;

        // Check if bird passed the pipe
        if (!pipes[i].passed && pipes[i].x + PIPE_WIDTH < bird.x) {
            pipes[i].passed = true;
            score++;
            // Every 10 points, increase speed by 10%
            if (score % 10 === 0) {
                currentPipeSpeed = BASE_PIPE_SPEED * (1 + score / 100);
            }
        }

        // Remove off-screen pipes
        if (pipes[i].x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
        }
    }
}

function drawPipe(pipe) {
    const bottomY = pipe.topHeight + PIPE_GAP;
    const bottomHeight = canvas.height - GROUND_HEIGHT - bottomY;

    // Top pipe
    ctx.fillStyle = '#2ECC71';
    ctx.strokeStyle = '#27AE60';
    ctx.lineWidth = 3;
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
    ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);

    // Top pipe cap
    ctx.fillRect(pipe.x - 3, pipe.topHeight - 20, PIPE_WIDTH + 6, 20);
    ctx.strokeRect(pipe.x - 3, pipe.topHeight - 20, PIPE_WIDTH + 6, 20);

    // Bottom pipe
    ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, bottomHeight);
    ctx.strokeRect(pipe.x, bottomY, PIPE_WIDTH, bottomHeight);

    // Bottom pipe cap
    ctx.fillRect(pipe.x - 3, bottomY, PIPE_WIDTH + 6, 20);
    ctx.strokeRect(pipe.x - 3, bottomY, PIPE_WIDTH + 6, 20);
}

// Ground
let groundX = 0;

function drawGround() {
    const groundY = canvas.height - GROUND_HEIGHT;

    // Ground base
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, groundY, canvas.width, GROUND_HEIGHT);

    // Ground top line
    ctx.fillStyle = '#654321';
    ctx.fillRect(0, groundY, canvas.width, 10);

    // Ground pattern
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    for (let x = groundX % 40 - 40; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, groundY + 15);
        ctx.lineTo(x + 20, groundY + GROUND_HEIGHT);
        ctx.stroke();
    }
}

function updateGround() {
    groundX -= currentPipeSpeed;
    if (groundX <= -40) {
        groundX = 0;
    }
}

// Background
function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height - GROUND_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height - GROUND_HEIGHT);

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    drawCloud(50, 80, 60);
    drawCloud(200, 120, 80);
    drawCloud(320, 60, 50);
}

function drawCloud(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y - size * 0.1, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y + size * 0.2, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
}

// Collision detection
function checkCollision() {
    // Ground collision
    if (bird.y + bird.height > canvas.height - GROUND_HEIGHT) {
        return true;
    }

    // Ceiling collision
    if (bird.y < 0) {
        return true;
    }

    // Pipe collision
    const birdBox = {
        x: bird.x + 3,
        y: bird.y + 3,
        width: bird.width - 6,
        height: bird.height - 6
    };

    for (const pipe of pipes) {
        // Top pipe
        if (birdBox.x < pipe.x + PIPE_WIDTH &&
            birdBox.x + birdBox.width > pipe.x &&
            birdBox.y < pipe.topHeight) {
            return true;
        }

        // Bottom pipe
        const bottomY = pipe.topHeight + PIPE_GAP;
        if (birdBox.x < pipe.x + PIPE_WIDTH &&
            birdBox.x + birdBox.width > pipe.x &&
            birdBox.y + birdBox.height > bottomY) {
            return true;
        }
    }

    return false;
}

// Score display
function drawScore() {
    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 3;
    ctx.font = 'bold 48px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText(score, canvas.width / 2, 60);
    ctx.fillText(score, canvas.width / 2, 60);
}

// Game state management
function startGame() {
    gameState = 'playing';
    score = 0;
    pipes = [];
    currentPipeSpeed = BASE_PIPE_SPEED;
    bird.reset();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    lastPipeSpawn = Date.now();
}

function gameOver() {
    gameState = 'gameover';
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('flappyBestScore', bestScore);
    }
    finalScoreEl.textContent = score;
    bestScoreEl.textContent = bestScore;
    gameOverScreen.classList.remove('hidden');
}

// Main game loop
let lastPipeSpawn = 0;

function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    drawBackground();

    if (gameState === 'playing') {
        // Spawn pipes
        if (Date.now() - lastPipeSpawn > PIPE_SPAWN_INTERVAL) {
            createPipe();
            lastPipeSpawn = Date.now();
        }

        // Update
        bird.update();
        updatePipes();
        updateGround();

        // Check collision
        if (checkCollision()) {
            gameOver();
        }
    }

    // Draw game objects
    for (const pipe of pipes) {
        drawPipe(pipe);
    }

    drawGround();
    bird.draw();

    // Draw score
    if (gameState === 'playing') {
        drawScore();
    }

    requestAnimationFrame(gameLoop);
}

// Input handling
function handleInput() {
    if (gameState === 'start') {
        startGame();
    } else if (gameState === 'playing') {
        bird.jump();
    } else if (gameState === 'gameover') {
        startGame();
    }
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        handleInput();
    }
});

canvas.addEventListener('click', handleInput);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput();
});

startScreen.addEventListener('click', handleInput);
startScreen.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput();
});

gameOverScreen.addEventListener('click', handleInput);
gameOverScreen.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput();
});

// Initialize best score display
bestScoreEl.textContent = bestScore;

// Start game loop
gameLoop();
