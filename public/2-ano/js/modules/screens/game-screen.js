/**
 * Game Screen - Tela do Jogo
 * Jogo de face tracking com vaso no nariz
 */

class GameScreen extends BaseScreen {
    constructor() {
        super('game', { 
            next: 'final',
            onEnter: () => this.handleEnter(),
            onExit: () => this.handleExit()
        });
        
        // Estado do jogo simplificado
        this.gameState = 'waiting'; // waiting, playing, completed
        this.faceTrackingActive = false;
        this.headPosition = { x: 0, y: 0, z: 0 };
        
        // Otimizações para mobile
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.detectionInterval = this.isMobile ? 50 : 100; // 50ms para mobile (20fps), 100ms para desktop (10fps)
        this.lastDetectionTime = 0;

        // Elementos A-Frame
        this.scene = null;
        this.camera = null;
        this.gameElements = null;

        // Face tracking
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.isModelLoaded = false;
        this.detectionActive = false;

        // Overlay de carregamento e status
        this.loadingOverlay = null;
        this.faceStatusOverlay = null;
        this.silhouetteOverlay = null;
        this.isFaceVisible = false;
        this.faceLostTimeout = null;

        // Elemento do vaso
        this.vasoElement = null;

        // Sistema de emojis
        this.emojis = [];
        this.emojiSpawnInterval = null;
        this.emojiSpawnRate = 2000; // 2 segundos entre emojis
        this.score = 0;
        this.scoreElement = null;
        this.emojiTypes = ['01', '02', '03', '04', '05', '06', '07', '08'];

        this.onInit();
    }
    
    onInit() {
        this.setupFaceTracking();
        this.createFaceStatusOverlay();
        this.createSilhouetteOverlay();
    }
    
    createLoadingOverlay() {
        // Criar overlay de carregamento
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.id = 'loading-overlay';
        this.loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            opacity: 1;
            transition: opacity 0.5s ease-in-out;
        `;
        
        // Spinner de carregamento
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 60px;
            height: 60px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid #4ECDC4;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;
        
        // Adicionar CSS para animação
        if (!document.getElementById('loading-animations')) {
            const style = document.createElement('style');
            style.id = 'loading-animations';
            style.textContent = `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        this.loadingOverlay.appendChild(spinner);
        document.body.appendChild(this.loadingOverlay);
        
        console.log('✅ Overlay de carregamento criado');
    }
    
    createFaceStatusOverlay() {
        // Criar overlay de status do rosto
        this.faceStatusOverlay = document.createElement('div');
        this.faceStatusOverlay.id = 'face-status-overlay';
        this.faceStatusOverlay.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-family: 'Nunito', Arial, sans-serif;
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            z-index: 9998;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            pointer-events: none;
        `;
        
        document.body.appendChild(this.faceStatusOverlay);
        console.log('✅ Overlay de status do rosto criado');
    }
    
    createSilhouetteOverlay() {
        // Criar overlay da silhueta (tela inteira)
        this.silhouetteOverlay = document.createElement('div');
        this.silhouetteOverlay.id = 'silhouette-overlay';
        this.silhouetteOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9997;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
            pointer-events: none;
        `;
        
        // Criar imagem da silhueta
        const silhouetteImg = document.createElement('img');
        silhouetteImg.src = 'assets/textures/silhueta.png';
        silhouetteImg.alt = 'Silhueta';
        silhouetteImg.style.cssText = `
            width: 90%;
            height: auto;
            opacity: 0.8;
            position: absolute;
            bottom: 0%;
            left: 50%;
            transform: translate(-50%, 0%);
        `;
        
        // Criar texto de instrução
        const instructionText = document.createElement('div');
        instructionText.textContent = 'Posicione seu rosto na câmera';
        instructionText.style.cssText = `
            position: absolute;
            bottom: 100px;
            color: white;
            font-family: 'Nunito', Arial, sans-serif;
            font-size: 18px;
            font-weight: 600;
            text-align: center;
            width: 100%;
        `;
        
        this.silhouetteOverlay.appendChild(silhouetteImg);
        this.silhouetteOverlay.appendChild(instructionText);
        document.body.appendChild(this.silhouetteOverlay);
        
        console.log('✅ Overlay da silhueta criado');
    }
    
    createVasoElement() {
        // Criar elemento do vaso que será fixado no nariz
        this.vasoElement = document.createElement('div');
        this.vasoElement.id = 'vaso-element';
        this.vasoElement.style.cssText = `
            position: fixed;
            width: 80px;
            height: 80px;
            background-image: url('assets/textures/vasos/vaso_1.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            pointer-events: none;
            z-index: 1000;
            transform: translate(-50%, -50%);
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
        `;
        
        // Adicionar CSS para animação de flutuação
        if (!document.getElementById('vaso-animations')) {
            const style = document.createElement('style');
            style.id = 'vaso-animations';
            style.textContent = `
                @keyframes float {
                    0%, 100% { 
                        transform: translate(-50%, -50%) translateY(0px) rotate(0deg); 
                    }
                    50% { 
                        transform: translate(-50%, -50%) translateY(-5px) rotate(2deg); 
                    }
                }
                
                @keyframes fall {
                    from { 
                        transform: translateY(0px) scale(1);
                        opacity: 1;
                    }
                    to { 
                        transform: translateY(100vh) scale(0.8);
                        opacity: 0.7;
                    }
                }
                
                @keyframes collect {
                    0% { 
                        transform: scale(1);
                        opacity: 1;
                        filter: brightness(1) saturate(1);
                    }
                    20% { 
                        transform: scale(1.8);
                        opacity: 1;
                        filter: brightness(1.5) saturate(1.5);
                    }
                    40% { 
                        transform: scale(2.2);
                        opacity: 0.9;
                        filter: brightness(2) saturate(2);
                    }
                    60% { 
                        transform: scale(1.9);
                        opacity: 0.7;
                        filter: brightness(1.8) saturate(1.8);
                    }
                    80% { 
                        transform: scale(1.3);
                        opacity: 0.4;
                        filter: brightness(1.3) saturate(1.3);
                    }
                    100% { 
                        transform: scale(0);
                        opacity: 0;
                        filter: brightness(1) saturate(1);
                    }
                }
                
                @keyframes explode {
                    0% { 
                        transform: scale(0);
                        opacity: 1;
                    }
                    50% { 
                        transform: scale(1.2);
                        opacity: 0.8;
                    }
                    100% { 
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(this.vasoElement);
        console.log('✅ Elemento do vaso criado');
    }

    createScoreElement() {
        // Criar elemento de pontuação
        this.scoreElement = document.createElement('div');
        this.scoreElement.id = 'score-element';
        this.scoreElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 20px;
            border-radius: 25px;
            font-family: 'Nunito', Arial, sans-serif;
            font-size: 18px;
            font-weight: 700;
            text-align: center;
            z-index: 9999;
            border: 2px solid #4ECDC4;
            box-shadow: 0 4px 15px rgba(78, 205, 196, 0.3);
        `;
        
        this.updateScore();
        document.body.appendChild(this.scoreElement);
        console.log('✅ Elemento de pontuação criado');
    }

    spawnEmoji() {
        // Criar novo emoji
        const emoji = document.createElement('div');
        const randomType = this.emojiTypes[Math.floor(Math.random() * this.emojiTypes.length)];
        
        emoji.className = 'emoji';
        emoji.dataset.type = randomType;
        emoji.style.cssText = `
            position: fixed;
            width: 60px;
            height: 60px;
            background-image: url('assets/textures/emojis/${randomType}.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            pointer-events: none;
            z-index: 999;
            top: -60px;
            left: ${Math.random() * (window.innerWidth - 60)}px;
            transform: translateY(0px) scale(1);
            transition: transform 0.1s ease-out;
        `;
        
        // Adicionar animação de queda
        emoji.style.animation = 'fall 3s linear forwards';
        
        document.body.appendChild(emoji);
        this.emojis.push(emoji);
        
        // Remover emoji após queda
        setTimeout(() => {
            if (emoji.parentNode) {
                emoji.parentNode.removeChild(emoji);
                this.emojis = this.emojis.filter(e => e !== emoji);
            }
        }, 3000);
        
        console.log(`🎯 Emoji ${randomType} spawnado em ${emoji.style.left}`);
    }

    startEmojiSpawning() {
        // Iniciar spawn de emojis
        this.emojiSpawnInterval = setInterval(() => {
            this.spawnEmoji();
        }, this.emojiSpawnRate);
        
        console.log('✅ Sistema de spawn de emojis iniciado');
    }

    stopEmojiSpawning() {
        // Parar spawn de emojis
        if (this.emojiSpawnInterval) {
            clearInterval(this.emojiSpawnInterval);
            this.emojiSpawnInterval = null;
            console.log('⏹️ Sistema de spawn de emojis parado');
        }
    }

    checkCollisions() {
        if (!this.vasoElement || !this.emojis.length) return;
        
        const vasoRect = this.vasoElement.getBoundingClientRect();
        
        this.emojis.forEach((emoji, index) => {
            if (!emoji.parentNode) return;
            
            const emojiRect = emoji.getBoundingClientRect();
            
            // Verificar colisão
            if (this.isColliding(vasoRect, emojiRect)) {
                // Capturar posição exata no momento da colisão
                const collisionX = emojiRect.left + emojiRect.width / 2;
                const collisionY = emojiRect.top + emojiRect.height / 2;
                this.collectEmoji(emoji, index, collisionX, collisionY);
            }
        });
    }

    isColliding(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                rect1.left > rect2.right || 
                rect1.bottom < rect2.top || 
                rect1.top > rect2.bottom);
    }

    collectEmoji(emoji, index, collisionX, collisionY) {
        // Aumentar pontuação
        this.score += 10;
        this.updateScore();
        
        // Criar efeito de escala na posição exata da colisão
        const emojiType = emoji.dataset.type || '01';
        this.createScaleEffect(collisionX, collisionY, emojiType);
        
        // Efeito de partículas explosivas na posição da colisão
        this.createCollectEffect(collisionX, collisionY);
        
        // Criar múltiplos fragmentos do emoji na posição da colisão
        this.createEmojiFragments(emoji, collisionX, collisionY);
        
        // Remover emoji imediatamente (sem animação no emoji original)
        if (emoji.parentNode) {
            emoji.parentNode.removeChild(emoji);
        }
        this.emojis = this.emojis.filter(e => e !== emoji);
        
        console.log(`🎉 Emoji coletado! Pontuação: ${this.score} em (${collisionX}, ${collisionY})`);
    }

    createCollectEffect(collisionX, collisionY) {
        // Criar múltiplos efeitos de explosão na posição exata da colisão
        for (let i = 0; i < 3; i++) {
            const effect = document.createElement('div');
            const delay = i * 0.1; // Delay escalonado
            
            effect.style.cssText = `
                position: fixed;
                top: ${collisionY}px;
                left: ${collisionX}px;
                width: ${60 + i * 20}px;
                height: ${60 + i * 20}px;
                background: radial-gradient(circle, 
                    ${i === 0 ? '#FFD700' : i === 1 ? '#FFA500' : '#FF6B6B'}, 
                    ${i === 0 ? '#FFA500' : i === 1 ? '#FF6B6B' : '#4ECDC4'}, 
                    transparent);
                border-radius: 50%;
                pointer-events: none;
                z-index: ${1000 - i};
                transform: translate(-50%, -50%) scale(0);
                animation: explode 0.8s ease-out ${delay}s forwards;
            `;
            
            document.body.appendChild(effect);
            
            // Remover efeito após animação
            setTimeout(() => {
                if (effect.parentNode) {
                    effect.parentNode.removeChild(effect);
                }
            }, 800 + (delay * 1000));
        }
    }

    createEmojiFragments(emoji, collisionX, collisionY) {
        // Criar 6 fragmentos que voam em direções diferentes da posição exata da colisão
        for (let i = 0; i < 6; i++) {
            const fragment = document.createElement('div');
            const angle = (i * 60) * (Math.PI / 180); // 60 graus entre cada fragmento
            const distance = 80 + Math.random() * 40; // Distância aleatória
            
            fragment.style.cssText = `
                position: fixed;
                top: ${collisionY}px;
                left: ${collisionX}px;
                width: 20px;
                height: 20px;
                background-image: ${emoji.style.backgroundImage};
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
                pointer-events: none;
                z-index: 1001;
                transform: translate(-50%, -50%) scale(0.3);
                opacity: 0.8;
            `;
            
            document.body.appendChild(fragment);
            
            // Animar fragmento voando para fora
            requestAnimationFrame(() => {
                fragment.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                fragment.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0.1)`;
                fragment.style.opacity = '0';
            });
            
            // Remover fragmento após animação
            setTimeout(() => {
                if (fragment.parentNode) {
                    fragment.parentNode.removeChild(fragment);
                }
            }, 800);
        }
    }

    updateScore() {
        if (this.scoreElement) {
            this.scoreElement.textContent = `🌱 ${this.score}`;
        }
    }

    async setupFaceTracking() {
        try {
            this.video = document.getElementById('video');

            console.log('Solicitando acesso à câmera...');

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });

            this.video.srcObject = stream;
            console.log('Stream da câmera configurado');

            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    console.log(`Vídeo carregado: ${this.video.videoWidth}x${this.video.videoHeight}`);
                    console.log(`Elemento vídeo visível: ${this.video.style.display !== 'none'}`);
                    console.log(`Vídeo playing: ${!this.video.paused}`);
                    this.video.play();

                    resolve();
                };
            });

        } catch (error) {
            console.error('❌ Erro ao configurar face tracking:', error);
        }
    }

    async loadModels() {
        const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

        console.log('🔄 Carregando modelos de IA...');

        try {
            if (typeof faceapi === 'undefined') {
                throw new Error('Face API não está disponível');
            }

            const modelLoadPromise = Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
            ]);

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout: modelos demoraram muito para carregar')), 30000);
            });

            await Promise.race([modelLoadPromise, timeoutPromise]);

            if (!faceapi.nets.tinyFaceDetector.isLoaded || !faceapi.nets.faceLandmark68Net.isLoaded) {
                throw new Error('Modelos não foram carregados completamente');
            }

            this.isModelLoaded = true;
            console.log('✅ Modelos carregados com sucesso!');
            console.log('🔍 Verificação dos modelos:');
            console.log('- TinyFaceDetector:', faceapi.nets.tinyFaceDetector.isLoaded);
            console.log('- FaceLandmark68Net:', faceapi.nets.faceLandmark68Net.isLoaded);
            
            this.hideLoadingOverlay();
            
        } catch (error) {
            console.error('❌ Erro ao carregar modelos:', error);
            this.isModelLoaded = false;
            this.showLoadingError(`Erro: ${error.message}`);
        }
    }
    
    hideLoadingOverlay() {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                if (this.loadingOverlay && this.loadingOverlay.parentNode) {
                    this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
                    this.loadingOverlay = null;
                }
            }, 500);
            console.log('✅ Overlay de carregamento escondido');
        }
    }
    
    showLoadingError(message) {
        if (this.loadingOverlay) {
            const loadingText = this.loadingOverlay.querySelector('div:nth-child(2)');
            if (loadingText) {
                loadingText.textContent = 'Erro ao carregar modelos';
                loadingText.style.color = '#FF6B6B';
            }
            
            const instructionText = this.loadingOverlay.querySelector('div:nth-child(3)');
            if (instructionText) {
                instructionText.textContent = message;
                instructionText.style.color = '#FF6B6B';
                instructionText.style.fontSize = '12px';
            }
            
            if (!this.loadingOverlay.querySelector('#retry-button')) {
                const retryButton = document.createElement('button');
                retryButton.id = 'retry-button';
                retryButton.textContent = 'Tentar Novamente';
                retryButton.style.cssText = `
                    background: #4ECDC4;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    font-family: 'Nunito', Arial, sans-serif;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 15px;
                    transition: background 0.3s ease;
                `;
                
                retryButton.addEventListener('mouseenter', () => {
                    retryButton.style.background = '#45B7AA';
                });
                
                retryButton.addEventListener('mouseleave', () => {
                    retryButton.style.background = '#4ECDC4';
                });
                
                retryButton.addEventListener('click', () => {
                    console.log('🔄 Tentando carregar modelos novamente...');
                    this.retryLoadModels();
                });
                
                this.loadingOverlay.appendChild(retryButton);
            }
        }
    }
    
    async retryLoadModels() {
        this.isModelLoaded = false;
        
        const retryButton = this.loadingOverlay.querySelector('#retry-button');
        if (retryButton) {
            retryButton.remove();
        }
        
        try {
            await this.loadModels();
        } catch (error) {
            console.error('❌ Falha na segunda tentativa:', error);
        }
    }

    setupCanvas() {
        this.canvas = document.getElementById('overlay');
        this.ctx = this.canvas.getContext('2d');

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        console.log(`Canvas configurado: ${this.canvas.width}x${this.canvas.height}`);
        console.log(`Video dimensões: ${this.video.videoWidth}x${this.video.videoHeight}`);

        const videoStyle = window.getComputedStyle(this.video);
        console.log(`Vídeo computed styles:`, {
            display: videoStyle.display,
            visibility: videoStyle.visibility,
            opacity: videoStyle.opacity,
            zIndex: videoStyle.zIndex,
            position: videoStyle.position
        });
    }

    startFaceDetection() {
        this.detectionActive = true;
        this.startDetection();
    }

    startDetection() {
        this.detectionActive = true;
        this.detectLoop();
    }

        async detectFaces() {
        if (!this.isModelLoaded) {
            console.log('Modelos ainda não carregados');
            return;
        }
        
        if (!this.video.videoWidth) {
            console.log('Vídeo ainda não tem dimensões válidas');
            return;
        }

        try {
            const options = new faceapi.TinyFaceDetectorOptions({
                inputSize: this.isMobile ? 160 : 224,
                scoreThreshold: this.isMobile ? 0.3 : 0.5
            });

            const detections = await faceapi
                .detectAllFaces(this.video, options)
                .withFaceLandmarks();

            if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }

            if (detections.length > 0) {
                if (!this.isMobile) {
                console.log(`${detections.length} rosto(s) detectado(s)`);
                }
                this.faceDetected = true;
                
                this.showFaceStatus('Rosto detectado', '#4ECDC4');
                
                this.fixVasoOnNose(detections[0].detection.box, detections[0].landmarks);
            } else {
                this.faceDetected = false;
                if (!this.isMobile) {
                console.log('Nenhum rosto detectado');
                }
                
                if (this.vasoElement) {
                    this.vasoElement.style.opacity = '0';
                }
                
                this.showFaceStatus('Rosto não detectado', '#FF6B6B');
            }
        } catch (error) {
            if (!this.isMobile) {
            console.error('Erro na detecção:', error);
            }
            
            this.showFaceStatus('Erro na detecção', '#FF6B6B');
        }
    }
    
    showFaceStatus(message, color) {
        if (!this.faceStatusOverlay) return;
        
        if (this.faceLostTimeout) {
            clearTimeout(this.faceLostTimeout);
        }
        
        if (color === '#4ECDC4') {
            this.faceStatusOverlay.style.opacity = '0';
            if (this.silhouetteOverlay) {
                this.silhouetteOverlay.style.opacity = '0';
            }
            return;
        }
        
        if (this.silhouetteOverlay) {
            this.silhouetteOverlay.style.opacity = '1';
        }
        
        this.faceStatusOverlay.textContent = message;
        this.faceStatusOverlay.style.background = `rgba(0, 0, 0, 0.8)`;
        this.faceStatusOverlay.style.border = `2px solid ${color}`;
        
        this.faceStatusOverlay.style.opacity = '1';
        
        this.faceLostTimeout = setTimeout(() => {
            this.faceStatusOverlay.style.opacity = '0';
        }, 2000);
    }

    fixVasoOnNose(faceBox, landmarks) {
        if (!this.vasoElement) return;
        
        const { x, y, width, height } = faceBox;
        
        if (landmarks && landmarks.positions) {
            const positions = landmarks.positions;
            
            const noseTip = positions[30];
            
            const scaleX = this.canvas.width / this.video.videoWidth;
            const scaleY = this.canvas.height / this.video.videoHeight;
            
            const noseX = (this.canvas.width - noseTip.x * scaleX);
            const noseY = noseTip.y * scaleY;
            
            this.positionVasoOnNose(noseX, noseY);
            
            console.log(`🌱 Vaso fixado no nariz: ${noseX.toFixed(0)}px, ${noseY.toFixed(0)}px`);
        } else {
            const scaleX = this.canvas.width / this.video.videoWidth;
            const scaleY = this.canvas.height / this.video.videoHeight;
            
            const centerX = (this.canvas.width - (x + width/2) * scaleX);
            const centerY = (y + height/2) * scaleY;
            
            this.positionVasoOnNose(centerX, centerY);
            console.log(`🌱 Vaso fixado no centro do rosto: ${centerX.toFixed(0)}px, ${centerY.toFixed(0)}px`);
        }
    }
    
    positionVasoOnNose(noseX, noseY) {
        if (!this.vasoElement) return;
        
        this.vasoElement.style.left = `${noseX}px`;
        this.vasoElement.style.top = `${noseY}px`;
        
        this.vasoElement.style.opacity = '1';
        
        this.vasoElement.style.animation = 'float 2s ease-in-out infinite';
        
        console.log(`🌱 Vaso posicionado no nariz: ${noseX}px, ${noseY}px`);
    }

    detectLoop() {
        if (this.detectionActive) {
            const now = Date.now();
            
            if (now - this.lastDetectionTime >= this.detectionInterval) {
                this.lastDetectionTime = now;
            this.detectFaces().then(() => {
                    // Verificar colisões com emojis
                    this.checkCollisions();
                    
                    if (this.isMobile) {
                        setTimeout(() => this.detectLoop(), this.detectionInterval);
                    } else {
                requestAnimationFrame(() => this.detectLoop());
                    }
                });
            } else {
                if (this.isMobile) {
                    setTimeout(() => this.detectLoop(), this.detectionInterval - (now - this.lastDetectionTime));
                } else {
                    requestAnimationFrame(() => this.detectLoop());
                }
            }
        }
    }
     
    handleEnter() {
        console.log('🌱 Entrou na tela do vaso no nariz');

        this.initAFrameScene();
        this.setupCanvas();
        this.createLoadingOverlay();
        this.createVasoElement();
        this.createScoreElement(); // Adicionado para criar o elemento de pontuação
        this.startEmojiSpawning(); // Adicionado para iniciar o spawn de emojis

        this.loadModels().then(() => {
            if (this.isModelLoaded) {
                this.startFaceDetection();
                console.log('✅ Face tracking iniciado');
            } else {
                console.error('❌ Falha ao carregar modelos de IA');
            }
        }).catch(error => {
            console.error('❌ Erro ao inicializar face tracking:', error);
        });

        setTimeout(() => {
            this.startGame();
        }, 1000);
    }
    
    handleExit() {
        console.log('👋 Saiu da tela do vaso no nariz');

        this.detectionActive = false;

        if (this.loadingOverlay && this.loadingOverlay.parentNode) {
            this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
            this.loadingOverlay = null;
        }
        
        if (this.faceStatusOverlay && this.faceStatusOverlay.parentNode) {
            this.faceStatusOverlay.parentNode.removeChild(this.faceStatusOverlay);
            this.faceStatusOverlay = null;
        }
        
        if (this.silhouetteOverlay && this.silhouetteOverlay.parentNode) {
            this.silhouetteOverlay.parentNode.removeChild(this.silhouetteOverlay);
            this.silhouetteOverlay = null;
        }

        if (this.faceLostTimeout) {
            clearTimeout(this.faceLostTimeout);
            this.faceLostTimeout = null;
        }

        this.clearScene();
        this.stopEmojiSpawning(); // Adicionado para parar o spawn de emojis
    }

    initAFrameScene() {
        setTimeout(() => {
            this.scene = document.getElementById('main-scene');
            this.camera = document.getElementById('main-camera');
            this.gameElements = document.getElementById('game-elements');

            console.log('🔍 Verificando elementos A-Frame:');
            console.log('- Scene:', this.scene);
            console.log('- Camera:', this.camera);
            console.log('- Game Elements:', this.gameElements);

            if (this.scene && this.gameElements) {
                console.log('✅ Cena A-Frame inicializada');
                console.log('📍 Posição inicial dos elementos:', this.gameElements.getAttribute('position'));
                
                this.gameElements.setAttribute('visible', false);
                console.log('🚫 Elementos 3D ocultados na inicialização');
            } else {
                console.error('❌ Elementos A-Frame não encontrados!');
            }
        }, 1000);
    }

    startGame() {
        console.log('🌱 Jogo do vaso no nariz iniciado');
        this.gameState = 'playing';
        console.log('✅ Jogo ativo - vaso será fixado no nariz');
    }

    clearScene() {
        if (this.gameElements) {
            while (this.gameElements.children.length > 0) {
                this.gameElements.removeChild(this.gameElements.children[0]);
            }
            this.gameElements.setAttribute('visible', false);
        }
        
        if (this.vasoElement && this.vasoElement.parentNode) {
            this.vasoElement.parentNode.removeChild(this.vasoElement);
            this.vasoElement = null;
        }
        
        // Limpar emojis
        this.emojis.forEach(emoji => {
            if (emoji.parentNode) {
                emoji.parentNode.removeChild(emoji);
            }
        });
        this.emojis = [];
        
        // Limpar elemento de pontuação
        if (this.scoreElement && this.scoreElement.parentNode) {
            this.scoreElement.parentNode.removeChild(this.scoreElement);
            this.scoreElement = null;
        }
        
        // Resetar pontuação
        this.score = 0;
    }

    createScaleEffect(collisionX, collisionY, emojiType) {
        // Criar elemento de escala que aparece exatamente na posição da colisão
        const scaleEffect = document.createElement('div');
        
        scaleEffect.style.cssText = `
            position: fixed;
            top: ${collisionY}px;
            left: ${collisionX}px;
            width: 60px;
            height: 60px;
            background-image: url('assets/textures/emojis/${emojiType}.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            pointer-events: none;
            z-index: 1002;
            transform: translate(-50%, -50%) scale(1);
            animation: collect 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        `;
        
        document.body.appendChild(scaleEffect);
        
        // Remover efeito de escala após animação
        setTimeout(() => {
            if (scaleEffect.parentNode) {
                scaleEffect.parentNode.removeChild(scaleEffect);
            }
        }, 800);
    }
}

// Exportar para uso global
window.GameScreen = GameScreen;