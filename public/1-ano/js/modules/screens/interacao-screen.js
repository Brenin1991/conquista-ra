/**
 * Interacao Screen - Tela de Detecção de Rotação da Cabeça
 * Sistema de face tracking para detectar rotação da cabeça
 */

class InteracaoScreen extends BaseScreen {
    constructor() {
        console.log('🏗️ Criando InteracaoScreen...');
        super('interacao', { 
            next: 'final',
            onEnter: () => this.handleEnter(),
            onExit: () => this.handleExit()
        });
        
        console.log('✅ InteracaoScreen criada com sucesso!');
        console.log('📍 Elemento da tela:', this.element);
        
        // Estado do jogo
        this.gameState = 'waiting'; // waiting, dialog, instruction, detecting, completed
        this.currentInstruction = null;
        this.instructions = [];
        this.currentInstructionIndex = 0;
        this.instructionTimeout = null;
        
        // Tipo de interação
        this.tipoInteracao = 'mover-cabeca'; // mover-cabeca, detectar-sorriso, detectar-olho
        
        // Sistema de diálogo de missão
        this.missaoDialogos = [];
        this.currentDialogIndex = 0;
        this.isDialogActive = false;

        // Face tracking
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.isModelLoaded = false;
        this.detectionActive = false;
        this.faceDetected = false;
        
        // Detecção de rotação da cabeça
        this.headPosition = { x: 0, y: 0, z: 0 };
        this.headThreshold = 0.15;
        this.lastDetectionTime = 0;
        this.detectionInterval = 100; // 10fps
        
        // Sistema de feedback
        this.isShowingFeedback = false;
        
        // Elementos da interface
        this.feedbackElement = null;
        
        // Overlays
        this.loadingOverlay = null;
        this.faceStatusOverlay = null;
        this.silhouetteOverlay = null;
        this.faceLostTimeout = null;

        this.onInit();
    }
    
    async loadMissaoDialogos() {
        try {
            // Obter a fase atual do window.selectedFase
            if (window.selectedFase && window.selectedFase['missao-dialogo']) {
                this.missaoDialogos = window.selectedFase['missao-dialogo'];
                console.log('📚 Diálogos de missão carregados:', this.missaoDialogos);
            } else {
                console.warn('⚠️ Nenhum diálogo de missão encontrado');
            }
            
            // Configurar tipo de interação
            this.setupTipoInteracao();
            
            // Retornar Promise resolvida para manter compatibilidade
            return Promise.resolve();
        } catch (error) {
            console.error('❌ Erro ao carregar diálogos de missão:', error);
            return Promise.reject(error);
        }
    }
    
    setupTipoInteracao() {
        // Obter tipo de interação do JSON da fase
        if (window.selectedFase && window.selectedFase['tipo-interacao']) {
            this.tipoInteracao = window.selectedFase['tipo-interacao'];
            console.log(`🎯 Tipo de interação configurado: ${this.tipoInteracao}`);
        }
        
        // Configurar instruções baseado no tipo
        switch (this.tipoInteracao) {
            case 'mover-cabeca':
                this.instructions = [
                    { direction: 'right', text: 'Vire a cabeça para a DIREITA', threshold: 0.3, type: 'head-rotation' },
                    { direction: 'left', text: 'Vire a cabeça para a ESQUERDA', threshold: 0.3, type: 'head-rotation' },
                    { direction: 'center', text: 'Olhe para o CENTRO', threshold: 0.15, type: 'head-rotation' }
                ];
                break;
                
            case 'detectar-sorriso':
                this.instructions = [
                    { action: 'smile', text: 'Sorria para a câmera! 😊', threshold: 0.6, type: 'smile-detection' },
                    { action: 'neutral', text: 'Mantenha uma expressão neutra 😐', threshold: 0.3, type: 'smile-detection' },
                    { action: 'smile-again', text: 'Sorria novamente! 😊', threshold: 0.6, type: 'smile-detection' }
                ];
                break;
                
            case 'detectar-olho':
                this.instructions = [
                    { action: 'close-eyes', text: 'Feche os olhos! 😴', threshold: 0.7, type: 'eye-detection' },
                    { action: 'open-eyes', text: 'Abra os olhos! 👀', threshold: 0.3, type: 'eye-detection' },
                    { action: 'close-again', text: 'Feche os olhos novamente! 😴', threshold: 0.7, type: 'eye-detection' }
                ];
                break;
                
            default:
                console.warn(`⚠️ Tipo de interação desconhecido: ${this.tipoInteracao}, usando mover-cabeca como padrão`);
                this.tipoInteracao = 'mover-cabeca';
                this.instructions = [
                    { direction: 'right', text: 'Vire a cabeça para a DIREITA', threshold: 0.3, type: 'head-rotation' },
                    { direction: 'left', text: 'Vire a cabeça para a ESQUERDA', threshold: 0.3, type: 'head-rotation' },
                    { direction: 'center', text: 'Olhe para o CENTRO', threshold: 0.15, type: 'head-rotation' }
                ];
        }
        
        console.log(`📋 Instruções configuradas para ${this.tipoInteracao}:`, this.instructions);
    }
    
    onInit() {
        console.log('🔧 InteracaoScreen.onInit() chamado');
        // Configurações específicas da tela de interação
        // Face tracking será iniciado apenas quando entrar na tela
    }
    
    async setupFaceTracking() {
        try {
            this.video = document.getElementById('video-interacao');
            
            if (!this.video) {
                throw new Error('Elemento video-interacao não encontrado');
            }
            
            console.log(`🎥 Solicitando acesso à câmera para ${this.tipoInteracao}...`);
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });
            
            console.log(`✅ Stream da câmera obtido para ${this.tipoInteracao}, configurando vídeo...`);
            
            this.video.srcObject = stream;
            console.log(`✅ Stream da câmera configurado para ${this.tipoInteracao}`);
            
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    console.log(`📹 Vídeo carregado: ${this.video.videoWidth}x${this.video.videoHeight}`);
                    this.video.play().then(() => {
                        console.log(`✅ Vídeo reproduzindo com sucesso para ${this.tipoInteracao}`);
                        resolve();
                    }).catch(error => {
                        console.error('❌ Erro ao reproduzir vídeo:', error);
                        resolve(); // Resolver mesmo com erro para continuar
                    });
                };
            });
            
        } catch (error) {
            console.error('❌ Erro ao configurar face tracking:', error);
            throw error; // Re-throw para ser capturado pelo caller
        }
    }
    
    createOverlays() {
        // Overlay de carregamento
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.id = 'loading-overlay-interacao';
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
        
        const loadingText = document.createElement('div');
        loadingText.textContent = 'Carregando modelos de IA...';
        loadingText.style.cssText = `
            color: white;
            font-family: 'Nunito', Arial, sans-serif;
            font-size: 18px;
            font-weight: 600;
            margin-top: 20px;
            text-align: center;
        `;
        
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 60px;
            height: 60px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid #4ECDC4;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;
        
        this.loadingOverlay.appendChild(spinner);
        this.loadingOverlay.appendChild(loadingText);
        document.body.appendChild(this.loadingOverlay);
        
        // Overlay de status do rosto
        this.faceStatusOverlay = document.createElement('div');
        this.faceStatusOverlay.id = 'face-status-overlay-interacao';
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
    
        // Overlay da silhueta
        this.silhouetteOverlay = document.createElement('div');
        this.silhouetteOverlay.id = 'silhouette-overlay-interacao';
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
        
        // Adicionar CSS para animações
        if (!document.getElementById('interacao-animations')) {
            const style = document.createElement('style');
            style.id = 'interacao-animations';
            style.textContent = `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                @keyframes instruction-pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                
                @keyframes feedback-pop {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                
                @keyframes dialog-fade-in {
                    from { 
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                @keyframes button-bounce {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        console.log(`✅ Overlays criados para ${this.tipoInteracao}`);
    }
    
    createMissaoDialog() {
        if (this.missaoDialogos.length === 0) {
            console.log('⚠️ Nenhum diálogo para mostrar, iniciando jogo diretamente');
            this.startGame();
            return;
        }
        
        console.log('📚 Criando diálogo de missão...');
        
        // Container principal do diálogo
        const dialogContainer = document.createElement('div');
        dialogContainer.id = 'missao-dialog-container';
        dialogContainer.className = 'missao-dialog-container';
        
        // Botão de narração
        const narracaoButton = document.createElement('img');
        narracaoButton.id = 'narracao-missao';
        narracaoButton.className = 'narracao-icon';
        narracaoButton.src = 'assets/textures/narracao-icon.png';
        narracaoButton.alt = 'Narração';
        
        // Adicionar evento de clique para narração
        narracaoButton.addEventListener('click', () => {
            window.SoundManager.forceAudioActivation();
            window.SoundManager.playSoundWithControl('NA001');
        });
        
        // Indicador de progresso dos diálogos
        const progressIndicator = document.createElement('div');
        progressIndicator.id = 'missao-dialog-progress';
        progressIndicator.className = 'missao-dialog-progress';
        
        // Criar pontos de progresso
        for (let i = 0; i < this.missaoDialogos.length; i++) {
            const progressDot = document.createElement('div');
            progressDot.className = 'progress-dot';
            progressIndicator.appendChild(progressDot);
        }
        
        // Container dos botões
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'missao-dialog-buttons';
        
        // Botão Voltar
        const backButton = document.createElement('button');
        backButton.id = 'missao-dialog-back';
        backButton.className = 'btn-voltar';
        
        // Botão Avançar
        const nextButton = document.createElement('button');
        nextButton.id = 'missao-dialog-next';
        nextButton.className = 'btn-proximo';
        
        // Adicionar eventos de clique
        backButton.addEventListener('click', () => this.previousDialog());
        nextButton.addEventListener('click', () => this.nextDialog());
        
        // Adicionar elementos ao container
        buttonsContainer.appendChild(backButton);
        buttonsContainer.appendChild(nextButton);
        dialogContainer.appendChild(narracaoButton);
        dialogContainer.appendChild(progressIndicator);
        dialogContainer.appendChild(buttonsContainer);
        
        // Adicionar ao body
        document.body.appendChild(dialogContainer);
        
        // Mostrar primeiro diálogo
        this.showCurrentDialog();
        
        // Aplicar animação de entrada igual ao enunciado
        dialogContainer.style.opacity = '0';
        dialogContainer.style.transform = 'translate(-50%, -300%) scale(0.7)';
        dialogContainer.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        
        // Animar entrada com delay
        setTimeout(() => {
            dialogContainer.style.opacity = '1';
            dialogContainer.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 200);
        
        this.isDialogActive = true;
        console.log('✅ Diálogo de missão criado');
    }
    
    showCurrentDialog() {
        if (this.currentDialogIndex >= this.missaoDialogos.length) {
            console.log('✅ Todos os diálogos mostrados, iniciando jogo');
            this.closeMissaoDialog();
            this.startGame();
            return;
        }
        
        const currentDialog = this.missaoDialogos[this.currentDialogIndex];
        const dialogContainer = document.getElementById('missao-dialog-container');
        const backButton = document.getElementById('missao-dialog-back');
        const nextButton = document.getElementById('missao-dialog-next');
        
        if (dialogContainer) {
            dialogContainer.style.backgroundImage = `url(${currentDialog.url})`;
            console.log(`📚 Mostrando diálogo ${this.currentDialogIndex + 1}/${this.missaoDialogos.length}: ${currentDialog.url}`);
        }
        
        // Atualizar indicador de progresso
        this.updateProgressIndicator();
        
        // Configurar botões baseado na posição
        if (backButton) {
            if (this.currentDialogIndex === 0) {
                backButton.className = 'btn-voltar btn-voltar-disable';
            } else {
                backButton.className = 'btn-voltar';
            }
        }
        
        if (nextButton) {
            if (this.currentDialogIndex === this.missaoDialogos.length - 1) {
                nextButton.textContent = '';
            } else {
                nextButton.textContent = '';
            }
        }
    }
    
    updateProgressIndicator() {
        const progressDots = document.querySelectorAll('.progress-dot');
        progressDots.forEach((dot, index) => {
            if (index <= this.currentDialogIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    
    nextDialog() {
        if (this.currentDialogIndex < this.missaoDialogos.length - 1) {
            this.currentDialogIndex++;
            this.showCurrentDialog();
        } else {
            // Último diálogo - fechar e iniciar face tracking
            console.log('🎮 Último diálogo, iniciando face tracking...');
            this.closeMissaoDialog();
            this.initializeFaceTracking();
        }
    }
    
    previousDialog() {
        if (this.currentDialogIndex > 0) {
            this.currentDialogIndex--;
            this.showCurrentDialog();
        }
    }
    
    closeMissaoDialog() {
        const dialogContainer = document.getElementById('missao-dialog-container');
        if (dialogContainer) {
            dialogContainer.style.opacity = '0';
            setTimeout(() => {
                if (dialogContainer.parentNode) {
                    dialogContainer.parentNode.removeChild(dialogContainer);
                }
            }, 500);
        }
        
        this.isDialogActive = false;
        console.log('✅ Diálogo de missão fechado');
    }

    async loadModels() {
        const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

        console.log('🔄 Carregando modelos de IA...');

        try {
            if (typeof faceapi === 'undefined') {
                throw new Error('Face API não está disponível');
            }

            // Carregar modelos baseado no tipo de interação
            let modelLoadPromise;
            if (this.tipoInteracao === 'detectar-sorriso') {
                // Para detecção de sorriso, precisamos do faceExpressionNet
                modelLoadPromise = Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ]);
            } else {
                // Para outros tipos, apenas os modelos básicos
                modelLoadPromise = Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
                ]);
            }

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout: modelos demoraram muito para carregar')), 30000);
            });

            await Promise.race([modelLoadPromise, timeoutPromise]);

            // Verificar se os modelos necessários foram carregados
            let modelsLoaded = faceapi.nets.tinyFaceDetector.isLoaded && faceapi.nets.faceLandmark68Net.isLoaded;
            if (this.tipoInteracao === 'detectar-sorriso') {
                modelsLoaded = modelsLoaded && faceapi.nets.faceExpressionNet.isLoaded;
            }

            if (!modelsLoaded) {
                throw new Error('Modelos não foram carregados completamente');
            }

            this.isModelLoaded = true;
            console.log(`✅ Modelos carregados com sucesso para ${this.tipoInteracao}!`);
            
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
            console.log(`✅ Overlay de carregamento para ${this.tipoInteracao} escondido`);
        }
    }
    
    showLoadingError(message) {
        if (this.loadingOverlay) {
            const loadingText = this.loadingOverlay.querySelector('div:nth-child(2)');
            if (loadingText) {
                loadingText.textContent = 'Erro ao carregar modelos';
                loadingText.style.color = '#FF6B6B';
            }
        }
    }

    setupCanvas() {
        this.canvas = document.getElementById('overlay-interacao');
        
        if (!this.canvas) {
            console.error('❌ Elemento overlay-interacao não encontrado');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        console.log(`🎨 Canvas configurado para ${this.tipoInteracao}: ${this.canvas.width}x${this.canvas.height}`);
    }

    startFaceDetection() {
        console.log(`🎯 Iniciando detecção de faces para ${this.tipoInteracao}...`);
        this.detectionActive = true;
        this.startDetection();
    }

    startDetection() {
        console.log(`🎯 Iniciando loop de detecção para ${this.tipoInteracao}...`);
        this.detectionActive = true;
        this.detectLoop();
    }

        async detectFaces() {
        if (!this.isModelLoaded) {
            console.log('⚠️ Modelos não carregados ainda');
            return;
        }
        
        if (!this.video || !this.video.videoWidth) {
            console.log('⚠️ Vídeo não está pronto ainda');
            return;
        }

        try {
            const options = new faceapi.TinyFaceDetectorOptions({
                inputSize: 224,
                scoreThreshold: 0.5
            });

            // Detectar faces com landmarks e expressões se necessário
            let detections;
            if (this.tipoInteracao === 'detectar-sorriso') {
                detections = await faceapi
                    .detectAllFaces(this.video, options)
                    .withFaceLandmarks()
                    .withFaceExpressions();
            } else {
                detections = await faceapi
                    .detectAllFaces(this.video, options)
                    .withFaceLandmarks();
            }

            if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }

            if (detections.length > 0) {
                this.faceDetected = true;
                this.showFaceStatus('Rosto detectado', '#4ECDC4');
                
                // Processar baseado no tipo de interação
                this.processHeadMovement(detections[0]);
            } else {
                this.faceDetected = false;
                this.showFaceStatus('Rosto não detectado', '#FF6B6B');
            }
        } catch (error) {
            console.error('❌ Erro na detecção:', error);
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

    processHeadMovement(detection) {
        // Processar baseado no tipo de interação
        switch (this.tipoInteracao) {
            case 'mover-cabeca':
                this.processHeadRotation(detection.landmarks);
                break;
            case 'detectar-sorriso':
                this.processSmileDetection(detection);
                break;
            case 'detectar-olho':
                this.processEyeDetection(detection.landmarks);
                break;
            default:
                this.processHeadRotation(detection.landmarks);
        }
    }
    
    processHeadRotation(landmarks) {
        // Calcular ROTAÇÃO da cabeça (olhando para esquerda/direita)
        const leftEye = landmarks.getLeftEye()[0];
        const rightEye = landmarks.getRightEye()[3];
        const nose = landmarks.getNose()[3];
        
        // Calcular ângulo de rotação baseado na posição dos olhos
        const eyeDistance = Math.abs(rightEye.x - leftEye.x);
        const eyeCenter = (leftEye.x + rightEye.x) / 2;
        const noseOffset = nose.x - eyeCenter;
        
        // Normalizar rotação (-1 a 1)
        const rotationX = noseOffset / (eyeDistance * 0.5);
        const normalizedRotation = Math.max(-1, Math.min(1, rotationX));
        
        this.headPosition.x = normalizedRotation;
        
        console.log(`🔄 ROTAÇÃO da cabeça: ${normalizedRotation.toFixed(3)}`);
        
        // Verificar se está seguindo a instrução atual
        this.checkInstruction(normalizedRotation);
    }
    
    processSmileDetection(detection) {
        // Usar faceExpressionNet para detectar sorriso (como no sorriso.js)
        console.log('🔍 Processando detecção de sorriso...');
        console.log('📦 Objeto de detecção:', detection);
        
        if (detection.expressions) {
            const expressions = detection.expressions;
            console.log('😊 Expressões disponíveis:', expressions);
            
            // Obter confiança do sorriso (happy)
            const smileConfidence = expressions.happy || 0;
            const neutralConfidence = expressions.neutral || 0;
            
            // Normalizar para 0-1 (0 = neutro, 1 = sorriso)
            const normalizedSmile = Math.max(0, Math.min(1, smileConfidence));
            
            this.headPosition.x = normalizedSmile;
            
            console.log(`😊 SORRISO detectado: ${normalizedSmile.toFixed(3)}`);
            console.log(`📊 Expressões: happy=${smileConfidence.toFixed(3)}, neutral=${neutralConfidence.toFixed(3)}`);
            
            // Verificar se está seguindo a instrução atual
            this.checkInstruction(normalizedSmile);
        } else {
            console.warn('⚠️ Expressões faciais não disponíveis para detecção de sorriso');
            console.log('🔍 Estrutura da detecção:', Object.keys(detection));
            
            // Fallback: tentar usar landmarks para detecção básica
            if (detection.landmarks) {
                console.log('🔄 Usando fallback com landmarks...');
                this.processSmileFallback(detection.landmarks);
            }
        }
    }
    
    processSmileFallback(landmarks) {
        // Fallback usando landmarks da boca (menos preciso)
        try {
            const mouth = landmarks.getMouth();
            console.log('👄 Landmarks da boca:', mouth);
            
            if (mouth && mouth.length >= 15) {
                const upperLip = mouth[13]; // Lábio superior
                const lowerLip = mouth[14]; // Lábio inferior
                
                // Calcular altura da boca (sorriso = boca mais alta)
                const mouthHeight = Math.abs(upperLip.y - lowerLip.y);
                const mouthWidth = Math.abs(mouth[0].x - mouth[6].x);
                
                // Normalizar sorriso (0 a 1)
                const smileRatio = mouthHeight / mouthWidth;
                const normalizedSmile = Math.max(0, Math.min(1, smileRatio * 2));
                
                this.headPosition.x = normalizedSmile;
                
                console.log(`😊 SORRISO (fallback): ${normalizedSmile.toFixed(3)}`);
                console.log(`📏 Dimensões da boca: altura=${mouthHeight.toFixed(3)}, largura=${mouthWidth.toFixed(3)}`);
                
                // Verificar se está seguindo a instrução atual
                this.checkInstruction(normalizedSmile);
            }
        } catch (error) {
            console.error('❌ Erro no fallback de sorriso:', error);
        }
    }
    
    processEyeDetection(landmarks) {
        // Calcular abertura dos olhos
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        
        // Calcular altura dos olhos (olhos fechados = altura menor)
        const leftEyeHeight = Math.abs(leftEye[1].y - leftEye[5].y);
        const rightEyeHeight = Math.abs(rightEye[1].y - rightEye[5].y);
        
        // Calcular largura dos olhos
        const leftEyeWidth = Math.abs(leftEye[0].x - leftEye[3].x);
        const rightEyeWidth = Math.abs(rightEye[0].x - rightEye[3].x);
        
        // Normalizar abertura dos olhos (0 = fechado, 1 = aberto)
        const leftEyeRatio = leftEyeHeight / leftEyeWidth;
        const rightEyeRatio = rightEyeHeight / rightEyeWidth;
        const averageEyeRatio = (leftEyeRatio + rightEyeRatio) / 2;
        
        // Normalizar para 0-1
        const normalizedEyeOpen = Math.max(0, Math.min(1, averageEyeRatio * 3));
        
        this.headPosition.x = normalizedEyeOpen;
        
        console.log(`👀 OLHOS: ${normalizedEyeOpen.toFixed(3)} (0=fechado, 1=aberto)`);
        
        // Verificar se está seguindo a instrução atual
        this.checkInstruction(normalizedEyeOpen);
    }
    
    checkInstruction(value) {
        if (this.gameState !== 'detecting') {
            console.log(`⚠️ Game state não é 'detecting': ${this.gameState}`);
            return;
        }
        
        const instruction = this.instructions[this.currentInstructionIndex];
        if (!instruction) {
            console.error('❌ Nenhuma instrução encontrada para o índice:', this.currentInstructionIndex);
            return;
        }
        
        console.log(`🎯 Verificando instrução:`, instruction);
        console.log(`📊 Valor atual: ${value.toFixed(3)}`);
        
        let isCorrect = false;
        
        switch (instruction.type) {
            case 'head-rotation':
                // Verificação de rotação da cabeça
                switch (instruction.direction) {
                    case 'right':
                        isCorrect = value > instruction.threshold;
                        console.log(`🔄 Verificando direita: ${value.toFixed(3)} > ${instruction.threshold} = ${isCorrect}`);
                        break;
                    case 'left':
                        isCorrect = value < -instruction.threshold;
                        console.log(`🔄 Verificando esquerda: ${value.toFixed(3)} < -${instruction.threshold} = ${isCorrect}`);
                        break;
                    case 'center':
                        isCorrect = Math.abs(value) < instruction.threshold;
                        console.log(`🔄 Verificando centro: |${value.toFixed(3)}| < ${instruction.threshold} = ${isCorrect}`);
                        break;
                }
                break;
                
            case 'smile-detection':
                // Verificação de sorriso
                switch (instruction.action) {
                    case 'smile':
                    case 'smile-again':
                        // Para sorriso, valor deve ser maior que o threshold (ex: > 0.6)
                        isCorrect = value > instruction.threshold;
                        console.log(`😊 Verificando sorriso: ${value.toFixed(3)} > ${instruction.threshold} = ${isCorrect}`);
                        break;
                    case 'neutral':
                        // Para neutro, valor deve ser menor que o threshold (ex: < 0.3)
                        isCorrect = value < instruction.threshold;
                        console.log(`😐 Verificando neutro: ${value.toFixed(3)} < ${instruction.threshold} = ${isCorrect}`);
                        break;
                }
                break;
                
            case 'eye-detection':
                // Verificação de olhos
                switch (instruction.action) {
                    case 'close-eyes':
                    case 'close-again':
                        // Para olhos fechados, valor deve ser menor que o threshold (ex: < 0.7)
                        isCorrect = value < instruction.threshold;
                        console.log(`😴 Verificando olhos fechados: ${value.toFixed(3)} < ${instruction.threshold} = ${isCorrect}`);
                        break;
                    case 'open-eyes':
                        // Para olhos abertos, valor deve ser maior que o threshold (ex: > 0.3)
                        isCorrect = value > instruction.threshold;
                        console.log(`👀 Verificando olhos abertos: ${value.toFixed(3)} > ${instruction.threshold} = ${isCorrect}`);
                        break;
                }
                break;
        }
        
        console.log(`✅ Resultado da verificação: ${isCorrect ? 'CORRETO' : 'INCORRETO'}`);
        
        if (isCorrect) {
            console.log(`🎉 Instrução correta! Chamando instructionCompleted...`);
            this.instructionCompleted();
        }
    }
    
    instructionCompleted() {
        const instruction = this.instructions[this.currentInstructionIndex];
        let instructionText = '';
        
        // Obter texto da instrução baseado no tipo
        switch (instruction.type) {
            case 'head-rotation':
                instructionText = instruction.direction;
                break;
            case 'smile-detection':
            case 'eye-detection':
                instructionText = instruction.action;
                break;
            default:
                instructionText = 'instrução';
        }
        
        console.log(`✅ Instrução completada: ${instructionText}`);
        
        // Mostrar feedback de acerto
        this.showFeedback(true);
        
        // Avançar para próxima instrução
        this.currentInstructionIndex++;
        
        if (this.currentInstructionIndex >= this.instructions.length) {
            // Todas as instruções completadas
            this.gameCompleted();
        } else {
            // Mostrar próxima instrução
            setTimeout(() => {
                this.showNextInstruction();
            }, 1500);
        }
    }
    
    showNextInstruction() {
        const instruction = this.instructions[this.currentInstructionIndex];
        this.currentInstruction = instruction;
        
        // Atualizar ícone para mover cabeça
        if (this.tipoInteracao === 'mover-cabeca' && instruction.type === 'head-rotation') {
            this.updateMoverCabecaIcon(instruction.direction);
        }
        
        this.gameState = 'detecting';
        console.log(`🎯 Nova instrução: ${instruction.text}`);
    }
    
    updateMoverCabecaIcon(direction) {
        const moverCabecaIcon = document.getElementById('mover-cabeca-icon');
        if (moverCabecaIcon) {
            let iconPath = '';
            switch (direction) {
                case 'right':
                    iconPath = 'assets/textures/interacoes/mover-cabeca/direita.png';
                    break;
                case 'left':
                    iconPath = 'assets/textures/interacoes/mover-cabeca/esquerda.png';
                    break;
                case 'center':
                    iconPath = 'assets/textures/interacoes/mover-cabeca/centro.png';
                    break;
                default:
                    iconPath = 'assets/textures/interacoes/mover-cabeca/centro.png';
            }
            
            moverCabecaIcon.src = iconPath;
            console.log(`🔄 Ícone atualizado para: ${direction} (${iconPath})`);
        }
    }
    
    showFeedback(isCorrect) {
        if (this.isShowingFeedback) return;
        
        this.isShowingFeedback = true;
        
        const feedbackElement = document.createElement('div');
        feedbackElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100px;
            height: 100px;
            background-image: url('${isCorrect ? 'assets/textures/acerto.png' : 'assets/textures/erro.png'}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            z-index: 10000;
            opacity: 0;
            animation: feedback-pop 0.6s ease-out forwards;
        `;
        
        document.body.appendChild(feedbackElement);
        
        // Tocar som de feedback
        if (window.SoundManager) {
            window.SoundManager.playSound(isCorrect ? 'feedback-positivo' : 'feedback-negativo');
        }
        
        // Remover feedback após animação
        setTimeout(() => {
            if (feedbackElement.parentNode) {
                feedbackElement.parentNode.removeChild(feedbackElement);
            }
            this.isShowingFeedback = false;
        }, 600);
    }
    
    gameCompleted() {
        console.log(`🎉 Jogo de ${this.tipoInteracao} completado!`);
        
        this.gameState = 'completed';
        
        // Mostrar mensagem de conclusão baseada no tipo
        let completionMessage = '';
        switch (this.tipoInteracao) {
            case 'mover-cabeca':
                completionMessage = '🎉 Parabéns! Você completou todas as instruções de rotação da cabeça!';
                break;
            case 'detectar-sorriso':
                completionMessage = '🎉 Parabéns! Você completou todas as instruções de detecção de sorriso!';
                break;
            case 'detectar-olho':
                completionMessage = '🎉 Parabéns! Você completou todas as instruções de detecção de olhos!';
                break;
            default:
                completionMessage = '🎉 Parabéns! Você completou todas as instruções!';
        }
        
        console.log(completionMessage);
        
        // Ir para próxima tela após delay
        setTimeout(() => {
            this.nextScreen();
        }, 3000);
    }
    
    detectLoop() {
        if (this.detectionActive) {
            const now = Date.now();
            
            if (now - this.lastDetectionTime >= this.detectionInterval) {
                this.lastDetectionTime = now;
                this.detectFaces().then(() => {
                    requestAnimationFrame(() => this.detectLoop());
                }).catch(error => {
                    console.error('❌ Erro na detecção de faces:', error);
                    requestAnimationFrame(() => this.detectLoop());
                });
            } else {
                requestAnimationFrame(() => this.detectLoop());
            }
        } else {
            console.log(`🛑 Loop de detecção para ${this.tipoInteracao} parado`);
        }
    }
    
    setupInstructionUI() {
        // Esconder todos os containers primeiro
        const moverCabecaContainer = document.getElementById('mover-cabeca');
        const detectarSorrisoContainer = document.getElementById('detectar-sorriso');
        const detectarOlhoContainer = document.getElementById('detectar-olho');
        
        if (moverCabecaContainer) moverCabecaContainer.style.display = 'none';
        if (detectarSorrisoContainer) detectarSorrisoContainer.style.display = 'none';
        if (detectarOlhoContainer) detectarOlhoContainer.style.display = 'none';
        
        // Mostrar apenas o container da interação atual
        switch (this.tipoInteracao) {
            case 'mover-cabeca':
                if (moverCabecaContainer) {
                    moverCabecaContainer.style.display = 'block';
                    console.log('✅ Container mover-cabeca exibido');
                }
                break;
                
            case 'detectar-sorriso':
                if (detectarSorrisoContainer) {
                    detectarSorrisoContainer.style.display = 'block';
                    console.log('✅ Container detectar-sorriso exibido');
                }
                break;
                
            case 'detectar-olho':
                if (detectarOlhoContainer) {
                    detectarOlhoContainer.style.display = 'block';
                    console.log('✅ Container detectar-olho exibido');
                }
                break;
                
            default:
                console.warn(`⚠️ Tipo de interação desconhecido: ${this.tipoInteracao}`);
        }
        
        console.log(`✅ Interface de instruções configurada para ${this.tipoInteracao}`);
    }
    

    
    handleEnter() {
        console.log(`🎯 Entrou na tela de interação (${this.tipoInteracao})`);
        
        // Carregar diálogos de missão primeiro
        this.loadMissaoDialogos().then(() => {
            // Criar overlays primeiro
            this.createOverlays();
            
            // Mostrar diálogo de missão se existir
            if (this.missaoDialogos.length > 0) {
                console.log('📚 Iniciando com diálogo de missão...');
                this.createMissaoDialog();
        } else {
                // Se não houver diálogos, iniciar face tracking diretamente
                this.initializeFaceTracking();
            }
        });
    }
    
    initializeFaceTracking() {
        console.log(`🎥 Iniciando face tracking para ${this.tipoInteracao}...`);
        
        // Configurar face tracking
        this.setupFaceTracking().then(() => {
            console.log('✅ Face tracking configurado, configurando canvas...');
            
            // Configurar canvas
            this.setupCanvas();
            
            // Carregar modelos de IA
            this.loadModels().then(() => {
                console.log('✅ Modelos carregados, verificando se estão prontos...');
                
                if (this.isModelLoaded) {
                    console.log('✅ Modelos prontos, iniciando detecção...');
                    this.startFaceDetection();
                    console.log(`✅ Face tracking iniciado para ${this.tipoInteracao}`);
                    
                    // Configurar interface de instruções
                    this.setupInstructionUI();
                    
                    // Iniciar jogo após delay
                    setTimeout(() => {
                        console.log('🎮 Delay concluído, chamando startGame...');
                        this.startGame();
                    }, 1000);
                } else {
                    console.error('❌ Modelos não foram carregados corretamente');
                }
            }).catch(error => {
                console.error('❌ Erro ao carregar modelos:', error);
            });
        }).catch(error => {
            console.error('❌ Erro ao configurar face tracking:', error);
        });
    }
    
    startGame() {
        console.log(`🎮 Iniciando jogo de ${this.tipoInteracao}`);
        
        // Verificar se o diálogo ainda está ativo
        if (this.isDialogActive) {
            console.log('📚 Diálogo ainda ativo, aguardando...');
            return;
        }
        
        // Verificar se o face tracking está funcionando
        if (!this.isModelLoaded) {
            console.error('❌ Modelos de IA não carregados, não é possível iniciar o jogo');
            return;
        }
        
        if (!this.video || !this.video.srcObject) {
            console.error('❌ Vídeo não configurado, não é possível iniciar o jogo');
            return;
        }
        
        console.log('✅ Verificações passadas, iniciando jogo...');
        
        this.gameState = 'instruction';
        this.currentInstructionIndex = 0;
        
        // Mostrar primeira instrução
        this.showNextInstruction();
        
        console.log(`🎮 Jogo de ${this.tipoInteracao} iniciado com sucesso!`);
    }
    
    handleExit() {
        console.log(`👋 Saiu da tela de interação (${this.tipoInteracao})`);
        
        // Parar face tracking
        this.detectionActive = false;
        
        // Limpar diálogo de missão se estiver ativo
        if (this.isDialogActive) {
            this.closeMissaoDialog();
        }
        
        // Limpar overlays
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
        
        // Esconder todos os containers de interação
        const moverCabecaContainer = document.getElementById('mover-cabeca');
        const detectarSorrisoContainer = document.getElementById('detectar-sorriso');
        const detectarOlhoContainer = document.getElementById('detectar-olho');
        
        if (moverCabecaContainer) moverCabecaContainer.style.display = 'none';
        if (detectarSorrisoContainer) detectarSorrisoContainer.style.display = 'none';
        if (detectarOlhoContainer) detectarOlhoContainer.style.display = 'none';
        
        // Limpar timeout
        if (this.faceLostTimeout) {
            clearTimeout(this.faceLostTimeout);
            this.faceLostTimeout = null;
        }
    }
}

// Exportar para uso global
window.InteracaoScreen = InteracaoScreen;
