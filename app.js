// ======================================
// SUPER MARIO ADVENTURE - 100 LEVELS
// HTML + CSS + JAVASCRIPT
// ======================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const $ = (id) => document.getElementById(id);

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let level = 1;
let score = 0;
let coins = 0;
let lives = 3;
let timeLeft = 300;

let running = false;
let paused = false;
let cameraX = 0;
let lastTime = 0;
let timerCounter = 0;

const keys = new Set();

let platforms = [];
let blocks = [];
let coinItems = [];
let enemies = [];
let mushrooms = [];
let particles = [];

let goalX = 0;
let soundEnabled = true;
let audioContext = null;

const player = {
    x: 50,
    y: 400,
    width: 28,
    height: 40,
    vx: 0,
    vy: 0,
    onGround: false,
    face: 1,
    invincible: 0,
    big: false
};

const gravity = 0.62;
const speed = 3.5;
const jumpPower = 12;

// Different world backgrounds
const themes = [
    {
        sky: "#66c6ee",
        skyBottom: "#d8f5ff",
        hill: "#38a675",
        ground: "#925128",
        grass: "#48cf59"
    },
    {
        sky: "#ffad72",
        skyBottom: "#fff0b0",
        hill: "#ac6266",
        ground: "#794334",
        grass: "#efa344"
    },
    {
        sky: "#171e4e",
        skyBottom: "#657cb7",
        hill: "#2e4779",
        ground: "#3b416b",
        grass: "#6dcbd0"
    },
    {
        sky: "#a9e5ff",
        skyBottom: "#ffffff",
        hill: "#80bbdc",
        ground: "#8c9eae",
        grass: "#d9f5f5"
    },
    {
        sky: "#a84e8b",
        skyBottom: "#ffc2d6",
        hill: "#754985",
        ground: "#633c7b",
        grass: "#e88fd0"
    }
];

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function currentTheme() {
    return themes[Math.floor((level - 1) / 20) % themes.length];
}

// ======================================
// SOUND EFFECTS
// ======================================

function playSound(frequency = 600, duration = 0.1) {
    if (!soundEnabled) return;

    try {
        audioContext = audioContext ||
            new (window.AudioContext ||
            window.webkitAudioContext)();

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "square";
        oscillator.frequency.value = frequency;

        gain.gain.value = 0.035;

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + duration
        );

        oscillator.stop(audioContext.currentTime + duration);

    } catch (error) {
        console.log("Sound unavailable");
    }
}

// ======================================
// LEVEL GENERATION
// ======================================

function createLevel() {

    platforms = [];
    blocks = [];
    coinItems = [];
    enemies = [];
    mushrooms = [];
    particles = [];

    const worldLength = 2300 + level * 85;

    // Main ground
    platforms.push({
        x: 0,
        y: 478,
        width: worldLength,
        height: 62,
        type: "ground"
    });

    // Floating platforms and obstacles
    let x = 250;

    while (x < worldLength - 320) {

        // Add gaps in later levels
        if (
            x > 500 &&
            Math.random() < Math.min(0.08 + level * 0.002, 0.28)
        ) {

            const previous =
                platforms[platforms.length - 1];

            const gap = random(
                50,
                Math.min(80 + level * 0.3, 135)
            );

            previous.width = Math.max(
                130,
                x - previous.x
            );

            x = previous.x + previous.width + gap;

            platforms.push({
                x: x,
                y: 478,
                width: Math.max(280, worldLength - x),
                height: 62,
                type: "ground"
            });
        }

        const platformY = random(335, 405);
        const platformWidth = random(80, 145);

        platforms.push({
            x: x,
            y: platformY,
            width: platformWidth,
            height: 22,
            type: "brick"
        });

        // Coins above platforms
        if (Math.random() < 0.8) {

            coinItems.push({
                x: x + 40,
                y: platformY - 32,
                collected: false
            });
        }

        // Question mark blocks
        if (Math.random() < 0.8) {

            blocks.push({
                x: x + random(50, 100),
                y: platformY - 70,
                width: 32,
                height: 30,
                type: Math.random() < 0.7
                    ? "question"
                    : "brick",
                used: false,
                bump: 0
            });
        }

        // Enemies
        if (Math.random() < 0.5) {

            const enemyX = x + random(100, 180);

            enemies.push({
                x: enemyX,
                y: 444,
                width: 27,
                height: 30,
                speed: random(0.7, 1.1) + level * 0.012,
                minX: x - 10,
                maxX: x + 260,
                alive: true
            });
        }

        x += random(230, 315);
    }

    // Final safe platform
    platforms.push({
        x: worldLength - 300,
        y: 478,
        width: 300,
        height: 62,
        type: "ground"
    });

    goalX = worldLength - 110;

    // Additional coins
    const coinCount = Math.min(
        6 + Math.floor(level / 3),
        28
    );

    for (let i = 0; i < coinCount; i++) {

        coinItems.push({
            x: random(100, worldLength - 220),
            y: random(270, 430),
            collected: false
        });
    }

    // Reset player
    player.x = 50;
    player.y = 400;
    player.vx = 0;
    player.vy = 0;
    player.width = 28;
    player.height = 40;
    player.big = false;
    player.onGround = false;
    player.invincible = 1.5;

    cameraX = 0;

    timeLeft = 300 + Math.min(level * 4, 300);
    timerCounter = 0;

    updateHUD();
}

// ======================================
// UPDATE HUD
// ======================================

function updateHUD() {

    $("score").textContent =
        String(score).padStart(6, "0");

    $("coins").textContent = coins;

    $("lives").textContent =
        lives > 0
            ? "♥ ".repeat(lives).trim()
            : "—";

    $("world").textContent =
        `${Math.floor((level - 1) / 10) + 1}-${((level - 1) % 10) + 1}`;

    $("time").textContent = Math.max(
        0,
        Math.ceil(timeLeft)
    );
}

// ======================================
// START AND END GAME
// ======================================

function startGame() {

    level = 1;
    score = 0;
    coins = 0;
    lives = 3;

    createLevel();

    running = true;
    paused = false;

    $("overlay").classList.add("hidden");

    lastTime = performance.now();

    requestAnimationFrame(gameLoop);
}

function showMenu(title, message, buttonText) {

    running = false;

    $("overlayTitle").innerHTML = title;
    $("overlayText").textContent = message;
    $("startBtn").textContent = buttonText;

    $("overlay").classList.remove("hidden");
}

function completeLevel() {

    score += 1000;

    playSound(900, 0.2);

    level++;

    if (level > 100) {

        showMenu(
            "YOU WIN! 🏆",
            "Amazing! You completed all 100 levels! Final score: " + score,
            "PLAY AGAIN"
        );

        return;
    }

    createLevel();
}

// ======================================
// PLAYER DAMAGE
// ======================================

function hurtPlayer() {

    if (player.invincible > 0 || !running) {
        return;
    }

    player.invincible = 2;

    // Big player loses power before losing a life
    if (player.big) {

        player.big = false;
        player.width = 28;
        player.height = 40;
        player.y += 14;

        playSound(250);

        updateHUD();

        return;
    }

    lives--;

    player.vy = -7;
    player.vx = -player.face * 3;

    playSound(180, 0.2);

    updateHUD();

    if (lives <= 0) {

        showMenu(
            "GAME OVER",
            "You reached level " + level +
            ". Your score: " + score,
            "TRY AGAIN"
        );
    }
}

// ======================================
// MAIN GAME LOOP
// ======================================

function gameLoop(now) {

    if (!running) return;

    const delta = Math.min(
        (now - lastTime) / 1000,
        0.034
    );

    lastTime = now;

    if (!paused) {

        updateGame(delta);
        drawGame();
    }

    requestAnimationFrame(gameLoop);
}

// ======================================
// UPDATE GAME
// ======================================

function updateGame(delta) {

    // Player movement
    if (
        keys.has("ArrowLeft") ||
        keys.has("a") ||
        keys.has("A")
    ) {

        player.vx = -speed;
        player.face = -1;

    } else if (
        keys.has("ArrowRight") ||
        keys.has("d") ||
        keys.has("D")
    ) {

        player.vx = speed;
        player.face = 1;

    } else {

        player.vx *= 0.78;
    }

    // Jump
    if (
        (
            keys.has(" ") ||
            keys.has("ArrowUp") ||
            keys.has("w") ||
            keys.has("W")
        ) &&
        player.onGround
    ) {

        player.vy = player.big ? -13 : -jumpPower;

        player.onGround = false;

        playSound(350, 0.08);
    }

    player.vy += gravity;

    player.x += player.vx;
    player.y += player.vy;

    player.onGround = false;

    // Platform collisions
    for (const platform of platforms) {

        const horizontal =
            player.x + player.width > platform.x &&
            player.x < platform.x + platform.width;

        const vertical =
            player.y + player.height > platform.y &&
            player.y + player.height <
            platform.y + platform.height +
            Math.max(0, player.vy) + 5;

        if (
            horizontal &&
            vertical &&
            player.vy >= 0 &&
            player.y + player.height - player.vy
                <= platform.y + 9
        ) {

            player.y = platform.y - player.height;

            player.vy = 0;
            player.onGround = true;
        }
    }

    // Question block collisions
    for (const block of blocks) {

        if (block.bump > 0) {
            block.bump--;
        }

        const bx = block.x;
        const by = block.y - (block.bump ? 5 : 0);

        const horizontal =
            player.x + player.width > bx &&
            player.x < bx + block.width;

        const vertical =
            player.y < by + block.height &&
            player.y + player.height > by;

        if (
            horizontal &&
            vertical &&
            player.vy < 0 &&
            player.y >= by + block.height - 12
        ) {

            player.y = by + block.height;
            player.vy = 0;

            if (!block.used) {

                block.used = true;
                block.bump = 7;

                if (block.type === "question") {

                    coins++;
                    score += 200;

                    playSound(850, 0.1);

                    // Mushroom sometimes appears
                    if (Math.random() < 0.3) {

                        mushrooms.push({
                            x: block.x + 4,
                            y: block.y - 24,
                            width: 24,
                            height: 22,
                            vx: 1.2,
                            collected: false
                        });
                    }

                } else {

                    score += 50;

                    playSound(500, 0.07);
                }
            }
        }
    }

    // Collect coins
    for (const coin of coinItems) {

        if (coin.collected) continue;

        const dx = player.x + player.width / 2 - coin.x;
        const dy = player.y + player.height / 2 - coin.y;

        if (Math.abs(dx) < 24 && Math.abs(dy) < 30) {

            coin.collected = true;

            coins++;
            score += 100;

            playSound(1000, 0.06);
        }
    }

    // Mushroom power-ups
    for (const mushroom of mushrooms) {

        if (mushroom.collected) continue;

        mushroom.x += mushroom.vx;

        if (
            player.x < mushroom.x + mushroom.width &&
            player.x + player.width > mushroom.x &&
            player.y < mushroom.y + mushroom.height &&
            player.y + player.height > mushroom.y
        ) {

            mushroom.collected = true;

            player.big = true;
            player.width = 31;
            player.height = 54;
            player.y -= 14;

            score += 500;

            playSound(750, 0.25);
        }
    }

    // Enemies
    for (const enemy of enemies) {

        if (!enemy.alive) continue;

        enemy.x += enemy.speed;

        if (
            enemy.x < enemy.minX ||
            enemy.x > enemy.maxX
        ) {

            enemy.speed *= -1;
        }

        const touching =
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y;

        if (touching) {

            if (
                player.vy > 1 &&
                player.y + player.height <
                    enemy.y + enemy.height * 0.7
            ) {

                enemy.alive = false;

                player.vy = -8;

                score += 200;

                playSound(220, 0.1);

            } else {

                hurtPlayer();
            }
        }
    }

    // Falling off the map
    if (player.y > HEIGHT + 90) {

        hurtPlayer();

        if (running) {

            player.y = 350;
            player.vy = 0;
        }
    }

    // Camera follows player
    cameraX = Math.max(
        0,
        Math.min(
            player.x - WIDTH * 0.34,
            platforms[platforms.length - 1].x +
            platforms[platforms.length - 1].width -
            WIDTH
        )
    );

    // Finish flag
    if (player.x > goalX) {

        completeLevel();

        return;
    }

    // Countdown timer
    timerCounter += delta;

    if (timerCounter >= 1) {

        timerCounter = 0;
        timeLeft--;

        if (timeLeft <= 0) {

            hurtPlayer();

            if (running) {
                timeLeft = 60;
            }
        }
    }

    if (player.invincible > 0) {
        player.invincible -= delta;
    }

    updateHUD();
}

// ======================================
// DRAW GAME
// ======================================

function drawGame() {

    const theme = currentTheme();

    // Sky
    const sky = ctx.createLinearGradient(
        0, 0, 0, HEIGHT
    );

    sky.addColorStop(0, theme.sky);
    sky.addColorStop(1, theme.skyBottom);

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Clouds
    for (let i = 0; i < 8; i++) {

        const x =
            ((i * 177 - cameraX * 0.18) %
            (WIDTH + 120) + WIDTH + 120) %
            (WIDTH + 120) - 40;

        drawCloud(x, 55 + (i % 3) * 55);
    }

    // Hills
    ctx.fillStyle = theme.hill;

    for (let i = -1; i < 7; i++) {

        const x = i * 220 - (cameraX * 0.32 % 220);

        ctx.beginPath();

        ctx.moveTo(x, 478);

        ctx.quadraticCurveTo(
            x + 70, 270,
            x + 150, 390
        );

        ctx.quadraticCurveTo(
            x + 190, 420,
            x + 220, 478
        );

        ctx.fill();
    }

    // Platforms and ground
    for (const platform of platforms) {

        const x = platform.x - cameraX;

        if (
            x > WIDTH + 50 ||
            x + platform.width < -50
        ) continue;

        if (platform.type === "ground") {

            ctx.fillStyle = theme.grass;

            ctx.fillRect(
                x,
                platform.y,
                platform.width,
                10
            );

            for (
                let gx = x;
                gx < x + platform.width;
                gx += 16
            ) {

                ctx.fillStyle = "#239a4a";

                ctx.fillRect(
                    gx,
                    platform.y + 3,
                    9,
                    5
                );
            }

            ctx.fillStyle = theme.ground;

            ctx.fillRect(
                x,
                platform.y + 10,
                platform.width,
                platform.height - 10
            );

            ctx.strokeStyle = "#4c2c26";
            ctx.lineWidth = 2;

            for (
                let gy = platform.y + 22;
                gy < platform.y + platform.height;
                gy += 20
            ) {

                ctx.beginPath();
                ctx.moveTo(x, gy);
                ctx.lineTo(x + platform.width, gy);
                ctx.stroke();
            }

        } else {

            drawBrick(
                x,
                platform.y,
                platform.width,
                platform.height
            );
        }
    }

    // Blocks
    for (const block of blocks) {

        const x = block.x - cameraX;
        const y = block.y - (block.bump ? 5 : 0);

        if (x < -50 || x > WIDTH + 50) continue;

        if (block.type === "question" && !block.used) {

            ctx.fillStyle = "#ffdc48";

            ctx.fillRect(
                x, y,
                block.width,
                block.height
            );

            ctx.strokeStyle = "#87501f";
            ctx.lineWidth = 3;

            ctx.strokeRect(
                x, y,
                block.width,
                block.height
            );

            ctx.fillStyle = "#a85d1b";
            ctx.font = "bold 24px Arial";

            ctx.fillText("?", x + 9, y + 24);

        } else {

            drawBrick(
                x,
                y,
                block.width,
                block.height
            );
        }
    }

    // Coins
    for (const coin of coinItems) {

        if (coin.collected) continue;

        const x = coin.x - cameraX;

        if (x < -20 || x > WIDTH + 20) continue;

        ctx.fillStyle = "#ffca2e";

        ctx.beginPath();

        ctx.ellipse(
            x,
            coin.y,
            8,
            11,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.strokeStyle = "#fff1a0";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "#fff2a3";

        ctx.fillRect(
            x - 2,
            coin.y - 5,
            3,
            10
        );
    }

    // Mushrooms
    for (const mushroom of mushrooms) {

        if (mushroom.collected) continue;

        const x = mushroom.x - cameraX;

        ctx.fillStyle = "#df3d48";

        ctx.beginPath();

        ctx.arc(
            x + 12,
            mushroom.y + 9,
            11,
            Math.PI,
            0
        );

        ctx.fill();

        ctx.fillStyle = "#fff";

        ctx.fillRect(
            x + 5,
            mushroom.y + 3,
            5,
            6
        );

        ctx.fillRect(
            x + 15,
            mushroom.y + 3,
            5,
            6
        );

        ctx.fillStyle = "#f4e5be";

        ctx.fillRect(
            x + 3,
            mushroom.y + 10,
            18,
            10
        );

        ctx.fillStyle = "#4e8a3b";

        ctx.fillRect(
            x + 5,
            mushroom.y + 17,
            5,
            5
        );

        ctx.fillRect(
            x + 15,
            mushroom.y + 17,
            5,
            5
        );
    }

    // Enemies
    for (const enemy of enemies) {

        if (!enemy.alive) continue;

        drawEnemy(
            enemy.x - cameraX,
            enemy.y
        );
    }

    // Finish flag
    const flagX = goalX - cameraX;

    ctx.fillStyle = "#eeeeee";

    ctx.fillRect(
        flagX,
        300,
        6,
        178
    );

    ctx.fillStyle = "#fa5555";

    ctx.beginPath();

    ctx.moveTo(flagX + 6, 303);
    ctx.lineTo(flagX + 58, 321);
    ctx.lineTo(flagX + 6, 341);

    ctx.fill();

    ctx.fillStyle = "#ffe76a";

    ctx.beginPath();

    ctx.arc(
        flagX + 3,
        299,
        7,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Player
    drawPlayer(
        player.x - cameraX,
        player.y
    );

    // Progress bar
    ctx.fillStyle = "#13254499";

    ctx.fillRect(15, 14, 150, 8);

    ctx.fillStyle = "#ffe15b";

    ctx.fillRect(
        15,
        14,
        150 * Math.min(1, player.x / goalX),
        8
    );

    ctx.strokeStyle = "#fff";

    ctx.strokeRect(15, 14, 150, 8);
}

// ======================================
// DRAW CLOUDS
// ======================================

function drawCloud(x, y) {

    ctx.fillStyle = "#ffffffdf";

    ctx.beginPath();

    ctx.arc(x, y + 8, 13, 0, Math.PI * 2);
    ctx.arc(x + 14, y, 17, 0, Math.PI * 2);
    ctx.arc(x + 31, y + 9, 13, 0, Math.PI * 2);
    ctx.arc(x + 17, y + 14, 17, 0, Math.PI * 2);

    ctx.fill();
}

// ======================================
// DRAW BRICKS
// ======================================

function drawBrick(x, y, width, height) {

    ctx.fillStyle = "#98491f";

    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = "#d47b36";

    ctx.fillRect(
        x + 2,
        y + 2,
        width - 4,
        height / 2 - 3
    );

    ctx.strokeStyle = "#552d22";
    ctx.lineWidth = 3;

    ctx.strokeRect(x, y, width, height);

    ctx.beginPath();

    ctx.moveTo(x, y + height / 2);
    ctx.lineTo(x + width, y + height / 2);

    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width / 2, y + height / 2);

    ctx.moveTo(x + width * 0.25, y + height / 2);
    ctx.lineTo(x + width * 0.25, y + height);

    ctx.moveTo(x + width * 0.75, y + height / 2);
    ctx.lineTo(x + width * 0.75, y + height);

    ctx.stroke();
}

// ======================================
// DRAW ENEMIES
// ======================================

function drawEnemy(x, y) {

    ctx.fillStyle = "#914a32";

    ctx.beginPath();

    ctx.ellipse(
        x + 13,
        y + 16,
        14,
        15,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "#fff";

    ctx.fillRect(x + 4, y + 7, 8, 8);
    ctx.fillRect(x + 16, y + 7, 8, 8);

    ctx.fillStyle = "#18223b";

    ctx.fillRect(x + 8, y + 10, 3, 4);
    ctx.fillRect(x + 20, y + 10, 3, 4);

    ctx.fillStyle = "#4b2b28";

    ctx.fillRect(x + 2, y + 27, 10, 4);
    ctx.fillRect(x + 16, y + 27, 10, 4);
}

// ======================================
// DRAW PLAYER
// ======================================

function drawPlayer(x, y) {

    // Flicker while temporarily protected
    if (
        player.invincible > 0 &&
        Math.floor(performance.now() / 90) % 2 === 0
    ) {
        return;
    }

    // Hat
    ctx.fillStyle = "#e83e38";

    ctx.fillRect(x + 5, y, 19, 7);
    ctx.fillRect(x + 2, y + 5, 10, 5);

    // Face
    ctx.fillStyle = "#f1b78c";

    ctx.fillRect(x + 9, y + 5, 15, 13);

    // Eye
    ctx.fillStyle = "#25213a";

    ctx.fillRect(x + 19, y + 8, 3, 3);

    // Shirt
    ctx.fillStyle = "#2c6de0";

    ctx.fillRect(
        x + 7,
        y + 17,
        17,
        player.big ? 24 : 12
    );

    // Shirt detail
    ctx.fillStyle = "#fff";

    ctx.fillRect(x + 8, y + 18, 5, 7);

    // Arms
    ctx.fillStyle = "#f1b78c";

    ctx.fillRect(x + 2, y + 18, 7, 5);
    ctx.fillRect(x + 22, y + 18, 7, 5);

    // Trousers
    ctx.fillStyle = "#e53d43";

    ctx.fillRect(
        x + 8,
        y + (player.big ? 40 : 28),
        8,
        7
    );

    ctx.fillRect(
        x + 17,
        y + (player.big ? 40 : 28),
        8,
        7
    );

    // Shoes
    ctx.fillStyle = "#45302a";

    ctx.fillRect(
        x + 4,
        y + player.height - 6,
        13,
        6
    );

    ctx.fillRect(
        x + 17,
        y + player.height - 6,
        13,
        6
    );
}

// ======================================
// KEYBOARD CONTROLS
// ======================================

window.addEventListener("keydown", function (event) {

    if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", " "]
        .includes(event.key)
    ) {
        event.preventDefault();
    }

    if (
        event.key.toLowerCase() === "p" &&
        running
    ) {
        paused = !paused;
    }

    keys.add(event.key);
});

window.addEventListener("keyup", function (event) {
    keys.delete(event.key);
});

window.addEventListener("blur", function () {
    keys.clear();
});

// ======================================
// START BUTTON
// ======================================

$("startBtn").addEventListener("click", startGame);

// ======================================
// MOBILE CONTROLS
// ======================================

function addHoldControl(buttonId, key) {

    const button = $(buttonId);

    button.addEventListener("pointerdown", function (event) {

        event.preventDefault();

        keys.add(key);

        button.setPointerCapture(event.pointerId);
    });

    function release(event) {

        event.preventDefault();

        keys.delete(key);
    }

    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);

    button.addEventListener("lostpointercapture", function () {
        keys.delete(key);
    });
}

addHoldControl("leftBtn", "ArrowLeft");
addHoldControl("rightBtn", "ArrowRight");
addHoldControl("jumpBtn", " ");

// ======================================
// INITIAL SCREEN
// ======================================

createLevel();

drawGame();