/**
 * Game Screen - Tela do Jogo
 * Jogo de perguntas e respostas com face tracking
 */

class GameScreen extends BaseScreen {
    constructor() {
        super('game', { 
            next: 'selfie',
            onEnter: () => this.handleEnter(),
            onExit: () => this.handleExit()
        });
        
        this.gameData = null;
        this.currentQuestionIndex = 0;
        this.questions = [];
        this.currentQuestion = null;
        this.selectedAnswer = null;
        this.gameState = 'waiting'; // waiting, question, answer, feedback
        this.faceTrackingActive = false;
        this.headPosition = { x: 0, y: 0, z: 0 };
        this.headThreshold = 0.3; // Sensibilidade para detecção de rotação da cabeça
        this.lastAnswerTime = 0; // Evitar múltiplas respostas
        this.answerCooldown = 2000; // 2 segundos entre respostas (menor = mais sensível)

        // Sistema de seleção progressiva
        this.selectionProgress = { left: 0, right: 0 }; // Progresso da seleção (0-100)
        this.selectionThreshold = 60; // Progresso necessário para confirmar (mais rápido)
        this.selectionSpeed = 3; // Velocidade de progresso por frame (mais rápido)
        this.selectionDecay = 2; // Velocidade de decaimento quando não está na posição (mais responsivo)
        this.isSelecting = false; // Se está atualmente selecionando
        this.currentSelectionSide = null; // Lado atual da seleção

        // Elementos A-Frame
        this.scene = null;
        this.camera = null;
        this.gameElements = null;
        this.questionText = null;
        this.option1Text = null;
        this.option2Text = null;
        this.feedbackText = null;

        // Face tracking - EXATAMENTE como no script.js
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.isModelLoaded = false;
        this.detectionActive = false;

        this.onInit();
    }
    
    onInit() {
        this.loadGameData();
        this.setupFaceTracking();
    }
    
    async loadGameData() {
        try {
            const response = await fetch('assets/data/data.json');
            this.gameData = await response.json();

            // Converter dados para array de perguntas
            this.questions = Object.keys(this.gameData).map(key => {
                const questionData = this.gameData[key];
                return {
                    id: key,
                    pergunta: questionData.pergunta,
                    respostas: questionData.respostas,
                    correta: questionData.correta
                };
            });

            console.log(`📊 ${this.questions.length} perguntas carregadas`);
        } catch (error) {
            console.error('❌ Erro ao carregar dados do jogo:', error);
        }
    }

    async setupFaceTracking() {
        try {
            // EXATAMENTE como no script.js
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
                    this.video.play(); // Garantir que o vídeo está reproduzindo



                    resolve();
                };
            });

        } catch (error) {
            console.error('❌ Erro ao configurar face tracking:', error);
        }
    }

    async loadModels() {
        // Usar diretamente o CDN que funciona
        const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

        console.log('Carregando modelos de IA...');

        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
            ]);

            this.isModelLoaded = true;
            console.log('Modelos carregados com sucesso!');
        } catch (error) {
            console.error('Erro ao carregar modelos:', error);
            this.isModelLoaded = false;
        }
    }

    setupCanvas() {
        this.canvas = document.getElementById('overlay');
        this.ctx = this.canvas.getContext('2d');

        // Use viewport dimensions for better overlay
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        console.log(`Canvas configurado: ${this.canvas.width}x${this.canvas.height}`);
        console.log(`Video dimensões: ${this.video.videoWidth}x${this.video.videoHeight}`);

        // Debug: verificar visibilidade do vídeo
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
            const detections = await faceapi
                .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks();

            // Clear previous drawings
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            if (detections.length > 0) {
                console.log(`${detections.length} rosto(s) detectado(s)`);
                this.faceDetected = true;
                
                // DEBUG VISUAL DESABILITADO - APENAS LOG
                // this.drawFaceBox(detections[0].detection.box);
                // this.drawLandmarks(detections[0].landmarks);
                
                // FIXAR CUBO NO ROSTO COM PROFUNDIDADE
                this.fixCubeOnFace(detections[0].detection.box, detections[0].landmarks);
                
                // Processar movimento da cabeça
                this.processHeadMovement(detections[0].landmarks);
            } else {
                this.faceDetected = false;
                console.log('Nenhum rosto detectado');
            }
        } catch (error) {
            console.error('Erro na detecção:', error);
        }
    }

    drawFaceBox(box) {
        // DEBUG VISUAL DESABILITADO - APENAS LOG
        console.log('🚫 Debug visual do face tracking desabilitado');
        return;
        
        // CÓDIGO COMENTADO - DEBUG VISUAL NÃO É MAIS EXIBIDO
        /*
        const { x, y, width, height } = box;

        // Scale coordinates to match canvas dimensions
        const scaleX = this.canvas.width / this.video.videoWidth;
        const scaleY = this.canvas.height / this.video.videoHeight;

        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        const scaledWidth = width * scaleX;
        const scaledHeight = height * scaleY;

        this.ctx.strokeStyle = '#FF6B6B';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
        */
    }

    drawLandmarks(landmarks) {

    }
    
    fixCubeOnFace(faceBox, landmarks) {
        if (!this.gameElements) return;
        
        // Calcular posição do rosto na tela
        const { x, y, width, height } = faceBox;
        
        // Converter coordenadas da tela para coordenadas 3D
        const screenX = (x + width/2) / this.video.videoWidth;
        const screenY = (y + height/2) / this.video.videoHeight;
        
        // CALCULAR PROFUNDIDADE REAL DO ROSTO
        // Usar a largura do rosto para estimar a distância
        // Quanto maior o rosto na tela, mais próximo da câmera
        const faceWidthNormalized = width / this.video.videoWidth;
        
        // Fórmula para calcular profundidade baseada no tamanho do rosto
        // Assumindo que um rosto a 2m da câmera tem largura de ~0.2 da tela
        const baseDistance = 2.0; // 2 metros (mais distante)
        const baseFaceWidth = 0.2; // 20% da largura da tela
        const depthMultiplier = baseDistance / baseFaceWidth;
        
        // Calcular profundidade real (em metros)
        const realDepth = faceWidthNormalized * depthMultiplier;
        
        // Converter para coordenadas 3D do A-Frame
        // Z negativo = mais próximo da câmera
        // Adicionar offset para manter elementos mais distantes
        const worldZ = -(realDepth + 1.0); // +1m de distância extra
        
        // POSICIONAR ELEMENTOS 2D NA TESTA USANDO LANDMARKS
        if (landmarks && landmarks.positions) {
            // Usar landmarks específicos para posicionar na testa
            const positions = landmarks.positions;
            
            // Landmarks para testa (índices 19-22: região da testa)
            const foreheadLeft = positions[19];  // Testa esquerda
            const foreheadRight = positions[22]; // Testa direita
            const foreheadCenter = positions[21]; // Centro da testa
            
            // CONVERTER COORDENADAS COMO OS ELEMENTOS DO FACE TRACKING
            // Usar o mesmo sistema de escala do canvas
            const scaleX = this.canvas.width / this.video.videoWidth;
            const scaleY = this.canvas.height / this.video.videoHeight;
            
            // INVERTER COORDENADA X PARA CÂMERA ESPELHADA
            // Calcular posição da testa na tela (convertida e INVERTIDA)
            const foreheadX = (this.canvas.width - foreheadCenter.x * scaleX);
            const foreheadY = foreheadCenter.y * scaleY;
            
            // Posicionar elementos 2D na testa com profundidade
            this.position2DElements(foreheadX, foreheadY, realDepth);
            
            console.log(`🎯 Elementos 2D fixados na TESTA: ${foreheadX.toFixed(0)}px, ${foreheadY.toFixed(0)}px`);
            console.log(`📏 Profundidade real: ${realDepth.toFixed(3)}m (face width: ${(faceWidthNormalized * 100).toFixed(1)}%)`);
            console.log(`🧠 Testa convertida: ${foreheadX.toFixed(0)}px, ${foreheadY.toFixed(0)}px (escala: X:${scaleX.toFixed(2)}, Y:${scaleY.toFixed(2)})`);
            
            // CALIBRAR PROFUNDIDADE USANDO LANDMARKS ESPECÍFICOS
            this.calibrateDepthWithLandmarks(landmarks, realDepth);
        } else {
            // Fallback: usar posição do centro do rosto (convertida e INVERTIDA)
            const scaleX = this.canvas.width / this.video.videoWidth;
            const scaleY = this.canvas.height / this.video.videoHeight;
            
            const centerX = (this.canvas.width - (x + width/2) * scaleX);
            const centerY = (y + height/2) * scaleY;
            
            this.position2DElements(centerX, centerY, realDepth);
            console.log(`🎯 Elementos 2D fixados no centro do rosto: ${centerX.toFixed(0)}px, ${centerY.toFixed(0)}px`);
        }
    }
    
    position2DElements(faceX, faceY, depth = null) {
        if (!this.gameElements2D) return;
        
        // CENTRALIZAR PERFEITAMENTE NO MEIO DO ROSTO
        // faceX e faceY são as coordenadas do centro do rosto
        
        // CALCULAR ESCALA BASEADA NA PROFUNDIDADE (EFEITO 3D)
        let scale = 1.0;
        let opacity = 1.0;
        
        if (depth !== null) {
            // INVERTER LÓGICA: Como se estivesse PRESO NA CABEÇA
            // Ao AFASTAR diminui, ao APROXIMAR aumenta
            const minDepth = 0.5; // 50cm (muito próximo)
            const maxDepth = 2.0;  // 2m (muito distante)
            const minScale = 0.8;  // Escala mínima (muito próximo = pequeno)
            const maxScale = 1.5;  // Escala máxima (muito distante = grande)
            
            // Calcular escala baseada na profundidade (INVERTIDA)
            if (depth < minDepth) {
                scale = minScale; // Muito próximo = pequeno (preso na cabeça)
                opacity = 1.0;
            } else if (depth > maxDepth) {
                scale = maxScale; // Muito distante = grande (afastado)
                opacity = 0.7;
            } else {
                // Interpolação linear INVERTIDA
                const depthRatio = (depth - minDepth) / (maxDepth - minDepth);
                scale = minScale + (maxScale - minScale) * depthRatio;
                opacity = 1.0 + (0.7 - 1.0) * depthRatio;
            }
            
            console.log(`🎯 Profundidade: ${depth.toFixed(2)}m, Escala: ${scale.toFixed(2)}x, Opacidade: ${opacity.toFixed(2)} (PRESO NA CABEÇA)`);
        }
        
        // Posicionar fundo da pergunta CENTRADO no meio do rosto
        if (this.questionBg2D) {
            this.questionBg2D.style.left = `${faceX - 20}px`;
            this.questionBg2D.style.top = `${faceY - 150}px`; // MAIS ACIMA (era -80)
            this.questionBg2D.style.transform = `translate(-50%, -50%) scale(${scale})`;
            this.questionBg2D.style.opacity = opacity;
        }
        
        // Posicionar opção 1 (esquerda) - MAIS AFASTADA
        if (this.option1Bg2D) {
            this.option1Bg2D.style.left = `${faceX - 80}px`; // Esquerda
            this.option1Bg2D.style.top = `${faceY - 60}px`; // MAIS ACIMA (era +60)
            this.option1Bg2D.style.transform = `translate(-50%, -50%) scale(${scale})`;
            this.option1Bg2D.style.opacity = opacity;
        }
        
        // Posicionar opção 2 (direita) - MAIS AFASTADA
        if (this.option2Bg2D) {
            this.option2Bg2D.style.left = `${faceX + 30}px`; // Direita
            this.option2Bg2D.style.top = `${faceY - 60}px`; // MAIS ACIMA (era +60)
            this.option2Bg2D.style.transform = `translate(-50%, -50%) scale(${scale})`;
            this.option2Bg2D.style.opacity = opacity;
        }
        

        
        console.log(`🎯 Elementos centralizados no rosto: ${faceX}px, ${faceY}px, Escala: ${scale.toFixed(2)}x`);
    }
    
    calibrateDepthWithLandmarks(landmarks, baseDepth) {
        // Usar landmarks específicos para melhorar a precisão da profundidade
        const positions = landmarks.positions;
        
        // Landmarks para olhos (índices 36-47)
        const leftEye = positions[36]; // Canto esquerdo do olho esquerdo
        const rightEye = positions[45]; // Canto direito do olho direito
        
        // Landmarks para nariz (índices 27-35)
        const noseTip = positions[30]; // Ponta do nariz
        
        // Calcular distância entre os olhos (normalmente ~6.5cm em adultos)
        const eyeDistance = Math.sqrt(
            Math.pow(rightEye.x - leftEye.x, 2) + 
            Math.pow(rightEye.y - leftEye.y, 2)
        );
        
        // Normalizar pela largura da tela
        const eyeDistanceNormalized = eyeDistance / this.video.videoWidth;
        
        // Calibrar profundidade baseada na distância entre os olhos
        // Assumindo que olhos a 2m têm distância de ~0.12 da tela
        const baseEyeDistance = 0.12; // 12% da largura da tela
        const calibratedDepth = (eyeDistanceNormalized / baseEyeDistance) * baseDepth;
        
        // Aplicar profundidade calibrada se for mais precisa
        if (Math.abs(calibratedDepth - baseDepth) < 0.5) { // Diferença menor que 50cm
            // ELEMENTOS 3D NÃO SÃO MAIS USADOS - APENAS LOG
            console.log(`🎯 Profundidade calibrada: ${calibratedDepth.toFixed(3)}m (eye distance: ${(eyeDistanceNormalized * 100).toFixed(1)}%)`);
            console.log(`🧠 Profundidade disponível para elementos 2D: ${calibratedDepth.toFixed(3)}m`);
        }
    }

    detectLoop() {
        if (this.detectionActive) {
            this.detectFaces().then(() => {
                requestAnimationFrame(() => this.detectLoop());
            });
        }
    }

    processHeadMovement(landmarks) {
        // Calcular ROTAÇÃO da cabeça (olhando para esquerda/direita)
        const leftEye = landmarks.getLeftEye()[0];
        const rightEye = landmarks.getRightEye()[3];
        const nose = landmarks.getNose()[3];
        
        // Calcular ângulo de rotação baseado na posição dos olhos
        const eyeDistance = Math.abs(rightEye.x - leftEye.x);
        const eyeCenter = (leftEye.x + rightEye.x) / 2;
        const noseOffset = nose.x - eyeCenter;
        
        // Normalizar rotação (-1 a 1)
        // Valores negativos = olhando para esquerda
        // Valores positivos = olhando para direita
        const rotationX = noseOffset / (eyeDistance * 0.5);
        const normalizedRotation = Math.max(-1, Math.min(1, rotationX));
        
        this.headPosition.x = normalizedRotation;
        
        // Debug: mostrar rotação da cabeça
        console.log(`🔄 ROTAÇÃO da cabeça: ${normalizedRotation.toFixed(3)} (threshold: ±${this.headThreshold})`);
        console.log(`📊 Valores - Eye Distance: ${eyeDistance.toFixed(3)}, Nose Offset: ${noseOffset.toFixed(3)}`);
        console.log(`👁️ Olhos - Left: ${leftEye.x.toFixed(3)}, Right: ${rightEye.x.toFixed(3)}, Center: ${eyeCenter.toFixed(3)}`);
        console.log(`👃 Nariz: ${nose.x.toFixed(3)}`);

        // Processar seleção progressiva
        this.processProgressiveSelection(normalizedRotation);
    }

    processProgressiveSelection(normalizedRotation) {
        if (this.gameState !== 'question') return;

        // Verificar se está olhando para algum lado
        if (normalizedRotation < -this.headThreshold) {
            // Olhando para esquerda
            this.updateSelectionProgress('left', normalizedRotation);
        } else if (normalizedRotation > this.headThreshold) {
            // Olhando para direita
            this.updateSelectionProgress('right', normalizedRotation);
        } else {
            // Olhando para o centro - decair progresso
            this.decaySelectionProgress();
        }

        // Atualizar indicadores visuais de progresso
        this.updateSelectionProgressIndicators();
    }

    updateSelectionProgressIndicators() {
        if (!this.gameElements2D) return;

        // Atualizar indicadores de progresso
        this.updateProgressBar('left', this.selectionProgress.left);
        this.updateProgressBar('right', this.selectionProgress.right);
        
        // Atualizar indicadores de seleção ativa
        this.updateSelectionIndicators();
    }

    updateProgressBar(side, progress) {
        const option = side === 'left' ? this.option1Bg2D : this.option2Bg2D;
        const fillBar = side === 'left' ? this.option1Fill2D : this.option2Fill2D;
        if (!option || !fillBar) return;

        // Calcular escala e efeitos baseados no progresso
        let scale, borderColor, boxShadow, backgroundColor, opacity;
        
        if (progress === 0) {
            scale = 1;
            borderColor = 'transparent';
            boxShadow = 'none';
            backgroundColor = 'transparent';
            opacity = 1;
        } else if (progress < 30) {
            scale = 1.05;
            borderColor = '#E6B3FF';
            boxShadow = `0 0 15px rgba(230, 179, 255, 0.8)`;
            backgroundColor = 'rgba(230, 179, 255, 0.1)';
            opacity = 1;
        } else if (progress < 60) {
            scale = 1.1;
            borderColor = '#CC99FF';
            boxShadow = `0 0 20px rgba(204, 153, 255, 0.9)`;
            backgroundColor = 'rgba(204, 153, 255, 0.2)';
            opacity = 1;
        } else {
            scale = 1.15;
            borderColor = '#B366FF';
            boxShadow = `0 0 25px rgba(179, 102, 255, 1)`;
            backgroundColor = 'rgba(179, 102, 255, 0.3)';
            opacity = 1;
        }

        // Aplicar mudanças visuais na opção com transições rápidas
        option.style.transition = 'all 0.1s ease-out'; // Transição mais rápida
        option.style.transform = `translate(-50%, -50%) scale(${scale})`;
        option.style.border = `4px solid ${borderColor}`;
        option.style.boxShadow = boxShadow;
        option.style.backgroundColor = backgroundColor;
        option.style.opacity = opacity;
        
        // Animar barra de preenchimento de baixo para cima (mais responsiva)
        const fillHeight = (progress / 60) * 200; // Converter progresso para porcentagem de altura
        fillBar.style.height = `${fillHeight}%`;
        
        // Adicionar efeito de pulso mais rápido quando selecionando
        if (progress > 0 && progress < 60) {
            option.style.animation = 'pulse 0.6s ease-in-out infinite alternate';
        } else {
            option.style.animation = 'none';
        }
    }

    updateSelectionIndicators() {
        // Mostrar/esconder indicadores de seleção ativa nas opções
        if (this.option1Bg2D) {
            if (this.currentSelectionSide === 'left' && this.isSelecting) {
                // Opção esquerda ativa - efeito mais dramático
                this.option1Bg2D.style.filter = 'brightness(1.3) contrast(1.1) saturate(1.4) hue-rotate(10deg)';
                this.option1Bg2D.style.transition = 'all 0.15s ease-out';
                this.option1Bg2D.style.transform = this.option1Bg2D.style.transform + ' rotate(2deg)';
            } else {
                // Opção esquerda inativa - resetar efeitos
                this.option1Bg2D.style.filter = 'none';
                this.option1Bg2D.style.transition = 'all 0.15s ease-out';
                this.option1Bg2D.style.transform = this.option1Bg2D.style.transform.replace(' rotate(2deg)', '');
            }
        }

        if (this.option2Bg2D) {
            if (this.currentSelectionSide === 'right' && this.isSelecting) {
                // Opção direita ativa - efeito mais dramático
                this.option2Bg2D.style.filter = 'brightness(1.3) contrast(1.1) saturate(1.4) hue-rotate(10deg)';
                this.option2Bg2D.style.transition = 'all 0.15s ease-out';
                this.option2Bg2D.style.transform = this.option2Bg2D.style.transform + ' rotate(-2deg)';
            } else {
                // Opção direita inativa - resetar efeitos
                this.option2Bg2D.style.filter = 'none';
                this.option2Bg2D.style.transition = 'all 0.15s ease-out';
                this.option2Bg2D.style.transform = this.option2Bg2D.style.transform.replace(' rotate(-2deg)', '');
            }
        }
    }

    updateSelectionProgress(side, intensity) {
        // Aumentar progresso do lado atual
        this.selectionProgress[side] += this.selectionSpeed;
        
        // Limitar ao máximo
        this.selectionProgress[side] = Math.min(this.selectionProgress[side], this.selectionThreshold);
        
        // Decair progresso do outro lado
        const otherSide = side === 'left' ? 'right' : 'left';
        this.selectionProgress[otherSide] = Math.max(0, this.selectionProgress[otherSide] - this.selectionDecay * 2);
        
        // Atualizar estado de seleção
        this.currentSelectionSide = side;
        this.isSelecting = true;
        
        // Verificar se atingiu o threshold
        if (this.selectionProgress[side] >= this.selectionThreshold) {
            this.confirmSelection(side);
        }
        
        console.log(`🎯 Progresso ${side}: ${this.selectionProgress[side].toFixed(1)}%`);
    }

    decaySelectionProgress() {
        // Decair progresso de ambos os lados quando olhando para o centro
        this.selectionProgress.left = Math.max(0, this.selectionProgress.left - this.selectionDecay);
        this.selectionProgress.right = Math.max(0, this.selectionProgress.right - this.selectionDecay);
        
        // Se ambos chegarem a 0, não está mais selecionando
        if (this.selectionProgress.left <= 0 && this.selectionProgress.right <= 0) {
            this.isSelecting = false;
            this.currentSelectionSide = null;
        }
    }

    confirmSelection(side) {
        // Verificar cooldown para evitar múltiplas respostas
        const now = Date.now();
        if (now - this.lastAnswerTime < this.answerCooldown) {
            console.log('⏰ Cooldown ativo, aguardando...');
            return;
        }

        console.log(`🎯 Seleção confirmada: ${side}`);
        this.lastAnswerTime = now;
        
        // Resetar progresso
        this.selectionProgress.left = 0;
        this.selectionProgress.right = 0;
        this.isSelecting = false;
        this.currentSelectionSide = null;
        
        // Selecionar resposta
        this.selectAnswer(side);
    }



    update3DDebugElements(headX) {
        if (!this.gameElements) return;

        // DESABILITAR ELEMENTOS 3D DE DEBUG - APENAS 2D AGORA
        console.log('🚫 Elementos 3D de debug desabilitados - usando apenas 2D');
        return;
    }

     
    handleEnter() {
        console.log('🎮 Entrou na tela do jogo');

        // Mostrar botão voltar
        const backButton = document.getElementById('game-back-button');

        if (backButton) backButton.style.display = 'block';

        // Configurar botão voltar
        if (backButton) {
            backButton.addEventListener('click', () => {
                if (window.screenManager) {
                    window.screenManager.showScreen('main');
                }
            });
        }

        // Inicializar cena A-Frame
        this.initAFrameScene();

        // Iniciar face tracking
        this.setupCanvas();



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

        // Iniciar jogo
        setTimeout(() => {
            this.startGame();
        }, 1000);
    }
    
    handleExit() {
        console.log('👋 Saiu da tela do jogo');

        // Parar face tracking
        this.detectionActive = false;

        // Esconder elementos
        const backButton = document.getElementById('game-back-button');

        if (backButton) backButton.style.display = 'none';

        // Limpar cena
        this.clearScene();
    }

    initAFrameScene() {
        // Aguardar A-Frame carregar
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
                
                // OCULTAR ELEMENTOS 3D IMEDIATAMENTE
                this.gameElements.setAttribute('visible', false);
                console.log('🚫 Elementos 3D ocultados na inicialização');
            } else {
                console.error('❌ Elementos A-Frame não encontrados!');
            }
        }, 1000); // Aumentar delay para garantir que A-Frame carregou
    }

    startGame() {
        console.log('🎯 startGame chamado');
        console.log('📊 Número de perguntas:', this.questions.length);
        
        if (this.questions.length === 0) {
            console.log('❌ Nenhuma pergunta disponível');
            return;
        }

        this.currentQuestionIndex = 0;
        console.log('🎬 Chamando showQuestion...');
        this.showQuestion();
    }

    showQuestion() {
        console.log('🎯 showQuestion chamado');
        console.log('📍 currentQuestionIndex:', this.currentQuestionIndex);
        console.log('📊 questions.length:', this.questions.length);
        
        if (this.currentQuestionIndex >= this.questions.length) {
            console.log('🏁 Todas as perguntas respondidas, chamando gameCompleted');
            this.gameCompleted();
            return;
        }

        this.currentQuestion = this.questions[this.currentQuestionIndex];
        this.gameState = 'question';

        console.log(`❓ Mostrando pergunta ${this.currentQuestionIndex + 1}:`, this.currentQuestion.pergunta);
        console.log('📝 Pergunta:', this.currentQuestion.pergunta);

        // Criar elementos da pergunta na cena A-Frame
        console.log('🎨 Chamando createQuestionElements...');
        this.createQuestionElements();
    }

        createQuestionElements() {
        console.log('🎯 createQuestionElements chamado');
        
        // Limpar elementos anteriores
        this.clearScene();
        
        // OCULTAR TODOS OS ELEMENTOS 3D
        if (this.gameElements) {
            this.gameElements.setAttribute('visible', false);
            console.log('🚫 Elementos 3D ocultados');
        }
        
        console.log('✨ Criando elementos 2D sobrepostos...');
        
        // Criar elementos 2D que seguem o rosto (como face tracking)
        this.create2DQuestionElements();
        
        // Elementos criados com sucesso
        console.log('✅ Perguntas e respostas 2D criadas!');
    }
    
    create2DQuestionElements() {
        // Criar container para elementos 2D
        if (!this.gameElements2D) {
            this.gameElements2D = document.createElement('div');
            this.gameElements2D.id = 'game-elements-2d';
            this.gameElements2D.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 1000;
                display: none;
            `;
            document.body.appendChild(this.gameElements2D);
        }
        
        // Limpar elementos anteriores
        this.gameElements2D.innerHTML = '';
        this.gameElements2D.style.display = 'block';
        
        // Criar fundo da pergunta
        const questionBg = document.createElement('div');
        questionBg.id = 'question-bg-2d';
        questionBg.style.cssText = `
            position: absolute;
            width: 450px;
            height: 100px;
            background-image: url('assets/textures/pergunta-balao.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            pointer-events: none;
            transform: translate(-50%, -50%);
            z-index: 1001;
        `;
        
        // Criar texto da pergunta
        const questionText = document.createElement('div');
        questionText.id = 'question-text-2d';
        questionText.textContent = this.currentQuestion.pergunta;
        questionText.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #000000;
            font-family: Arial, sans-serif;
            font-size: 9px;
            font-weight: normal;
            text-align: center;
            width: 150px;
            pointer-events: none;
            user-select: none;
        `;
        
        // Criar fundo da opção 1 (esquerda)
        const option1Bg = document.createElement('div');
        option1Bg.id = 'option1-bg-2d';
        option1Bg.style.cssText = `
            position: absolute;
            width: 100px;
            height: 100px;
            background-image: url('assets/textures/resposta-balao.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            pointer-events: none;
            transform: translate(-50%, -50%);
            z-index: 1001;
            border-radius: 20px;
            overflow: hidden;
        `;
        
        // Criar barra de preenchimento para opção 1
        const option1Fill = document.createElement('div');
        option1Fill.id = 'option1-fill-2d';
        option1Fill.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 0%;
            background: linear-gradient(to top, rgba(179, 102, 255, 0.8), rgba(230, 179, 255, 0.4));
            border-radius: 20px;
            pointer-events: none;
            z-index: 1000;
        `;
        
        // Criar texto da opção 1
        const option1Text = document.createElement('div');
        option1Text.id = 'option1-text-2d';
        option1Text.textContent = `1. ${this.getRandomWrongOption().resposta}`;
        option1Text.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #000000;
            font-family: Arial, sans-serif;
            font-size: 8px;
            font-weight: normal;
            text-align: center;
            width: 50px;
            pointer-events: none;
            user-select: none;
            z-index: 1002;
        `;
        
        // Criar fundo da opção 2 (direita)
        const option2Bg = document.createElement('div');
        option2Bg.id = 'option2-bg-2d';
        option2Bg.style.cssText = `
            position: absolute;
            width: 100px;
            height: 100px;
            background-image: url('assets/textures/resposta-balao.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            pointer-events: none;
            transform: translate(-50%, -50%);
            z-index: 1001;
            border-radius: 20px;
            overflow: hidden;
        `;
        
        // Criar barra de preenchimento para opção 2
        const option2Fill = document.createElement('div');
        option2Fill.id = 'option2-fill-2d';
        option2Fill.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 0%;
            background: linear-gradient(to top, rgba(179, 102, 255, 0.8), rgba(230, 179, 255, 0.4));
            border-radius: 20px;
            pointer-events: none;
            z-index: 1000;
        `;
        
        // Criar texto da opção 2
        const option2Text = document.createElement('div');
        option2Text.id = 'option2-text-2d';
        option2Text.textContent = `2. ${this.currentQuestion.respostas['00'][0].resposta}`;
        option2Text.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #000000;
            font-family: Arial, sans-serif;
            font-size: 8px;
            font-weight: normal;
            text-align: center;
            width: 50px;
            pointer-events: none;
            user-select: none;
            z-index: 1002;
        `;
        
        // Adicionar elementos ao container (barras de preenchimento DENTRO das opções)
        questionBg.appendChild(questionText);
        option1Bg.appendChild(option1Fill); // Barra de preenchimento DENTRO da opção 1
        option1Bg.appendChild(option1Text);
        option2Bg.appendChild(option2Fill); // Barra de preenchimento DENTRO da opção 2
        option2Bg.appendChild(option2Text);
        
        this.gameElements2D.appendChild(questionBg);
        this.gameElements2D.appendChild(option1Bg);
        this.gameElements2D.appendChild(option2Bg);
        
        // Guardar referências para posicionamento
        this.questionBg2D = questionBg;
        this.option1Bg2D = option1Bg;
        this.option2Bg2D = option2Bg;
        this.option1Fill2D = option1Fill;
        this.option2Fill2D = option2Fill;
    }
    
    positionElementsOnFace() {
        // FUNÇÃO DESABILITADA - ELEMENTOS 3D NÃO SÃO MAIS USADOS
        console.log('🚫 positionElementsOnFace desabilitada - usando apenas 2D');
        return;
        
        // CÓDIGO COMENTADO - ELEMENTOS 3D NÃO SÃO MAIS USADOS
        /*
        // Posicionar elementos 3D no rosto quando detectado
        if (this.faceDetected && this.gameElements) {
            // Ajustar posição baseada na posição da câmera
            const camera = document.getElementById('main-camera');
            if (camera) {
                const cameraPos = camera.getAttribute('position');
                const cameraRot = camera.getAttribute('rotation');
                
                // Calcular posição relativa ao rosto
                const faceOffset = { x: 0, y: 0.8, z: -0.5 };
                
                // Aplicar offset baseado na posição da câmera
                this.gameElements.setAttribute('position', 
                    `${cameraPos.x + faceOffset.x} ${cameraPos.y + faceOffset.y} ${cameraPos.z + faceOffset.z}`);
                
                // Fazer elementos sempre olharem para a câmera
                this.gameElements.setAttribute('rotation', 
                    `${cameraRot.x} ${cameraRot.y} ${cameraRot.z}`);
            }
        }
        */
    }
    
    getRandomWrongOption() {
        // Pegar uma opção incorreta aleatória (não 00)
        const options = Object.keys(this.currentQuestion.respostas);
        const wrongOptions = options.filter(key => key !== '00');
        const randomOption = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];

        return {
            key: randomOption,
            ...this.currentQuestion.respostas[randomOption][0]
        };
    }



    selectAnswer(side) {
        if (this.gameState !== 'question') return;

        this.gameState = 'answer';
        this.selectedAnswer = side;

        console.log(`✅ Resposta selecionada: ${side}`);

        // Ir direto ao feedback da escolha
        this.showFallbackMessage(side);
    }

        showFallbackMessage(side) {
        // Mostrar mensagem de fallback baseada na escolha
        let fallbackMessage;
        if (side === 'right') {
            // Opção direita selecionada - mostrar fallback da resposta 00
            const rightOption = this.currentQuestion.respostas['00'][0];
            fallbackMessage = rightOption.fallback;
        } else {
            // Opção esquerda selecionada - mostrar fallback da opção incorreta
            const leftOption = this.getRandomWrongOption();
            fallbackMessage = leftOption.fallback;
        }
        
        // Mostrar mensagem 2D fixa no rosto
        this.show2DFallbackMessage(fallbackMessage, side);
    }
    
    show2DFallbackMessage(fallbackMessage, side) {
        if (!this.gameElements2D) return;
        
        // Limpar elementos anteriores com fade-out
        this.fadeOutCurrentElements();
        
        // Aguardar fade-out antes de mostrar nova mensagem
        setTimeout(() => {
            this.createFallbackMessage(fallbackMessage);
        }, 300);
    }
    
    fadeOutCurrentElements() {
        if (!this.gameElements2D) return;
        
        const elements = this.gameElements2D.children;
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            element.style.transition = 'all 0.3s ease-out';
            element.style.opacity = '0';
            element.style.transform = element.style.transform + ' scale(0.8)';
        }
    }
    
    createFallbackMessage(fallbackMessage) {
        if (!this.gameElements2D) return;
        
        // Limpar elementos anteriores
        this.gameElements2D.innerHTML = '';
        
        // Criar fundo da mensagem
        const fallbackBg = document.createElement('div');
        fallbackBg.style.cssText = `
            position: absolute;
            width: 500px;
            height: 200px;
            background-image: url('assets/textures/pergunta-balao.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            pointer-events: none;
            transform: translate(-50%, -50%) scale(0.5);
            top: 50%;
            left: 50%;
            opacity: 0;
            transition: all 0.4s ease-out;
        `;
        
        // Criar texto da mensagem
        const fallbackText = document.createElement('div');
        fallbackText.textContent = fallbackMessage;
        fallbackText.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #000000;
            font-family: Arial, sans-serif;
            font-size: 16px;
            font-weight: normal;
            text-align: center;
            width: 280px;
            pointer-events: none;
            user-select: none;
            opacity: 0;
            transition: opacity 0.6s ease-out 0.2s;
        `;
        
        // Criar esfera decorativa
        const decorativeSphere = document.createElement('div');
        decorativeSphere.style.cssText = `
            position: absolute;
            width: 20px;
            height: 20px;
            background-color: #FFD93D;
            border-radius: 50%;
            pointer-events: none;
            transform: translate(-50%, -50%) scale(0);
            top: 60%;
            left: 50%;
            opacity: 0;
            transition: all 0.5s ease-out 0.3s;
        `;
        
        // Adicionar CSS para animações
        if (!document.getElementById('game-animations')) {
            const style = document.createElement('style');
            style.id = 'game-animations';
            style.textContent = `
                @keyframes spin {
                    from { transform: translate(-50%, -50%) rotate(0deg); }
                    to { transform: translate(-50%, -50%) rotate(360deg); }
                }
                @keyframes pulse {
                    from { transform: translate(-50%, -50%) scale(1); }
                    to { transform: translate(-50%, -50%) scale(1.05); }
                }
                @keyframes bounce {
                    from { transform: translate(-50%, -50%) scale(1); }
                    to { transform: translate(-50%, -50%) scale(1.2); }
                }
            `;
            document.head.appendChild(style);
        }
        
        fallbackBg.appendChild(fallbackText);
        this.gameElements2D.appendChild(fallbackBg);
        this.gameElements2D.appendChild(decorativeSphere);
        
        // Animar entrada dos elementos
        requestAnimationFrame(() => {
            fallbackBg.style.transform = 'translate(-50%, -50%) scale(1)';
            fallbackBg.style.opacity = '1';
            
            fallbackText.style.opacity = '1';
            
            decorativeSphere.style.transform = 'translate(-50%, -50%) scale(1)';
            decorativeSphere.style.opacity = '1';
        });
        
        // Adicionar animação de rotação após entrada
        setTimeout(() => {
            decorativeSphere.style.animation = 'spin 2s linear infinite';
        }, 800);
        
        // Sempre ir para próxima pergunta após mostrar o feedback
        setTimeout(() => {
            this.nextQuestion();
        }, 4000); // Aumentado para dar tempo da animação
    }

    nextQuestion() {
        this.currentQuestionIndex++;

        if (this.currentQuestionIndex >= this.questions.length) {
            this.gameCompleted();
        } else {
            this.showQuestion();
        }
    }

        gameCompleted() {
        console.log('🎉 Jogo completado!');
        
        // Limpar cena
        this.clearScene();
        
        // Mostrar mensagem de conclusão 2D
        this.show2DGameCompleted();
        
        // Botão para continuar
        setTimeout(() => {
            if (window.screenManager) {
                window.screenManager.showScreen('selfie');
            }
        }, 3000);
    }
    
    show2DGameCompleted() {
        if (!this.gameElements2D) return;
        
        this.gameElements2D.style.display = 'block';
        this.gameElements2D.innerHTML = '';
        
        // Mensagem de parabéns
        const congratsText = document.createElement('div');
        congratsText.textContent = '🎉 Parabéns! Você completou todas as perguntas!';
        congratsText.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #4ECDC4;
            font-family: Arial, sans-serif;
            font-size: 24px;
            font-weight: normal;
            text-align: center;
            background: rgba(0, 0, 0, 0.8);
            padding: 20px;
            border-radius: 10px;
            pointer-events: none;
            z-index: 1003;
        `;
        
        // Esferas de celebração
        const leftSphere = document.createElement('div');
        leftSphere.style.cssText = `
            position: absolute;
            top: 50%;
            left: 30%;
            width: 30px;
            height: 30px;
            background-color: #FFD93D;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 1003;
            animation: bounce 1s infinite alternate;
        `;
        
        const rightSphere = document.createElement('div');
        rightSphere.style.cssText = `
            position: absolute;
            top: 50%;
            left: 70%;
            width: 30px;
            height: 30px;
            background-color: #FF6B6B;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 1003;
            animation: bounce 1s infinite alternate;
        `;
        
        // Adicionar animação CSS
        if (!document.getElementById('bounce-animation')) {
            const style = document.createElement('style');
            style.id = 'bounce-animation';
            style.textContent = `
                @keyframes bounce {
                    from { transform: translate(-50%, -50%) scale(1); }
                    to { transform: translate(-50%, -50%) scale(1.2); }
                }
            `;
            document.head.appendChild(style);
        }
        
        this.gameElements2D.appendChild(congratsText);
        this.gameElements2D.appendChild(rightSphere);
        this.gameElements2D.appendChild(leftSphere);
    }

    clearScene() {
        // Limpar elementos 3D
        if (this.gameElements) {
            while (this.gameElements.children.length > 0) {
                this.gameElements.removeChild(this.gameElements.children[0]);
            }
            // GARANTIR QUE ELEMENTOS 3D PERMANEÇAM OCULTOS
            this.gameElements.setAttribute('visible', false);
        }
        
        // Limpar elementos 2D
        if (this.gameElements2D) {
            this.gameElements2D.style.display = 'none';
            this.gameElements2D.innerHTML = '';
        }
    }
}

// Exportar para uso global
window.GameScreen = GameScreen;