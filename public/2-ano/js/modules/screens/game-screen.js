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
        this.baseSpawnRate = 2000; // 2 segundos entre emojis (base)
        this.emojiSpawnRate = 2000; // Taxa atual de spawn
        this.score = 0;
        this.scoreElement = null;
        this.emojiTypes = ['01', '02', '03', '04', '05', '06', '07', '08'];

        // Sistema de regras do jogo
        this.gameData = null;
        this.correctEmojis = 0;
        this.incorrectEmojis = 0;
        this.gameTime = 60; // 60 segundos
        this.gameTimer = null;
        this.timerElement = null;
        this.plantLevel = 1;
        this.maxPlantLevel = 5;
        this.plantGrowthThreshold = 3; // Emojis corretos para crescer
        this.vasoTypes = ['vaso_1', 'vaso_2', 'vaso_3', 'vaso_4', 'vaso_5'];
        
        // Sistema de reações/combo
        this.currentReactionLevel = 3; // Começar no nível 3 (tranquilo)
        this.comboCount = 0;
        this.reactionElement = null;
        
        // Sistema de barra de progresso
        this.progressBar = null;
        this.progressFill = null;
        this.currentProgress = 50; // Começar na metade
        this.maxProgress = 100;
        this.minProgress = 0; // Progresso mínimo para não perder
        this.lastEmojiWasCorrect = false; // Controlar se o último emoji coletado foi correto
        
        // Injetar animações CSS para reações
        this.injectReactionAnimations();

        this.onInit();
    }
    
    async loadGameData() {
        try {
            const response = await fetch('assets/data/data.json');
            this.gameData = await response.json();
            console.log('✅ Dados do jogo carregados:', this.gameData);
        } catch (error) {
            console.error('❌ Erro ao carregar dados do jogo:', error);
            // Usar dados padrão se falhar
            this.gameData = {
                emojis: [
                    { id: "01", nome: "calma", url: "assets/textures/emojis/01.png", acerto: "sim" },
                    { id: "02", nome: "triste", url: "assets/textures/emojis/02.png", acerto: "nao" },
                    { id: "03", nome: "sorrindo", url: "assets/textures/emojis/03.png", acerto: "sim" },
                    { id: "04", nome: "angustia", url: "assets/textures/emojis/04.png", acerto: "nao" },
                    { id: "05", nome: "triste", url: "assets/textures/emojis/05.png", acerto: "nao" },
                    { id: "06", nome: "entediado", url: "assets/textures/emojis/06.png", acerto: "nao" },
                    { id: "07", nome: "alegre", url: "assets/textures/emojis/07.png", acerto: "sim" }
                ]
            };
        }
    }
    
    onInit() {
        this.loadGameData();
        this.setupFaceTracking();
        this.createFaceStatusOverlay();
        this.createSilhouetteOverlay();
        this.createTimerElement(); // Configurar contador existente
        this.initProgressBar(); // Inicializar barra de progresso
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
                
                @keyframes feedbackPop {
                    0% { 
                        transform: scale(0) rotate(0deg);
                        opacity: 0;
                    }
                    50% { 
                        transform: scale(1.2) rotate(10deg);
                        opacity: 1;
                    }
                    100% { 
                        transform: scale(1) rotate(0deg);
                        opacity: 1;
                    }
                }
                
                @keyframes growthPulse {
                    0% { 
                        transform: translate(-50%, -50%) scale(0);
                        opacity: 1;
                    }
                    50% { 
                        transform: translate(-50%, -50%) scale(1.5);
                        opacity: 0.8;
                    }
                    100% { 
                        transform: translate(-50%, -50%) scale(2);
                        opacity: 0;
                    }
                }
                
                @keyframes pulse {
                    0%, 100% { 
                        opacity: 1;
                        filter: brightness(1);
                    }
                    50% { 
                        opacity: 0.8;
                        filter: brightness(1.3);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(this.vasoElement);
        console.log('✅ Elemento do vaso criado');
    }

    /*
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
            box-shadow: 0 4px 15px rgba(78, 205, 196, 0.0);
        `;
        
        this.updateScore();
        document.body.appendChild(this.scoreElement);
        console.log('✅ Elemento de pontuação criado');
    }
    */

    spawnEmoji() {
        // Criar novo emoji baseado nos dados do JSON
        const emoji = document.createElement('div');
        const randomEmojiData = this.gameData.emojis[Math.floor(Math.random() * this.gameData.emojis.length)];
        
        emoji.className = 'emoji';
        emoji.dataset.type = randomEmojiData.id;
        emoji.dataset.acerto = randomEmojiData.acerto;
        emoji.dataset.nome = randomEmojiData.nome;
        
        emoji.style.cssText = `
            position: fixed;
            width: 60px;
            height: 60px;
            background-image: url('${randomEmojiData.url}');
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
            }
            this.emojis = this.emojis.filter(e => e !== emoji);
        }, 3000);
        
        console.log(`🎯 Emoji ${randomEmojiData.nome} (${randomEmojiData.acerto}) spawnado em ${emoji.style.left}`);
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
        // Verificar se o emoji é correto ou não
        const isCorrect = emoji.dataset.acerto === 'sim';
        const emojiType = emoji.dataset.type || '01';
        const emojiNome = emoji.dataset.nome || 'emoji';
        
        // Definir se o último emoji foi correto para a barra de progresso
        this.lastEmojiWasCorrect = isCorrect;
        
        // Tocar som de feedback
        if (isCorrect) {
            // Som de feedback positivo para acertos
            if (window.SoundManager) {
                window.SoundManager.playSound('feedback-positivo');
                console.log('🔊 Som de feedback positivo tocado');
            }
        } else {
            // Som de feedback negativo para erros
            if (window.SoundManager) {
                window.SoundManager.playSound('feedback-negativo');
                console.log('🔊 Som de feedback negativo tocado');
            }
        }
        
        // Atualizar contadores e sistema de combo
        if (isCorrect) {
            this.correctEmojis++;
            this.score += 20; // Mais pontos para emojis corretos
            this.comboCount++; // Aumentar combo
            console.log(`✅ Emoji correto coletado: ${emojiNome} - Combo: ${this.comboCount}`);
            
            // Atualizar reação baseada no combo
            this.updateReactionFromCombo();
            
            // Verificar se a planta deve crescer
            if (this.correctEmojis % this.plantGrowthThreshold === 0) {
                this.growPlant();
            }
        } else {
            this.incorrectEmojis++;
            this.score += 5; // Menos pontos para emojis incorretos
            this.comboCount = 0; // Resetar combo
            console.log(`❌ Emoji incorreto coletado: ${emojiNome} - Combo resetado`);
            
            // Ir para reação triste (nível 4)
            this.updateReaction(4);
        }
        
        // Atualizar barra de progresso (sempre chamar após definir lastEmojiWasCorrect)
        this.updateProgressBar();
        
        // Mostrar indicador visual
        this.showFeedbackIndicator(isCorrect);
        
        // Criar efeito de escala na posição exata da colisão
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

    updateReactionFromCombo() {
        let newLevel = 3; // Padrão: tranquilo (nível 3)
        
        if (this.comboCount >= 6) {
            // Combo muito alto: alegre (nível 1)
            newLevel = 1;
        } else if (this.comboCount >= 4) {
            // Combo alto: sorrindo (nível 2)
            newLevel = 2;
        } else if (this.comboCount >= 2) {
            // Combo médio: tranquilo (nível 3)
            newLevel = 3;
        }
        // Combo baixo (0-1): mantém tranquilo (nível 3)
        
        // Atualizar reação se o nível mudou
        if (newLevel !== this.currentReactionLevel) {
            this.updateReaction(newLevel);
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

    /*
    updateScore() {
        if (this.scoreElement) {
            this.scoreElement.textContent = `🌱 ${this.score}`;
        }
    }
    */

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
        // this.createScoreElement(); // Removido - contador de pontos não será exibido
        this.initReactionSystem();
        this.startEmojiSpawning(); // Adicionado para iniciar o spawn de emojis
        this.startGameTimer(); // Adicionado para iniciar o cronômetro

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

        this.animateGameElements();
    }

    animateGameElements() {
        const contadorTempo = document.getElementById('contador-tempo');
        const progressBar = document.getElementById('progress-bar');
        if (contadorTempo) {
            contadorTempo.style.opacity = '0';
            contadorTempo.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)' ;
            contadorTempo.style.transform = 'translate(-50%, -200%) scale(0.7)';

            setTimeout(() => {
                contadorTempo.style.opacity = '1';
                contadorTempo.style.transform = 'translate(-50%, 0%) scale(1)';
            }, 1000);
        }

        if (progressBar) {
            progressBar.style.opacity = '0';
            progressBar.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)' ;
            progressBar.style.transform = 'translateX(200%) scale(0.7)';

            setTimeout(() => {
                progressBar.style.opacity = '1';
                progressBar.style.transform = 'translateX(-50%) scale(1)';
            }, 1000);
        }
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
        
        // Elemento de pontuação não é mais criado
        // this.scoreElement = null;
        
        // Resetar contador de tempo existente
        if (this.timerElement) {
            this.timerElement.textContent = '00:00';
            this.timerElement = null;
        }
        
        // Resetar estilos do container do contador
        const timerContainer = document.getElementById('contador-tempo');
        if (timerContainer) {
            timerContainer.style.animation = '';
        }
        
        // Parar cronômetro
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        
        // Resetar variáveis do jogo
        this.score = 0;
        this.correctEmojis = 0;
        this.incorrectEmojis = 0;
        this.gameTime = 60;
        this.plantLevel = 1;
        
        // Resetar sistema de reações
        this.currentReactionLevel = 3;
        this.comboCount = 0;
        if (this.reactionElement) {
            this.reactionElement.style.animation = 'reaction-float 3s ease-in-out infinite';
            this.updateReaction(3); // Voltar para reação tranquila (nível 3)
        }
        
        // Resetar barra de progresso para 50%
        this.currentProgress = 50;
        this.lastEmojiWasCorrect = false;
        if (this.progressFill) {
            this.progressFill.style.width = '50%';
            this.progressFill.style.backgroundColor = '#FFD700'; // Dourado para progresso médio
        }
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

    createTimerElement() {
        // Usar o contador de tempo existente na tela
        this.timerElement = document.getElementById('contador-tempo-text-value');
        
        if (this.timerElement) {
            // Aplicar estilos ao contador existente
            this.timerElement.style.cssText = `
                color: white;
            font-family: 'Nunito', Arial, sans-serif;
                font-size: 18px;
                font-weight: 700;
            text-align: center;
            `;
            
            this.updateTimer();
            console.log('✅ Contador de tempo existente encontrado e configurado');
        } else {
            console.error('❌ Elemento contador-tempo-text-value não encontrado');
        }
    }

    startGameTimer() {
        this.gameTimer = setInterval(() => {
            this.gameTime--;
            this.updateTimer();
            
            if (this.gameTime <= 0) {
                this.gameOver(false); // Derrota por tempo
            }
        }, 1000);
        
        console.log('⏰ Cronômetro iniciado: 60 segundos');
    }

    updateTimer() {
        if (this.timerElement) {
            const minutes = Math.floor(this.gameTime / 60);
            const seconds = this.gameTime % 60;
            this.timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Ajustar taxa de spawn baseada no tempo restante
            this.adjustSpawnRate();
            
            // Aplicar estilos ao container pai (contador-tempo)
            const timerContainer = document.getElementById('contador-tempo');
            if (timerContainer) {
                // Mudar cor baseado no tempo restante
                if (this.gameTime <= 10) {
                    // Aplicar animação de pulso com escala mantendo posição original
                    timerContainer.style.animation = 'timer-pulse 1s infinite';
                } else {
                    // Remover animação quando não estiver nos últimos 10 segundos
                    timerContainer.style.animation = '';
                }
            }
        }
    }

    showFeedbackIndicator(isCorrect) {
        // Criar indicador visual (acerto.png ou erro.png)
        const indicator = document.createElement('div');
        const imagePath = isCorrect ? 'assets/textures/acerto.png' : 'assets/textures/erro.png';
        
        indicator.style.cssText = `
            position: fixed;
            top: 40px;
            left: 20px;
            width: 60px;
            height: 60px;
            background-image: url('${imagePath}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            border-radius: 15px;
            pointer-events: none;
            z-index: 9998;
            transform: scale(0);
            animation: feedbackPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        `;
        
        document.body.appendChild(indicator);
        
        // Remover indicador após animação
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 2000);
    }

    growPlant() {
        if (this.plantLevel < this.maxPlantLevel) {
            this.plantLevel++;
            console.log(`🌱 Planta cresceu para o nível ${this.plantLevel}!`);
            
            // Atualizar sprite do vaso
            this.updateVasoSprite();
            
            // Mostrar efeito de crescimento
            this.showGrowthEffect();
        }
    }

    updateVasoSprite() {
        if (this.vasoElement) {
            const newVasoType = this.vasoTypes[this.plantLevel - 1];
            this.vasoElement.style.backgroundImage = `url('assets/textures/vasos/${newVasoType}.png')`;
            console.log(`🔄 Vaso atualizado para: ${newVasoType}`);
        }
    }

    showGrowthEffect() {
        // Criar efeito de crescimento
        const growthEffect = document.createElement('div');
        growthEffect.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            width: 200px;
            height: 200px;
            background: radial-gradient(circle, #4ECDC4, #45B7AA, transparent);
            border-radius: 50%;
            pointer-events: none;
            z-index: 10000;
            transform: translate(-50%, -50%) scale(0);
            animation: growthPulse 1.5s ease-out forwards;
        `;
        
        document.body.appendChild(growthEffect);
        
        // Remover efeito após animação
        setTimeout(() => {
            if (growthEffect.parentNode) {
                growthEffect.parentNode.removeChild(growthEffect);
            }
        }, 1500);
    }

    gameOver(isVictory = false) {
        console.log(`🏁 Jogo finalizado! ${isVictory ? 'VITÓRIA!' : 'DERROTA!'}`);
        
        // Tocar som de vitória ou derrota
       /*  if (window.SoundManager) {
            if (isVictory) {
                window.SoundManager.playSound('feedback-positivo'); // Som positivo para vitória
                console.log('🔊 Som de vitória tocado');
            } else {
                window.SoundManager.playSound('feedback-negativo'); // Som negativo para derrota
                console.log('🔊 Som de derrota tocado');
            }
        } */
        
        // Parar cronômetro
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        
        // Parar spawn de emojis
        this.stopEmojiSpawning();
        
        // Navegar para a tela apropriada
        if (isVictory) {
            // Vitória: ir para tela final
            setTimeout(() => {
                if (window.screenManager) {
                    window.screenManager.showScreen('final');
                }
            }, 2000);
        } else {
            // Derrota: ir para tela de game over
            setTimeout(() => {
                if (window.screenManager) {
                    window.screenManager.showScreen('gameOver');
                }
            }, 2000);
        }
    }

    // Função removida - agora usa gameOver() com parâmetro de vitória/derrota

    adjustSpawnRate() {
        // Ajustar taxa de spawn baseada no tempo restante
        let newSpawnRate = this.baseSpawnRate;
        
        if (this.gameTime <= 10) {
            // Últimos 10 segundos: spawn muito rápido (0.5 segundos)
            newSpawnRate = 500;
        } else if (this.gameTime <= 20) {
            // 11-20 segundos: spawn rápido (1 segundo)
            newSpawnRate = 1000;
        } else if (this.gameTime <= 30) {
            // 21-30 segundos: spawn médio-rápido (1.5 segundos)
            newSpawnRate = 1500;
        } else if (this.gameTime <= 45) {
            // 31-45 segundos: spawn médio (1.8 segundos)
            newSpawnRate = 1800;
        }
        // 46-60 segundos: spawn normal (2 segundos)
        
        // Aplicar nova taxa de spawn se mudou
        if (newSpawnRate !== this.emojiSpawnRate) {
            this.emojiSpawnRate = newSpawnRate;
            this.restartEmojiSpawning();
            console.log(`🚀 Taxa de spawn ajustada para: ${newSpawnRate}ms (${this.gameTime}s restantes)`);
        }
    }

    restartEmojiSpawning() {
        // Parar spawn atual
        this.stopEmojiSpawning();
        
        // Iniciar spawn com nova taxa
        this.startEmojiSpawning();
    }

    initReactionSystem() {
        // Pegar o elemento de reação existente no HTML
        this.reactionElement = document.getElementById('reacao-image');
        
        if (this.reactionElement) {
            // Aplicar animações CSS mantendo posição original
            this.reactionElement.style.animation = 'reaction-float 3s ease-in-out infinite';
            
            // Definir reação inicial (nível 3 - tranquilo)
            this.updateReaction(3);
            console.log('😊 Sistema de reações inicializado');
        } else {
            console.warn('⚠️ Elemento de reação não encontrado');
        }
    }

    updateReaction(level) {
        if (!this.reactionElement || !this.gameData || !this.gameData.reacoes) return;
        
        // Encontrar a reação correspondente ao nível
        const reaction = this.gameData.reacoes.find(r => r.nivel === level.toString());
        
        if (reaction) {
            // Aplicar efeito de transição
            this.reactionElement.style.animation = 'reaction-pulse 0.5s ease-in-out';
            
            // Atualizar imagem após pequeno delay para o efeito
            setTimeout(() => {
                this.reactionElement.src = reaction.url;
                this.currentReactionLevel = level;
                
                // Restaurar animação flutuante mantendo posição original
                this.reactionElement.style.animation = 'reaction-float 3s ease-in-out infinite';
                
                // Mostrar texto flutuante com o nome da reação
                this.showReactionText(reaction.nome, level);
                
                console.log(`😊 Reação atualizada para: ${reaction.nome} (nível ${level})`);
            }, 250);
        }
    }

    injectReactionAnimations() {
            const style = document.createElement('style');
        style.id = 'reaction-animations';
            style.textContent = `
            @keyframes reaction-float {
                0% { transform: translate(-50%, -50%); opacity: 0.8; }
                50% { transform: translate(-50%, calc(-50% - 10px)); opacity: 1; }
                100% { transform: translate(-50%, -50%); opacity: 0.8; }
            }
            @keyframes reaction-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.8; }
            }
                        @keyframes reaction-text-float {
                0% { 
                        opacity: 0;
                    transform: translateX(-50%) translateY(0px) scale(0.8);
                    }
                20% { 
                        opacity: 1;
                    transform: translateX(-50%) translateY(-10px) scale(1.1);
                    }
                80% { 
                        opacity: 1;
                    transform: translateX(-50%) translateY(-30px) scale(1);
                    }
                100% { 
                        opacity: 0;
                    transform: translateX(-50%) translateY(-50px) scale(0.9);
                }
            }
            @keyframes timer-pulse {
                0%, 100% { 
                    transform: translate(-50%, 0%) scale(1);
                    opacity: 1;
                }
                50% { 
                    transform: translate(-50%, 0%) scale(1.1);
                    opacity: 0.9;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
    showReactionText(reactionName, level) {
        // Criar texto flutuante com o nome da reação
        const reactionText = document.createElement('div');
        
        // Definir cor baseada no nível
        let textColor = '#4ECDC4'; // Verde para reações positivas
        if (level === 4) {
            textColor = '#FF6B6B'; // Vermelho para triste
        }
        
        reactionText.style.cssText = `
            position: fixed;
            top: 70%;
            left: 50%;
            transform: translateX(-50%);
            color: ${textColor};
            font-family: 'Nunito', Arial, sans-serif;
            font-size: 24px;
            font-weight: 700;
            text-align: center;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            z-index: 10000;
            pointer-events: none;
            opacity: 0;
            animation: reaction-text-float 2s ease-out forwards;
        `;
        
        // Capitalizar primeira letra
        const capitalizedName = reactionName.charAt(0).toUpperCase() + reactionName.slice(1);
        reactionText.textContent = capitalizedName;
        
        document.body.appendChild(reactionText);
        
        // Remover texto após animação
        setTimeout(() => {
            if (reactionText.parentNode) {
                reactionText.parentNode.removeChild(reactionText);
            }
        }, 2000);
    }
    
    initProgressBar() {
        // Pegar elementos da barra de progresso
        this.progressBar = document.getElementById('progress-bar');
        this.progressFill = document.getElementById('progress-fill');
        
        if (this.progressBar && this.progressFill) {
            // Configurar estilos iniciais - começar na metade
            this.progressFill.style.width = '50%';
            this.progressFill.style.transition = 'width 0.5s ease-in-out';
            this.progressFill.style.backgroundColor = '#FFD700'; // Dourado para progresso médio
            
            console.log('✅ Barra de progresso inicializada em 50%');
        } else {
            console.warn('⚠️ Elementos da barra de progresso não encontrados');
        }
    }
    
    updateProgressBar() {
        if (!this.progressFill) return;
        
        // Calcular progresso baseado no combo e emojis corretos
        let progress = this.currentProgress; // Começar do progresso atual
        
        // Ajustar progresso baseado no resultado da coleta
        if (this.lastEmojiWasCorrect) {
            // Emoji correto: aumentar progresso
            progress += 4; // +10% por emoji correto (era 15%)
        } else {
            // Emoji incorreto: diminuir progresso
            progress -= 1; // -2% por emoji incorreto (era -20%)
        }
        
        // Limitar progresso entre 0% e 100%
        progress = Math.max(this.minProgress, Math.min(progress, this.maxProgress));
        
        // Atualizar barra de progresso
        this.progressFill.style.width = `${progress}%`;
        this.currentProgress = progress;
        
        // Mudar cor baseada no progresso
        if (progress >= 80) {
            this.progressFill.style.backgroundColor = '#4ECDC4'; // Verde para alto progresso
        } else if (progress >= 50) {
            this.progressFill.style.backgroundColor = '#FFD700'; // Dourado para médio progresso
        } else if (progress >= 25) {
            this.progressFill.style.backgroundColor = '#FFA500'; // Laranja para baixo progresso
        } else {
            this.progressFill.style.backgroundColor = '#FF6B6B'; // Vermelho para muito baixo progresso
        }
        
        console.log(`📊 Progresso atualizado: ${progress}% (Último emoji: ${this.lastEmojiWasCorrect ? 'correto' : 'incorreto'})`);
        
        // Verificar condições de vitória/derrota
        this.checkGameEndConditions();
    }
    
    checkGameEndConditions() {
        // Verificar vitória (100%)
        if (this.currentProgress >= 100) {
            console.log('🏆 VITÓRIA! Barra de progresso completada!');
            this.gameOver(true); // true = vitória
            return;
        }
        
        // Verificar derrota (0%)
        if (this.currentProgress <= 0) {
            console.log('💀 DERROTA! Barra de progresso zerada!');
            this.gameOver(false); // false = derrota
            return;
        }
    }
}

// Exportar para uso global
window.GameScreen = GameScreen;