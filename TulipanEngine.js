// TulipanEngine.js - Módulo independiente para manejar tulipanes individuales

class TulipanSpriteEngine {
    constructor(spriteCanvasId, particlesCanvasId, tiltDirection = 0, animationDelay = 0) {
        this.canvas = document.getElementById(spriteCanvasId);
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.particlesCanvas = document.getElementById(particlesCanvasId);
        this.particlesCtx = this.particlesCanvas.getContext('2d');

        this.spriteSheet = null;
        this.currentFrame = 0;
        this.totalFrames = 5;
        this.animationDelay = animationDelay;
        this.hasStarted = false;
        this.tiltDirection = tiltDirection; // -15, 0, 15 para izquierda, centro, derecha
        this.swayAngle = 0; // Nuevo: ángulo dinámico para el balanceo

        // Dimensiones base
        const BASE_WIDTH = 210;
        const BASE_HEIGHT = 420;
        const BASE_PADDING = 20;

        // Escala fija
        const SCALE_FACTOR = 0.1;

        // Dimensiones escaladas
        this.frameWidth = BASE_WIDTH * SCALE_FACTOR;
        this.frameHeight = BASE_HEIGHT * SCALE_FACTOR;
        this.padding = BASE_PADDING * SCALE_FACTOR;

        // Configurar canvas
        this.canvas.width = this.frameWidth;
        this.canvas.height = this.frameHeight;
        this.canvas.style.width = this.frameWidth + 'px';
        this.canvas.style.height = this.frameHeight + 'px';

        const containerWidth = this.frameWidth + (this.padding * 2);
        const containerHeight = this.frameHeight + (this.padding * 2);

        this.particlesCanvas.width = containerWidth;
        this.particlesCanvas.height = containerHeight;
        this.particlesCanvas.style.width = containerWidth + 'px';
        this.particlesCanvas.style.height = containerHeight + 'px';

        // Configurar contenedor
        const container = this.canvas.parentElement;
        container.style.width = containerWidth + 'px';
        container.style.height = containerHeight + 'px';
        container.style.padding = this.padding + 'px';

        this.canvas.style.top = this.padding + 'px';
        this.canvas.style.left = this.padding + 'px';

        this.fps = 8;
        this.holdFrames = 5;
        this.holdCounter = 0;

        this.isPlaying = false;
        this.lastFrameTime = 0;
        this.animationId = null;
        this.effectTime = 0;
        this.particleOffset = { x: this.padding, y: this.padding };
        this.animationComplete = false;

        // Particles system
        this.particles = [];
        this.sparkles = [];

        this.loadTulipanSprite();
        this.startEffectLoop();

        // Programar inicio de animación
        setTimeout(() => {
            this.isPlaying = true;
            this.hasStarted = true;
            this.animate();
        }, this.animationDelay);
    }

    loadTulipanSprite() {
        const img = new Image();
        img.onload = () => {
            this.spriteSheet = img;
            this.renderCurrentFrame();
        };
        img.onerror = () => {
            this.drawPlaceholder();
        };
        img.src = 'sprite-tulipan.png';
    }

    drawPlaceholder() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#3498db';
        this.ctx.font = (20 * 0.1) + 'px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🌷', this.frameWidth/2, this.frameHeight/2 - 20 * 0.1);
        this.ctx.font = (14 * 0.1) + 'px Arial';
        this.ctx.fillText('Tulipán', this.frameWidth/2, this.frameHeight/2 + 10 * 0.1);
    }

    renderCurrentFrame() {
        if (!this.spriteSheet) {
            this.drawPlaceholder();
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();

        // Apply sparkle effect only on frame 5
        if (this.currentFrame === 4) {
            const time = this.effectTime * 0.01;
            this.ctx.shadowColor = '#ffd700';
            this.ctx.shadowBlur = (20 + Math.sin(time * 2) * 10) * 0.1;

            const intensity = 0.8 + Math.sin(time * 3) * 0.2;
            this.ctx.filter = `brightness(${100 + intensity * 30}%) saturate(120%) drop-shadow(0 0 ${15 * 0.1}px #ffd700)`;
        }

        // Calculate source position (original sprite size)
        const sourceX = this.currentFrame * 210; // Original frame width
        const sourceY = 0;

        // Definir punto de división (60% para tallo, 40% para flor)
        const flowerHeight = this.frameHeight * 0.4; // 40% superior para la flor
        const stemHeight = this.frameHeight * 0.6;   // 60% inferior para el tallo

        // 1. Dibujar la parte inferior (tallo) SIEMPRE sin movimiento
        this.ctx.drawImage(
            this.spriteSheet,
            sourceX, sourceY + (420 * 0.4), 210, (420 * 0.6),    // Source: desde 40% hacia abajo del sprite original
            0, flowerHeight, this.frameWidth, stemHeight  // Dest: desde flowerHeight hacia abajo
        );

        // 2. Dibujar la parte superior (flor) con inclinación (estática + dinámica)
        this.ctx.save();
        this.ctx.translate(this.frameWidth / 2, flowerHeight); // Punto de rotación en la división

        // Aplicar rotación estática (tiltDirection) + rotación dinámica (swayAngle)
        const totalRotation = this.tiltDirection + (this.swayAngle || 0);
        this.ctx.rotate(totalRotation * Math.PI / 180);

        this.ctx.translate(-this.frameWidth / 2, -flowerHeight);

        this.ctx.drawImage(
            this.spriteSheet,
            sourceX, sourceY, 210, (420 * 0.4),          // Source: primeros 40% del sprite original
            0, 0, this.frameWidth, flowerHeight    // Dest: primeros 40% del canvas
        );

        this.ctx.restore();
        this.ctx.restore();
    }

    animate() {
        if (!this.isPlaying || this.animationComplete) return;

        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        const frameInterval = 1000 / this.fps;

        if (deltaTime >= frameInterval) {
            this.holdCounter++;

            if (this.holdCounter >= this.holdFrames) {
                this.holdCounter = 0;
                this.currentFrame++;

                // Stop at frame 5 (index 4)
                if (this.currentFrame >= this.totalFrames) {
                    this.currentFrame = this.totalFrames - 1;
                    this.animationComplete = true;
                    this.createSparkleParticles();
                }

                this.renderCurrentFrame();

                // Generate particles when reaching frame 5
                if (this.currentFrame === 4) {
                    this.createSparkleParticles();
                }
            }

            this.lastFrameTime = now;
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    createSparkleParticles() {
        // Posiciones base escaladas - más visibles
        const bubbleSpots = [
            { x: 105 * 0.1 + this.particleOffset.x, y: 60 * 0.1 + this.particleOffset.y },
            { x: 80 * 0.1 + this.particleOffset.x, y: 80 * 0.1 + this.particleOffset.y },
            { x: 130 * 0.1 + this.particleOffset.x, y: 80 * 0.1 + this.particleOffset.y },
            { x: 105 * 0.1 + this.particleOffset.x, y: 100 * 0.1 + this.particleOffset.y },
            { x: 95 * 0.1 + this.particleOffset.x, y: 120 * 0.1 + this.particleOffset.y },
            { x: 115 * 0.1 + this.particleOffset.x, y: 120 * 0.1 + this.particleOffset.y },
        ];

        // Crear más partículas de burbujas
        bubbleSpots.forEach(spot => {
            if (Math.random() < 0.8) { // Aumenté la probabilidad de 0.5 a 0.8
                this.particles.push({
                    x: spot.x + (Math.random() - 0.5) * 40 * 0.1, // Más dispersión
                    y: spot.y + (Math.random() - 0.5) * 20 * 0.1,
                    vx: (Math.random() - 0.5) * 2 * 0.1, // Más velocidad
                    vy: -Math.random() * 4 * 0.1 - 2 * 0.1, // Más velocidad hacia arriba
                    size: (Math.random() * 8 + 3) * 0.1, // Partículas más grandes
                    life: 1,
                    decay: 0.003 + Math.random() * 0.002, // Duran más tiempo
                    color: this.getSparkleColor(),
                    type: 'bubble'
                });
            }
        });

        // Sparkles escalados - más cantidad
        for (let i = 0; i < 12; i++) { // Aumenté de 6 a 12
            this.sparkles.push({
                x: 70 * 0.1 + Math.random() * 80 * 0.1 + this.particleOffset.x,
                y: 40 * 0.1 + Math.random() * 120 * 0.1 + this.particleOffset.y,
                size: (Math.random() * 4 + 2) * 0.1, // Más grandes
                life: 1,
                decay: 0.008 + Math.random() * 0.004, // Más lentos
                twinkle: Math.random() * Math.PI * 2,
                color: this.getSparkleColor()
            });
        }
    }

    getSparkleColor() {
        const colors = ['#ffd700', '#ffeb3b', '#fff176', '#f9a825', '#ffffff', '#ffe082'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    updateParticles() {
        this.particlesCtx.clearRect(0, 0, this.particlesCanvas.width, this.particlesCanvas.height);

        if (this.currentFrame === 4) {
            // Actualizar partículas de burbujas
            this.particles = this.particles.filter(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy -= 0.015; // Menos gravedad para que floten más
                particle.life -= particle.decay;

                if (particle.life > 0) {
                    this.particlesCtx.save();
                    this.particlesCtx.globalAlpha = particle.life * 0.9; // Más opacidad

                    // Sombra más intensa
                    this.particlesCtx.shadowColor = particle.color;
                    this.particlesCtx.shadowBlur = particle.size * 4;
                    this.particlesCtx.fillStyle = particle.color;
                    this.particlesCtx.beginPath();
                    this.particlesCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    this.particlesCtx.fill();

                    // Highlight más brillante
                    this.particlesCtx.shadowBlur = 0;
                    this.particlesCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    this.particlesCtx.beginPath();
                    this.particlesCtx.arc(
                        particle.x - particle.size * 0.3,
                        particle.y - particle.size * 0.3,
                        particle.size * 0.4, // Highlight más grande
                        0, Math.PI * 2
                    );
                    this.particlesCtx.fill();

                    this.particlesCtx.restore();
                    return true;
                }
                return false;
            });

            // Actualizar sparkles
            this.sparkles = this.sparkles.filter(sparkle => {
                sparkle.life -= sparkle.decay;
                sparkle.twinkle += 0.3; // Más rápido el twinkle

                if (sparkle.life > 0) {
                    this.particlesCtx.save();
                    const alpha = sparkle.life * (0.6 + 0.4 * Math.sin(sparkle.twinkle)); // Más brillo
                    this.particlesCtx.globalAlpha = alpha;

                    this.particlesCtx.shadowColor = sparkle.color;
                    this.particlesCtx.shadowBlur = sparkle.size * 5; // Más glow
                    this.particlesCtx.fillStyle = sparkle.color;

                    this.particlesCtx.translate(sparkle.x, sparkle.y);
                    this.particlesCtx.rotate(sparkle.twinkle);

                    // Estrella más gruesa
                    this.particlesCtx.fillRect(-sparkle.size/2, -1, sparkle.size, 2);
                    this.particlesCtx.fillRect(-1, -sparkle.size/2, 2, sparkle.size);

                    this.particlesCtx.restore();
                    return true;
                }
                return false;
            });
        }
    }

    // Método para actualizar el ángulo de balanceo
    updateSwayAngle(angle) {
        this.swayAngle = angle;
        this.renderCurrentFrame();
    }

    startEffectLoop() {
        setInterval(() => {
            this.effectTime++;
            if (this.currentFrame === 4) {
                this.renderCurrentFrame();
            }
            this.updateParticles();
        }, 16);
    }
}