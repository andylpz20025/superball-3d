// --- Spielkonstanten ---
const WIDTH = 600;
const HEIGHT = 600;

const FIELD_WIDTH = 300;
const FIELD_LEFT = (WIDTH - FIELD_WIDTH) / 2;
const FIELD_TOP = 40;
const FIELD_HEIGHT = HEIGHT - FIELD_TOP - 40;
const GRID_COLS = 8;
const GRID_ROWS = 25; 
const CELL_WIDTH = FIELD_WIDTH / GRID_COLS;
const CELL_HEIGHT = FIELD_HEIGHT / GRID_ROWS;

// FIX: Feste Größe für Superball (20px Durchmesser)
const SUPERBALL_RADIUS = 10; 
// FIX: Separater Radius für fallende Bälle (30px Durchmesser)
const FALLBALL_RADIUS = 15; 

// Die Variablen, die Three.js und die Superball-Klasse verwenden
const BALL_RADIUS = SUPERBALL_RADIUS; 
const GLB_SCALE_FACTOR = SUPERBALL_RADIUS; 

// NEU: Breite der 3D-Säulen an den Seiten
const PILLAR_WIDTH = 40; 
// NEU: Tiefe der 3D-Säulen
const PILLAR_DEPTH = 30; 

// NEU: Objekt mit allen Ball-Modellen
const BALL_MODELS = {
    'superball.glb': 'superball.glb',
    'superball_w.glb': 'superball_w.glb',
    'superball_t.glb': 'superball_t.glb'
};

const FALLBALL_COLORS_RGB = [
    [255, 0, 0], [255, 255, 0], [0, 255, 0], [0, 255, 255], [255, 0, 255], [0, 0, 255],
    [255, 165, 0], [128, 0, 0], [0, 128, 128], [255, 192, 203], [128, 128, 0], [75, 0, 130],
    [173, 216, 230], [0, 100, 0], [255, 69, 0], [218, 112, 214], [147, 112, 219], [0, 191, 255],
    [210, 105, 30], [220, 20, 60], [46, 139, 87], [70, 130, 180], [139, 0, 139], [255, 215, 0],
    [34, 139, 34], [255, 160, 122], [154, 205, 50], [255, 20, 147], [128, 0, 128], [176, 224, 230],
    [199, 21, 133], [240, 230, 140], [72, 61, 139], [0, 250, 154], [123, 104, 238], [160, 82, 45],
    [255, 99, 71], [240, 128, 128], [127, 255, 212], [255, 228, 181]
].map(c => `rgb(${c[0]}, ${c[1]}, ${c[2]})`);

const NUM_STARS = 420;
let stars = [];


// --- HTML-Elemente holen ---
const gameCanvas = document.getElementById('gameCanvas');
const ctx = gameCanvas.getContext('2d');
const introScreen = document.getElementById('intro-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const timerDisplay = document.getElementById('timer');
const levelDisplay = document.getElementById('level');
const introTitle = document.getElementById('intro-title');
const introStartText = document.getElementById('intro-start-text');
const touchLeft = document.getElementById('touch-left');
const touchRight = document.getElementById('touch-right');
const threejsContainer = document.getElementById('threejs-canvas-container');


// --- Three.js Setup ---
let scene, camera, renderer, superballMesh, ambientLight, pointLight;
const CAMERA_DISTANCE = -500; 
let isBallReady = false; 
let hasAnimationStarted = false;
const BORDER_COLOR = 'rgb(0, 100, 255)'; 

// Array zur Speicherung der Säulen-Meshes
let sidePillars = [];


// NEU: Erstellt die 3D-Säulen links und rechts des Spielfelds
function create3DSidePillars() {
    // Wenn die Säulen bereits existieren, brauchen wir nichts mehr zu tun
    if (sidePillars.length > 0) return; 
    
    // Säulen-Geometrie: Sehr hoch und dünn
    const geometry = new THREE.BoxGeometry(PILLAR_WIDTH, HEIGHT * 2, PILLAR_DEPTH); 
    
    // KORREKTUR: Opazität von 0.25 auf 0.4 erhöht, damit sie sichtbarer sind
    const material = new THREE.MeshPhongMaterial({ color: 0x005fcc, transparent: true, opacity: 0.4 }); 

    // Linke Säule
    const pillarLeft = new THREE.Mesh(geometry, material);
    pillarLeft.position.x = FIELD_LEFT - PILLAR_WIDTH / 2 - WIDTH / 2;
    pillarLeft.position.y = 0; 
    // KORREKTUR: Z-Position näher an die Kamera (-505 statt -510)
    pillarLeft.position.z = -505; 
    
    // Rechte Säule
    const pillarRight = new THREE.Mesh(geometry, material);
    pillarRight.position.x = FIELD_LEFT + FIELD_WIDTH + PILLAR_WIDTH / 2 - WIDTH / 2;
    pillarRight.position.y = 0; 
    // KORREKTUR: Z-Position näher an die Kamera (-505 statt -510)
    pillarRight.position.z = -505; 

    scene.add(pillarLeft);
    scene.add(pillarRight);
    
    sidePillars = [pillarLeft, pillarRight];
    console.log('3D-Säulen erstellt und Sichtbarkeit erhöht.');
}

// FALLBACK: Funktion zum Erstellen der Kugel, falls GLB fehlschlägt
function createFallbackSphere() {
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);

    const material = new THREE.MeshPhongMaterial({ 
        vertexColors: true, 
        specular: 0x555555, 
        shininess: 50 
    });
    
    // Färbung der Vertices für segmentierten Look
    const positions = geometry.attributes.position.array;
    const colors = [];
    const colorPalette = Superball.getPaletteRGB(); 
    const numSegments = colorPalette.length;

    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        let angle = Math.atan2(y, x);
        if (angle < 0) angle += 2 * Math.PI;

        const segmentIndex = Math.floor(angle / (2 * Math.PI) * numSegments) % numSegments;
        const rgb = colorPalette[segmentIndex];

        colors.push(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    }
    
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    superballMesh = new THREE.Mesh(geometry, material);
    scene.add(superballMesh);
    isBallReady = true; 
    console.log('Fallback: Standard 3D-Kugel erstellt und bereit.');
}

// Startet die Animationsschleife (entweder Intro oder GameLoop)
function startMainAnimationLoop() {
    if (hasAnimationStarted) return;
    
    // Stellt sicher, dass die Animation erst startet, wenn der Ball da ist
    if (!superballGame.gameRunning) {
        superballGame.animationFrameId = requestAnimationFrame(animateIntro);
    } else {
        superballGame.animationFrameId = requestAnimationFrame(gameLoop);
    }
    hasAnimationStarted = true;
}

// Initialisiert Three.js-Szene und startet den asynchronen Ladevorgang
function initThreeJS() {
    // 1. Initialisiere Szene, Kamera, Renderer und Licht (nur beim ersten Mal)
    if (renderer) {
        // Wenn der Renderer schon existiert (zweiter Aufruf), müssen wir nur das Mesh entfernen.
        if (superballMesh) scene.remove(superballMesh);
    } else {
        // Erster Aufruf: Szene, Kamera, Renderer erstellen
        scene = new THREE.Scene();
        
        camera = new THREE.OrthographicCamera(
            WIDTH / -2, WIDTH / 2,
            HEIGHT / 2, HEIGHT / -2,
            0.1, 1000 
        );
        camera.position.z = CAMERA_DISTANCE;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(WIDTH, HEIGHT);
        
        if (threejsContainer.firstChild) {
            threejsContainer.removeChild(threejsContainer.firstChild);
        }
        threejsContainer.appendChild(renderer.domElement);

        ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
        scene.add(ambientLight);

        pointLight = new THREE.PointLight(0xffffff, 0.8, 1000);
        pointLight.position.set(-200, 200, 200); 
        scene.add(pointLight);
    }

    // NEU: Erstellt die 3D-Säulen
    create3DSidePillars();

    // 2. GLB-Modell laden
    const loader = new THREE.GLTFLoader();
    
    // Liest die aktuelle Auswahl aus dem Dropdown-Menü
    const ballSelection = document.getElementById('ball-selection');
    // Verwendet 'superball.glb' als Fallback, falls das Element nicht gefunden wird
    const glbFilePath = ballSelection ? ballSelection.value : BALL_MODELS['superball.glb']; 
    
    isBallReady = false; // Zurücksetzen, da das Laden beginnt

    loader.load(
        glbFilePath,
        function (gltf) {
            let ballModel = gltf.scene;

            // Skalierung anpassen (Wird über die Konstante gesteuert)
            ballModel.scale.set(GLB_SCALE_FACTOR, GLB_SCALE_FACTOR, GLB_SCALE_FACTOR);
            
            // WICHTIG: Stellt sicher, dass Materialien aktualisiert werden 
            ballModel.traverse((o) => {
                if (o.isMesh) {
                    if (o.material.map) o.material.map.needsUpdate = true;
                    o.material.needsUpdate = true; 
                }
            });

            superballMesh = ballModel;
            scene.add(superballMesh);
            isBallReady = true; 
            
            console.log(`GLB-Modell (${glbFilePath}) erfolgreich geladen und bereit.`);
            startMainAnimationLoop(); 
        },
        function (xhr) {
            // Ladefortschritt
        },
        function (error) {
            console.error(`Fehler beim Laden des GLB-Modells (${glbFilePath}). Fallback wird verwendet.`, error);
            createFallbackSphere();
            startMainAnimationLoop(); 
        }
    );
}

// --- Sound-Logik ---
const SOUND_PATH = 'sounds/'; 
const backgroundMusic = new Audio(SOUND_PATH + 'background_music.mp3');
const schadeSound = new Audio(SOUND_PATH + 'schade.mp3'); 

backgroundMusic.volume = 0.12; 
backgroundMusic.loop = true;  
schadeSound.volume = 0.8; 

let musicPlayed = false; 

function playBackgroundMusic() {
    if (musicPlayed) return;
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0; 
    backgroundMusic.play().then(() => {
        musicPlayed = true;
    }).catch(e => {}); 
}

function stopBackgroundMusic() {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    musicPlayed = false; 
}

function playSchadeSound() {
    schadeSound.pause();
    schadeSound.currentTime = 0;
    schadeSound.play().catch(e => console.error("Fehler beim Abspielen des Schade-Sounds:", e));
}


// --- Klassen und Zeichenfunktionen ---

class Superball {
    constructor() {
        this.x = WIDTH / 2;
        this.y = FIELD_TOP + FIELD_HEIGHT - BALL_RADIUS - 50;
        this.radius = BALL_RADIUS; // BALL_RADIUS = SUPERBALL_RADIUS (10)
        this.speed = 0.0;
        this.maxSpeed = 10;
        this.acceleration = 0.6;
        this.friction = 0.3;
        
        this.rotationSpeedY = 1.0; 
        this.rotationSpeedX = 0.5; 
        this.maxRotationX = Math.PI / 8; 
    }

    static getPaletteRGB() {
        return [
            [120, 180, 255], [150, 120, 255], [200, 100, 255], 
            [255, 100, 200], [255, 100, 100], [255, 150, 50],  
            [255, 200, 0],   [200, 255, 0],   [100, 255, 0],   
            [0, 255, 100],   [0, 200, 255],   [0, 100, 255]    
        ];
    }
    
    static getColorRGB(index) {

        const palette = Superball.getPaletteRGB();
        return palette[index % palette.length];
    }

    move(direction) {
        if (direction === 0) {
            if (this.speed > 0) {
                this.speed -= this.friction;
                if (this.speed < 0) this.speed = 0;
            } else if (this.speed < 0) {
                this.speed += this.friction;
                if (this.speed > 0) this.speed = 0;
            }
        } else {
            this.speed += this.acceleration * direction;
            this.speed = Math.max(-this.maxSpeed, Math.min(this.speed, this.maxSpeed));
        }

        this.x += this.speed;
        
        if (this.x - this.radius < FIELD_LEFT) {
            this.x = FIELD_LEFT + this.radius;
            this.speed = 0;
        }
        if (this.x + this.radius > FIELD_LEFT + FIELD_WIDTH) {
            this.x = FIELD_LEFT + FIELD_WIDTH - this.radius;
            this.speed = 0;
        }
    }

    draw(dt) { 
        // Positionierung: Konvertierung von 2D-Canvas (oben links 0,0) zu 3D-Center (Mitte 0,0)
        superballMesh.position.x = this.x - WIDTH / 2;
        superballMesh.position.y = -(this.y - HEIGHT / 2); 
        
        // Z-Position im Spiel (wie gewünscht)
        superballMesh.position.z = -500; 

        // Rotation auf das 3D-Mesh anwenden
        superballMesh.rotation.y += this.rotationSpeedY * dt;
        superballMesh.rotation.x = this.maxRotationX * Math.sin(Date.now() / 1000 * this.rotationSpeedX);
    }
}


class FallingBall {
    constructor(level) {
        // Verwendet den größeren Radius für fallende Bälle (15)
        this.radius = FALLBALL_RADIUS; 
        
        // Die Spawnberechnung muss sich an den FALLBALL_RADIUS anpassen
        const minX = FIELD_LEFT + this.radius;
        const maxX = FIELD_LEFT + FIELD_WIDTH - this.radius;
        this.x = minX + Math.random() * (maxX - minX);

        this.y = FIELD_TOP - this.radius;
        this.speed = 5 + level * 1.2;
        this.color = FALLBALL_COLORS_RGB[Math.floor(Math.random() * FALLBALL_COLORS_RGB.length)];
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    offScreen() {
        return this.y - this.radius > FIELD_TOP + FIELD_HEIGHT;
    }
}


function initStars(numStars, speedMin, speedMax) {
    stars = [];
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * WIDTH,
            y: Math.random() * HEIGHT,
            radius: Math.random() * 1 + 0.5,
            speed: Math.random() * (speedMin - speedMax) + speedMax
        });
    }
}

function drawStars(dt) {
    ctx.globalCompositeOperation = 'lighter'; 

    stars.forEach(star => {
        star.y += star.speed * dt * 60; 
        if (star.y > HEIGHT) {
            star.y = 0;
            star.x = Math.random() * WIDTH;
        }

        const alpha = 0.6 + 0.4 * Math.sin(Date.now() / 800 + star.x / 100); 
        const color = `rgba(255, 255, 255, ${alpha})`;
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over'; 
}

function drawGrid(offset) {
    const GRID_COLOR = 'rgb(40, 40, 70)';
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    for (let col = 0; col <= GRID_COLS; col++) {
        const x = FIELD_LEFT + col * CELL_WIDTH;
        ctx.beginPath();
        ctx.moveTo(x, FIELD_TOP);
        ctx.lineTo(x, FIELD_TOP + FIELD_HEIGHT);
        ctx.stroke();
    }

    for (let row = 0; row <= GRID_ROWS + 1; row++) {
        const y = FIELD_TOP + ((row * CELL_HEIGHT + offset) % (GRID_ROWS * CELL_HEIGHT));
        ctx.beginPath();
        ctx.moveTo(FIELD_LEFT, y);
        ctx.lineTo(FIELD_LEFT + FIELD_WIDTH, y);
        ctx.stroke();
    }

    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(FIELD_LEFT, FIELD_TOP);
    ctx.lineTo(FIELD_LEFT, FIELD_TOP + FIELD_HEIGHT);
    ctx.moveTo(FIELD_LEFT + FIELD_WIDTH, FIELD_TOP);
    ctx.lineTo(FIELD_LEFT + FIELD_WIDTH, FIELD_TOP + FIELD_HEIGHT);
    ctx.stroke();
}


// --- Spielzustand und Logik ---

let superballGame = {
    superball: null,
    fallingBall: null,
    level: 1,
    startTime: null,
    gameOver: true,
    moveLeft: false,
    moveRight: false,
    lastLevelUp: null,
    gameOverTime: null,
    gridOffset: 0,
    animationFrameId: null, 
    lastTime: 0,
    gameRunning: false,
    reset: function() {
        if (this.gameOver) {
            resetGame();
            // Beim Reset muss die 3D-Szene neu geladen werden, 
            // um den aktuell ausgewählten Ball zu verwenden.
            if (renderer) {
                // Das alte Mesh entfernen und initThreeJS neu starten
                if (superballMesh) {
                     scene.remove(superballMesh);
                }
                isBallReady = false; 
                initThreeJS(); 
            }
        }
    },
    // NEU: Logik zum Zurücksetzen des Highscores
    resetHighscore: function() {
        if (confirm("Sicher? Der beste Rekord wird gelöscht.")) {
            localStorage.setItem('superballHighscoreMs', '0');
            console.log("Highscore zurückgesetzt.");
            // Highscore-Anzeige neu laden, um die Änderung zu zeigen
            displayHighscore(0); 
            // Den Button verstecken oder deaktivieren, wenn der Score 0 ist
            const button = document.getElementById('reset-highscore-button');
            if (button) button.style.display = 'none'; 
        }
    }
};

function formatTime(ms) {
    const totalMs = Math.floor(ms);
    const mm = Math.floor(totalMs / 60000);
    const ss = Math.floor((totalMs / 1000) % 60);
    const msValue = Math.floor((totalMs % 1000) / 10); 
    return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}:${msValue.toString().padStart(2, '0')}`;
}

function resetGame() {
    superballGame.superball = new Superball();
    superballGame.level = 1;
    superballGame.fallingBall = new FallingBall(1); 
    superballGame.startTime = Date.now();
    superballGame.lastLevelUp = superballGame.startTime;
    superballGame.gameOver = false;
    superballGame.moveLeft = false;
    superballGame.moveRight = false;
    superballGame.gameOverTime = null;
    superballGame.gridOffset = 0;
    
    gameOverScreen.classList.add('hidden');
    introScreen.classList.add('hidden');
    
    if (superballMesh) {
        superballMesh.visible = true;
    }
    
    // Säulen im Spiel sichtbar lassen, im Intro wurden sie nur gezeichnet
    if (sidePillars.length > 0) {
        sidePillars.forEach(p => p.visible = true);
    }

    playBackgroundMusic();
    superballGame.gameRunning = true; 
}

function saveHighscore(scoreMs) {
    const currentHighscore = parseInt(localStorage.getItem('superballHighscoreMs') || '0', 10);
    if (scoreMs > currentHighscore) {
        localStorage.setItem('superballHighscoreMs', scoreMs);
        return true; 
    }
    return false; 
}

function displayHighscore(scoreMs) {
    const currentOverlay = document.querySelector('.overlay:not(.hidden)');
    const oldScoreText = currentOverlay ? currentOverlay.querySelector('.score-text') : null;

    if (oldScoreText) {
        oldScoreText.remove(); 
    }
    
    const newScoreText = document.createElement('p');
    newScoreText.classList.add('score-text');

    const highscoreMs = parseInt(localStorage.getItem('superballHighscoreMs') || '0', 10);
    const highscoreFormatted = formatTime(highscoreMs);
    
    const resetButton = document.getElementById('reset-highscore-button');

    let highscoreText = '';
    const isNewHighscore = scoreMs > 0 && scoreMs === highscoreMs;

    if (scoreMs > 0) {
        if (isNewHighscore) {
            highscoreText = `NEUER REKORD: ${formatTime(scoreMs)}!`;
        } else {
            highscoreText = `Deine Zeit: ${formatTime(scoreMs)}<br>Bester Rekord: ${highscoreFormatted}`;
        }
    } else {
         highscoreText = `Bester Rekord: ${highscoreFormatted}`;
    }
    
    // NEU: Reset Button sichtbar machen, wenn ein Highscore existiert
    if (resetButton) {
        resetButton.style.display = (highscoreMs > 0 || scoreMs > 0) ? 'inline-block' : 'none';
    }


    newScoreText.innerHTML = highscoreText;
    
    if (!gameOverScreen.classList.contains('hidden')) {
        const button = gameOverScreen.querySelector('button');
        gameOverScreen.insertBefore(newScoreText, button);
    } else if (!introScreen.classList.contains('hidden')) {
        // Im Intro: Füge den Highscore über dem Start-Button ein
        const startText = introScreen.querySelector('#intro-start-text');
        introScreen.insertBefore(newScoreText, startText);
    }
}

function checkCollision() {
    // Die Kollision verwendet den Radius des Superballs (10) und den Radius des FallingBall (15)
    const dx = superballGame.superball.x - superballGame.fallingBall.x;
    const dy = superballGame.superball.y - superballGame.fallingBall.y;
    const distance = Math.hypot(dx, dy);
    
    // Die Summe der Radien ist 10 + 15 = 25
    if (distance < superballGame.superball.radius + superballGame.fallingBall.radius) {
        superballGame.gameOver = true;
        superballGame.gameOverTime = Date.now();
        gameOverScreen.classList.remove('hidden');
        superballGame.gameRunning = false; 
        
        if (superballMesh) superballMesh.visible = false;
        if (sidePillars.length > 0) {
            sidePillars.forEach(p => p.visible = false);
        }

        const finalScoreMs = superballGame.gameOverTime - superballGame.startTime;
        saveHighscore(finalScoreMs);
        displayHighscore(finalScoreMs);

        if ('vibrate' in navigator) {
            navigator.vibrate(300); 
        }
        
        stopBackgroundMusic();
        playSchadeSound();
    }
}

function drawTexts() {
    let elapsed;
    if (superballGame.gameOver && superballGame.gameOverTime !== null) {
        elapsed = superballGame.gameOverTime - superballGame.startTime;
    } else if (superballGame.startTime !== null) {
        elapsed = Date.now() - superballGame.startTime;
    } else {
        elapsed = 0;
    }

    timerDisplay.textContent = formatTime(elapsed);
    levelDisplay.textContent = `Level: ${superballGame.level}`;
}


// --- Event-Handler ---

function handleStartInteraction(event) {
    if (event.type === 'keydown' && event.code === 'Space') { 
        event.preventDefault(); 
    }
    
    playBackgroundMusic(); 

    if (!superballGame.gameRunning || superballGame.gameOver) {
        if (!superballGame.gameRunning) {
            resetGame();
        }
    }
}

document.addEventListener('keydown', handleStartInteraction);
gameCanvas.addEventListener('touchstart', handleStartInteraction);
introScreen.addEventListener('touchstart', (e) => {
    // Wenn das Event vom Select-Feld oder Reset-Button kommt, nicht das Spiel starten
    if (e.target.id === 'ball-selection' || e.target.id === 'reset-highscore-button') {
        return;
    }
    handleStartInteraction(e);
});
gameOverScreen.addEventListener('touchstart', handleStartInteraction);


document.addEventListener('keydown', (event) => {
    if (!superballGame.gameRunning || superballGame.gameOver) return;

    if (event.code === 'ArrowLeft' || event.code === 'Numpad4') {
        superballGame.moveLeft = true;
    }
    if (event.code === 'ArrowRight' || event.code === 'Numpad6') {
        superballGame.moveRight = true;
    }
});

document.addEventListener('keyup', (event) => {
    if (!superballGame.gameRunning || superballGame.gameOver) return;

    if (event.code === 'ArrowLeft' || event.code === 'Numpad4') {
        superballGame.moveLeft = false;
    }
    if (event.code === 'ArrowRight' || event.code === 'Numpad6') {
        superballGame.moveRight = false;
    }
});


function setupTouchControls() {
    if (!touchLeft || !touchRight) return; 

    const setMove = (isLeft, value, e) => {
        if (e) e.preventDefault();
        if (!superballGame.gameOver) {
            if (isLeft) superballGame.moveLeft = value;
            else superballGame.moveRight = value;
        }
    };

    touchLeft.addEventListener('touchstart', (e) => setMove(true, true, e));
    touchLeft.addEventListener('touchend', (e) => setMove(true, false, e));
    touchLeft.addEventListener('mousedown', (e) => setMove(true, true, e));
    touchLeft.addEventListener('mouseup', () => setMove(true, false));
    touchLeft.addEventListener('mouseleave', () => setMove(true, false)); 

    touchRight.addEventListener('touchstart', (e) => setMove(false, true, e));
    touchRight.addEventListener('touchend', (e) => setMove(false, false, e));
    touchRight.addEventListener('mousedown', (e) => setMove(false, true, e));
    touchRight.addEventListener('mouseup', () => setMove(false, false));
    touchRight.addEventListener('mouseleave', () => setMove(false, false));
}


// --- Intro-Animation ---

let introPulseTime = 0;
const introLetterColors = [
    'rgb(225, 216, 111)', 'rgb(225, 192, 125)', 'rgb(232, 137, 103)',
    'rgb(220, 123, 138)', 'rgb(233, 120, 184)', 'rgb(156, 121, 216)',
    'rgb(142, 156, 216)', 'rgb(143, 161, 234)', 'rgb(88, 213, 162)'
];

function setupIntro() {
    introScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    
    initStars(NUM_STARS, 0.5, 1.5); 

    introTitle.innerHTML = ''; 
    'SUPERBALL'.split('').forEach((letter, index) => {
        const span = document.createElement('span');
        span.textContent = letter;
        span.style.color = introLetterColors[index];
        introTitle.appendChild(span);
    });

    displayHighscore(0); 
    
    // Hinzufügen des Change-Listeners, um den Ball neu zu laden, wenn die Auswahl im Intro geändert wird
    const ballSelection = document.getElementById('ball-selection');
    if (ballSelection) {
        ballSelection.onchange = () => {
             // Wenn der Ball bereits geladen war, entfernen und initThreeJS erneut aufrufen
            if (isBallReady) {
                scene.remove(superballMesh);
                isBallReady = false;
                initThreeJS(); 
            }
        };
    }

    playBackgroundMusic(); 
    superballGame.gameRunning = false; 
    
    superballGame.superball = new Superball(); 

    // Starte den Ladevorgang (asynchron). Die Animation startet danach.
    initThreeJS();
}

function animateIntro(currentTime) {
    if (!superballGame.gameRunning) { 
        const dt = (currentTime - superballGame.lastTime) / 1000 || 0;
        superballGame.lastTime = currentTime;
        introPulseTime += dt;

        const bright = Math.floor(100 + 155 * (0.5 + 0.5 * Math.sin(introPulseTime * 3)));
        introStartText.style.color = `rgb(0, ${bright}, 255)`;

        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        drawStars(dt); 

        if (isBallReady) {
            superballMesh.position.x = 0;
            superballMesh.position.y = 0;
            superballMesh.position.z = -5; // Z-Position für Intro (nah am Gitter)
            superballMesh.rotation.y += 0.5 * dt;
            superballMesh.rotation.x = superballGame.superball.maxRotationX * Math.sin(currentTime / 1000 * superballGame.superball.rotationSpeedX);
            renderer.render(scene, camera);
        } else if (renderer) {
            // Rendern, auch wenn der Ball noch nicht bereit ist (um den Ladebildschirm zu aktualisieren)
            renderer.render(scene, camera);
        }

        superballGame.animationFrameId = requestAnimationFrame(animateIntro);
    } else {
        if (superballGame.animationFrameId) {
            cancelAnimationFrame(superballGame.animationFrameId);
        }
        superballGame.animationFrameId = requestAnimationFrame(gameLoop);
    }
}


// --- Haupt-Game Loop ---

function gameLoop(currentTime) {
    const dt = (currentTime - superballGame.lastTime) / 1000 || 0;
    superballGame.lastTime = currentTime;

    if (!superballGame.gameOver && superballGame.gameRunning) {
        
        const direction = superballGame.moveLeft && !superballGame.moveRight ? -1 :
                          superballGame.moveRight && !superballGame.moveLeft ? 1 : 0;
        superballGame.superball.move(direction);
        superballGame.fallingBall.update();

        const now = Date.now();
        if (now - superballGame.lastLevelUp > 30000) { 
            superballGame.level++;
            superballGame.lastLevelUp = now;
            superballGame.fallingBall = new FallingBall(superballGame.level); 
        }

        if (superballGame.fallingBall.offScreen()) {
            superballGame.fallingBall = new FallingBall(superballGame.level);
        }

        checkCollision();

        superballGame.gridOffset += 120 * dt; 
        if (superballGame.gridOffset > CELL_HEIGHT) {
            superballGame.gridOffset -= CELL_HEIGHT;
        }
    }

    // 2D-Rendering (Sterne, Gitter, Falling Balls)
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    drawStars(dt);
    drawGrid(superballGame.gridOffset);
    
    if (!superballGame.gameOver) {
        if (isBallReady) {
            superballGame.superball.draw(dt); 
            renderer.render(scene, camera);
        }
        
        superballGame.fallingBall.draw();
    }
    
    drawTexts(); 

    superballGame.animationFrameId = requestAnimationFrame(gameLoop);
}


// --- Initialisierung und Start ---

setupTouchControls(); 
setupIntro();