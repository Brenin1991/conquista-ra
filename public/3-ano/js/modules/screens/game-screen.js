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

                    // Atualizar status da câmera
                    const status = document.getElementById('camera-status');
                    if (status) {
                        status.textContent = '📹 Câmera ativa';
                        status.style.background = 'rgba(0, 128, 0, 0.8)';
                    }

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
                
                // Desenhar rosto no canvas
                this.drawFaceBox(detections[0].detection.box);
                this.drawLandmarks(detections[0].landmarks);
                
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
    }

    drawLandmarks(landmarks) {
        this.ctx.fillStyle = '#4ECDC4';

        // Scale coordinates to match canvas dimensions
        const scaleX = this.canvas.width / this.video.videoWidth;
        const scaleY = this.canvas.height / this.video.videoHeight;

        landmarks.positions.forEach(point => {
            const scaledX = point.x * scaleX;
            const scaledY = point.y * scaleY;

            this.ctx.beginPath();
            this.ctx.arc(scaledX, scaledY, 3, 0, 2 * Math.PI);
            this.ctx.fill();
        });
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
            
            // Calcular posição da testa na tela
            const foreheadX = foreheadCenter.x;
            const foreheadY = foreheadCenter.y;
            
            // DEBUG: Verificar se os elementos 2D existem
            console.log(`🔍 DEBUG: Elementos 2D existem?`, {
                gameElements2D: !!this.gameElements2D,
                questionBg2D: !!this.questionBg2D,
                option1Bg2D: !!this.option1Bg2D,
                option2Bg2D: !!this.option2Bg2D
            });
            
            // Posicionar elementos 2D na testa
            this.position2DElements(foreheadX, foreheadY);
            
            console.log(`🎯 Elementos 2D fixados na TESTA: ${foreheadX.toFixed(0)}px, ${foreheadY.toFixed(0)}px`);
            console.log(`📏 Profundidade real: ${realDepth.toFixed(3)}m (face width: ${(faceWidthNormalized * 100).toFixed(1)}%)`);
            console.log(`🧠 Testa: ${(foreheadX / this.video.videoWidth * 100).toFixed(1)}%, ${(foreheadY / this.video.videoHeight * 100).toFixed(1)}%`);
            
            // CALIBRAR PROFUNDIDADE USANDO LANDMARKS ESPECÍFICOS
            this.calibrateDepthWithLandmarks(landmarks, realDepth);
        } else {
            // Fallback: usar posição do centro do rosto
            const centerX = x + width/2;
            const centerY = y + height/2;
            
            // DEBUG: Verificar se os elementos 2D existem
            console.log(`🔍 DEBUG: Elementos 2D existem?`, {
                gameElements2D: !!this.gameElements2D,
                questionBg2D: !!this.questionBg2D,
                option1Bg2D: !!this.option1Bg2D,
                option2Bg2D: !!this.option2Bg2D
            });
            
            this.position2DElements(centerX, centerY);
            console.log(`🎯 Elementos 2D fixados no centro do rosto: ${centerX.toFixed(0)}px, ${centerY.toFixed(0)}px`);
        }
    }
    
    position2DElements(faceX, faceY) {
        console.log('🎯 position2DElements chamado com:', faceX, faceY);
        faceX = faceX + 300;
        
        if (!this.gameElements2D) {
            console.log('❌ gameElements2D não existe!');
            return;
        }
        
        // POSICIONAR ELEMENTOS SEGUINDO O ROSTO (FACE TRACKING)
        // faceX e faceY são as coordenadas da testa em pixels
        
        // Posicionar fundo da pergunta na testa
        if (this.questionBg2D) {
            this.questionBg2D.style.left = `${faceX}px`;
            this.questionBg2D.style.top = `${faceY - 150}px`; // Acima da testa
            console.log('✅ Pergunta posicionada em:', faceX, faceY - 150);
        } else {
            console.log('❌ questionBg2D não existe!');
        }
        
        // Posicionar opção 1 (esquerda) ao lado esquerdo do rosto
        if (this.option1Bg2D) {
            this.option1Bg2D.style.left = `${faceX - 250}px`;
            this.option1Bg2D.style.top = `${faceY + 50}px`; // Abaixo da testa
            console.log('✅ Opção 1 posicionada em:', faceX - 250, faceY + 50);
        } else {
            console.log('❌ option1Bg2D não existe!');
        }
        
        // Posicionar opção 2 (direita) ao lado direito do rosto
        if (this.option2Bg2D) {
            this.option2Bg2D.style.left = `${faceX + 250}px`;
            this.option2Bg2D.style.top = `${faceY + 50}px`; // Abaixo da testa
            console.log('✅ Opção 2 posicionada em:', faceX + 250, faceY + 50);
        } else {
            console.log('❌ option2Bg2D não existe!');
        }
        
        // Posicionar indicadores abaixo das opções
        if (this.leftIndicator2D) {
            this.leftIndicator2D.style.left = `${faceX - 250}px`;
            this.leftIndicator2D.style.top = `${faceY + 180}px`;
            console.log('✅ Indicador esquerda posicionado em:', faceX - 250, faceY + 180);
        } else {
            console.log('❌ leftIndicator2D não existe!');
        }
        
        if (this.rightIndicator2D) {
            this.rightIndicator2D.style.left = `${faceX + 250}px`;
            this.rightIndicator2D.style.top = `${faceY + 180}px`;
            console.log('✅ Indicador direita posicionado em:', faceX + 250, faceY + 180);
        } else {
            console.log('❌ rightIndicator2D não existe!');
        }
        
        console.log(`🎯 Elementos 2D posicionados no rosto: ${faceX}px, ${faceY}px`);
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
            const worldZ = -(calibratedDepth + 1.0); // +1m de distância extra (Z negativo)
            
            // Pegar posição atual e atualizar apenas o Z (manter X e Y da testa)
            const currentPosition = this.gameElements.getAttribute('position');
            const newPosition = `${currentPosition.x} ${currentPosition.y} ${worldZ}`;
            
            this.gameElements.setAttribute('position', newPosition);
            
            console.log(`🎯 Profundidade calibrada: ${calibratedDepth.toFixed(3)}m (eye distance: ${(eyeDistanceNormalized * 100).toFixed(1)}%)`);
            console.log(`🧠 Mantendo posição da testa: X=${currentPosition.x.toFixed(2)}, Y=${currentPosition.y.toFixed(2)}`);
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

        // Atualizar indicador visual da rotação
        this.updateHeadPositionIndicator(normalizedRotation);
        
        // Detectar rotação significativa
        if (Math.abs(normalizedRotation) > this.headThreshold) {
            this.handleHeadMovement(normalizedRotation);
        }
    }

    updateHeadPositionIndicator(headX) {
        const headPositionIndicator = document.getElementById('head-position');
        if (headPositionIndicator) {
            let rotation = 'Centro';
            let color = '#FFFFFF';

            if (headX < -this.headThreshold) {
                rotation = '⬅️ Olhando ESQUERDA';
                color = '#4ECDC4';
            } else if (headX > this.headThreshold) {
                rotation = '➡️ Olhando DIREITA';
                color = '#FF6B6B';
            }

            headPositionIndicator.innerHTML = `🔄 ROTAÇÃO: ${rotation}<br><small>${headX.toFixed(3)}</small>`;
            headPositionIndicator.style.color = color;
        }

        // Atualizar elementos 3D de debug
        this.update3DDebugElements(headX);
    }

    update3DDebugElements(headX) {
        if (!this.gameElements) return;

        // Remover elementos de debug anteriores
        const existingDebug = this.gameElements.querySelectorAll('[data-debug="true"]');
        existingDebug.forEach(el => el.remove());

        // Criar indicador de posição da cabeça (esfera colorida)
        const headIndicator = document.createElement('a-sphere');
        headIndicator.setAttribute('data-debug', 'true');
        headIndicator.setAttribute('position', `${headX * 2} 0.5 -1`);
        headIndicator.setAttribute('radius', '0.1');

        // Cor baseada na posição
        if (headX < -this.headThreshold) {
            headIndicator.setAttribute('color', '#4ECDC4'); // Azul para esquerda
            headIndicator.setAttribute('scale', '1.5 1.5 1.5');
        } else if (headX > this.headThreshold) {
            headIndicator.setAttribute('color', '#FF6B6B'); // Vermelho para direita
            headIndicator.setAttribute('scale', '1.5 1.5 1.5');
        } else {
            headIndicator.setAttribute('color', '#FFFFFF'); // Branco para centro
            headIndicator.setAttribute('scale', '1 1 1');
        }

        // Adicionar animação de pulso
        headIndicator.setAttribute('animation', 'property: scale; to: 1.2 1.2 1.2; loop: true; dir: alternate; dur: 500');

        this.gameElements.appendChild(headIndicator);

        // Criar linha de direção
        const directionLine = document.createElement('a-cylinder');
        directionLine.setAttribute('data-debug', 'true');
        directionLine.setAttribute('position', '0 0.5 -1');
        directionLine.setAttribute('rotation', '0 0 90');
        directionLine.setAttribute('height', '4');
        directionLine.setAttribute('radius', '0.02');
        directionLine.setAttribute('color', '#666666');
        directionLine.setAttribute('opacity', '0.5');
        this.gameElements.appendChild(directionLine);

        // Criar marcadores de threshold
        const leftThreshold = document.createElement('a-box');
        leftThreshold.setAttribute('data-debug', 'true');
        leftThreshold.setAttribute('position', `${-this.headThreshold * 2} 0.5 -1`);
        leftThreshold.setAttribute('width', '0.1');
        leftThreshold.setAttribute('height', '0.1');
        leftThreshold.setAttribute('depth', '0.1');
        leftThreshold.setAttribute('color', '#4ECDC4');
        leftThreshold.setAttribute('opacity', '0.7');
        this.gameElements.appendChild(leftThreshold);

        const rightThreshold = document.createElement('a-box');
        rightThreshold.setAttribute('data-debug', 'true');
        rightThreshold.setAttribute('position', `${this.headThreshold * 2} 0.5 -1`);
        rightThreshold.setAttribute('width', '0.1');
        rightThreshold.setAttribute('height', '0.1');
        rightThreshold.setAttribute('depth', '0.1');
        rightThreshold.setAttribute('color', '#FF6B6B');
        rightThreshold.setAttribute('opacity', '0.7');
        this.gameElements.appendChild(rightThreshold);
    }

    handleHeadMovement(headX) {
        if (this.gameState !== 'question') return;

        // Verificar cooldown para evitar múltiplas respostas
        const now = Date.now();
        if (now - this.lastAnswerTime < this.answerCooldown) {
            console.log('⏰ Cooldown ativo, aguardando...');
            return;
        }

        console.log(`🎯 ROTAÇÃO detectada: ${headX.toFixed(3)} (threshold: ${this.headThreshold})`);

        // Olhar para esquerda = Opção 1, Olhar para direita = Opção 2
        if (headX < -this.headThreshold) {
            console.log('⬅️ Olhando para ESQUERDA - Selecionando Opção 1');
            this.lastAnswerTime = now;
            this.selectAnswer('left'); // Esquerda
        } else if (headX > this.headThreshold) {
            console.log('➡️ Olhando para DIREITA - Selecionando Opção 2');
            this.lastAnswerTime = now;
            this.selectAnswer('right'); // Direita
        }
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

        // Mostrar status do face tracking
        const faceStatus = document.getElementById('face-status');
        const headPosition = document.getElementById('head-position');
        if (faceStatus) faceStatus.style.display = 'block';
        if (headPosition) headPosition.style.display = 'block';

        this.loadModels().then(() => {
            if (this.isModelLoaded) {
                this.startFaceDetection();
                console.log('✅ Face tracking iniciado');
                if (faceStatus) {
                    faceStatus.textContent = '✅ IA carregada';
                    faceStatus.style.background = 'rgba(0, 128, 0, 0.8)';
                }
            } else {
                console.error('❌ Falha ao carregar modelos de IA');
                if (faceStatus) {
                    faceStatus.textContent = '❌ Erro ao carregar IA';
                    faceStatus.style.background = 'rgba(255, 0, 0, 0.8)';
                }
            }
        }).catch(error => {
            console.error('❌ Erro ao inicializar face tracking:', error);
            if (faceStatus) {
                faceStatus.textContent = '❌ Erro na inicialização';
                faceStatus.style.background = 'rgba(255, 0, 0, 0.8)';
            }
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
        const faceStatus = document.getElementById('face-status');
        const headPosition = document.getElementById('head-position');

        if (backButton) backButton.style.display = 'none';
        if (faceStatus) faceStatus.style.display = 'none';
        if (headPosition) headPosition.style.display = 'none';

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
        
        console.log('✨ Criando elementos 2D sobrepostos...');
        
        // Criar elementos 2D que seguem o rosto (como face tracking)
        this.create2DQuestionElements();
        
        // Sempre resposta correta à direita para simplificar
        this.correctSide = 'right';
        
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
            width: 500px;
            height: 120px;
            background-image: url('assets/textures/pergunta-balao.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            pointer-events: none;
            transform: translate(-50%, -50%);
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
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            width: 480px;
            pointer-events: none;
            user-select: none;
        `;
        
        // Criar fundo da opção 1 (esquerda)
        const option1Bg = document.createElement('div');
        option1Bg.id = 'option1-bg-2d';
        option1Bg.style.cssText = `
            position: absolute;
            width: 180px;
            height: 180px;
            background-image: url('assets/textures/resposta-balao.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            pointer-events: none;
            transform: translate(-50%, -50%);
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
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            width: 160px;
            pointer-events: none;
            user-select: none;
        `;
        
        // Criar fundo da opção 2 (direita)
        const option2Bg = document.createElement('div');
        option2Bg.id = 'option2-bg-2d';
        option2Bg.style.cssText = `
            position: absolute;
            width: 180px;
            height: 180px;
            background-image: url('assets/textures/resposta-balao.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            pointer-events: none;
            transform: translate(-50%, -50%);
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
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            width: 160px;
            pointer-events: none;
            user-select: none;
        `;
        
        // Criar indicadores coloridos
        const leftIndicator = document.createElement('div');
        leftIndicator.id = 'left-indicator-2d';
        leftIndicator.style.cssText = `
            position: absolute;
            width: 30px;
            height: 30px;
            background-color: #4ECDC4;
            border-radius: 50%;
            pointer-events: none;
            transform: translate(-50%, -50%);
        `;
        
        const rightIndicator = document.createElement('div');
        rightIndicator.id = 'right-indicator-2d';
        rightIndicator.style.cssText = `
            position: absolute;
            width: 30px;
            height: 30px;
            background-color: #FF6B6B;
            border-radius: 50%;
            pointer-events: none;
            transform: translate(-50%, -50%);
        `;
        
        // Adicionar elementos ao container
        questionBg.appendChild(questionText);
        option1Bg.appendChild(option1Text);
        option2Bg.appendChild(option1Text.cloneNode(true));
        option2Bg.appendChild(option2Text);
        
        this.gameElements2D.appendChild(questionBg);
        this.gameElements2D.appendChild(option1Bg);
        this.gameElements2D.appendChild(option2Bg);
        this.gameElements2D.appendChild(leftIndicator);
        this.gameElements2D.appendChild(rightIndicator);
        
        // Guardar referências para posicionamento
        this.questionBg2D = questionBg;
        this.option1Bg2D = option1Bg;
        this.option2Bg2D = option2Bg;
        this.leftIndicator2D = leftIndicator;
        this.rightIndicator2D = rightIndicator;
        
        console.log(`✅ Elementos 2D criados:`, {
            questionBg2D: !!this.questionBg2D,
            option1Bg2D: !!this.option1Bg2D,
            option2Bg2D: !!this.option2Bg2D,
            leftIndicator2D: !!this.leftIndicator2D,
            rightIndicator2D: !!this.rightIndicator2D
        });
    }
    
    positionElementsOnFace() {
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

        // Mostrar feedback
        this.showFeedback();
    }

        showFeedback() {
        const isCorrect = this.selectedAnswer === this.correctSide;
        
        // Mostrar feedback 2D
        this.show2DFeedback(isCorrect);
    }
    
    show2DFeedback(isCorrect) {
        if (!this.gameElements2D) return;
        
        // Limpar elementos anteriores
        this.gameElements2D.innerHTML = '';
        
        // Criar mensagem de feedback
        const feedbackText = document.createElement('div');
        feedbackText.textContent = isCorrect ? '✅ Correto!' : '❌ Tente novamente!';
        feedbackText.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: ${isCorrect ? '#4ECDC4' : '#FF6B6B'};
            font-family: Arial, sans-serif;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            background: rgba(255, 255, 255, 0.9);
            padding: 20px;
            border-radius: 10px;
            pointer-events: none;
            user-select: none;
            z-index: 1001;
        `;
        
        this.gameElements2D.appendChild(feedbackText);
        
        // Mostrar por 2 segundos e ir para fallback
        setTimeout(() => {
            this.showFallbackMessage(isCorrect);
        }, 2000);
    }

        showFallbackMessage(isCorrect) {
        // Mostrar mensagem de fallback apropriada
        let fallbackMessage;
        if (isCorrect) {
            // Resposta correta - mostrar fallback da resposta 00
            const correctOption = this.currentQuestion.respostas['00'][0];
            fallbackMessage = correctOption.fallback;
        } else {
            // Resposta incorreta - mostrar fallback da opção incorreta
            const wrongOption = this.getRandomWrongOption();
            fallbackMessage = wrongOption.fallback;
        }
        
        // Mostrar mensagem 2D fixa no rosto
        this.show2DFallbackMessage(fallbackMessage, isCorrect);
    }
    
    show2DFallbackMessage(fallbackMessage, isCorrect) {
        if (!this.gameElements2D) return;
        
        // Limpar elementos anteriores
        this.gameElements2D.innerHTML = '';
        
        // Criar fundo da mensagem
        const fallbackBg = document.createElement('div');
        fallbackBg.style.cssText = `
            position: absolute;
            width: 300px;
            height: 80px;
            background-image: url('assets/textures/pergunta-balao.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            pointer-events: none;
            transform: translate(-50%, -50%);
            top: 50%;
            left: 50%;
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
            font-weight: bold;
            text-align: center;
            width: 280px;
            pointer-events: none;
            user-select: none;
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
            transform: translate(-50%, -50%);
            top: 60%;
            left: 50%;
            animation: spin 2s linear infinite;
        `;
        
        // Adicionar CSS para animação
        if (!document.getElementById('fallback-animations')) {
            const style = document.createElement('style');
            style.id = 'fallback-animations';
            style.textContent = `
                @keyframes spin {
                    from { transform: translate(-50%, -50%) rotate(0deg); }
                    to { transform: translate(-50%, -50%) rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        fallbackBg.appendChild(fallbackText);
        this.gameElements2D.appendChild(fallbackBg);
        this.gameElements2D.appendChild(decorativeSphere);
        
        // Próxima pergunta ou finalizar
        setTimeout(() => {
            if (isCorrect) {
                this.nextQuestion();
            } else {
                this.showQuestion(); // Mostrar a mesma pergunta
            }
        }, 3000);
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
        
        // Mostrar mensagem de conclusão 3D fixa no rosto
        this.gameElements.innerHTML = `
            <a-text 
                value="🎉 Parabéns! Você completou todas as perguntas!"
                position="0 0.8 -0.5"
                align="center"
                width="4"
                color="#4ECDC4"
                font="kelsonsans"
                billboard=""
                animation="property: scale; to: 1.2 1.2 1.2; loop: true; dir: alternate; dur: 1000">
            </a-text>
            
            <!-- Esferas de celebração -->
            <a-sphere 
                position="-0.8 0.2 -0.5"
                radius="0.1"
                color="#FFD93D"
                billboard=""
                material="shader: flat"
                animation="property: scale; to: 1.5 1.5 1.5; loop: true; dir: alternate; dur: 800">
            </a-sphere>
            
            <a-sphere 
                position="0.8 0.2 -0.5"
                radius="0.1"
                color="#FF6B6B"
                billboard=""
                material="shader: flat"
                animation="property: scale; to: 1.5 1.5 1.5; loop: true; dir: alternate; dur: 800">
            </a-sphere>
        `;
        
        // Posicionar no rosto
        this.positionElementsOnFace();
        
        // Botão para continuar
        setTimeout(() => {
            if (window.screenManager) {
                window.screenManager.showScreen('selfie');
            }
        }, 3000);
    }

    clearScene() {
        console.log('🧹 clearScene chamado');
        
        // Limpar elementos 3D
        if (this.gameElements) {
            while (this.gameElements.children.length > 0) {
                this.gameElements.removeChild(this.gameElements.children[0]);
            }
            console.log('✅ Elementos 3D limpos');
        }
        
        // NÃO limpar elementos 2D aqui - eles devem persistir
        // if (this.gameElements2D) {
        //     this.gameElements2D.style.display = 'none';
        //     this.gameElements2D.innerHTML = '';
        // }
        
        console.log('✅ Elementos 2D mantidos (não limpos)');
    }
}

// Exportar para uso global
window.GameScreen = GameScreen;