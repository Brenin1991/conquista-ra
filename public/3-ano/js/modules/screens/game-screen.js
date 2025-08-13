/**
 * Game Screen - Tela do Jogo
 * Jogo de perguntas e respostas com face tracking
 */

class GameScreen extends BaseScreen {
    constructor() {
        super('game', { 
            next: 'final',
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
        
        // Otimizações para mobile
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.detectionInterval = this.isMobile ? 50 : 100; // 50ms para mobile (20fps), 100ms para desktop (10fps)
        this.lastDetectionTime = 0;
        
        // Controle da barra de progresso
        this.totalQuestions = 0;
        this.correctAnswers = 0;
        this.progressBar = null;
        this.progressFill = null;

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

        // Overlay de carregamento e status
        this.loadingOverlay = null;
        this.faceStatusOverlay = null;
        this.silhouetteOverlay = null;
        this.isFaceVisible = false;
        this.faceLostTimeout = null;

        this.onInit();
    }
    
    onInit() {
        this.loadGameData();
        this.setupFaceTracking();
        this.initProgressBar();
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
    
    initProgressBar() {
        this.progressBar = document.getElementById('progress-bar');
        this.progressFill = document.getElementById('progress-fill');
        
        if (this.progressBar && this.progressFill) {
            console.log('✅ Barra de progresso inicializada');
        } else {
            console.error('❌ Elementos da barra de progresso não encontrados');
        }
    }
    
    async loadGameData() {
        try {
            const response = await fetch('assets/data/data.json');
            this.gameData = await response.json();

            // Converter dados para array de perguntas
            const allQuestions = Object.keys(this.gameData).map(key => {
                const questionData = this.gameData[key];
                return {
                    id: key,
                    pergunta: questionData.pergunta,
                    respostas: questionData.respostas,
                    correta: questionData.correta
                };
            });

            // Selecionar apenas 3 perguntas aleatórias
            this.questions = this.getRandomQuestions(allQuestions, 3);
            this.totalQuestions = this.questions.length;
            
            console.log(`📊 ${this.questions.length} perguntas aleatórias selecionadas de ${allQuestions.length} disponíveis`);
        } catch (error) {
            console.error('❌ Erro ao carregar dados do jogo:', error);
        }
    }
    
    getRandomQuestions(allQuestions, count) {
        // Embaralhar array de perguntas
        const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
        
        // Retornar apenas as primeiras 'count' perguntas
        return shuffled.slice(0, count);
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

        console.log('🔄 Carregando modelos de IA...');

        try {
            // Verificar se faceapi está disponível
            if (typeof faceapi === 'undefined') {
                throw new Error('Face API não está disponível');
            }

            // Carregar modelos com timeout
            const modelLoadPromise = Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
            ]);

            // Timeout de 30 segundos para carregamento
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout: modelos demoraram muito para carregar')), 30000);
            });

            // Aguardar carregamento ou timeout
            await Promise.race([modelLoadPromise, timeoutPromise]);

            // Verificar se os modelos foram realmente carregados
            if (!faceapi.nets.tinyFaceDetector.isLoaded || !faceapi.nets.faceLandmark68Net.isLoaded) {
                throw new Error('Modelos não foram carregados completamente');
            }

            this.isModelLoaded = true;
            console.log('✅ Modelos carregados com sucesso!');
            console.log('🔍 Verificação dos modelos:');
            console.log('- TinyFaceDetector:', faceapi.nets.tinyFaceDetector.isLoaded);
            console.log('- FaceLandmark68Net:', faceapi.nets.faceLandmark68Net.isLoaded);
            
            // Esconder overlay de carregamento com fade-out
            this.hideLoadingOverlay();
            
        } catch (error) {
            console.error('❌ Erro ao carregar modelos:', error);
            this.isModelLoaded = false;
            
            // Mostrar erro no overlay
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
            // Atualizar texto principal
            const loadingText = this.loadingOverlay.querySelector('div:nth-child(2)');
            if (loadingText) {
                loadingText.textContent = 'Erro ao carregar modelos';
                loadingText.style.color = '#FF6B6B';
            }
            
            // Atualizar texto de instrução
            const instructionText = this.loadingOverlay.querySelector('div:nth-child(3)');
            if (instructionText) {
                instructionText.textContent = message;
                instructionText.style.color = '#FF6B6B';
                instructionText.style.fontSize = '12px';
            }
            
            // Adicionar botão de retry
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
        // Resetar estado
        this.isModelLoaded = false;
        
        // Limpar botão de retry
        const retryButton = this.loadingOverlay.querySelector('#retry-button');
        if (retryButton) {
            retryButton.remove();
        }
        
        // Tentar carregar novamente
        try {
            await this.loadModels();
        } catch (error) {
            console.error('❌ Falha na segunda tentativa:', error);
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
            // Otimizações para mobile
            const options = new faceapi.TinyFaceDetectorOptions({
                inputSize: this.isMobile ? 160 : 224, // Resolução menor para mobile
                scoreThreshold: this.isMobile ? 0.3 : 0.5 // Threshold mais baixo para mobile
            });

            const detections = await faceapi
                .detectAllFaces(this.video, options)
                .withFaceLandmarks();

            // Clear previous drawings apenas se necessário
            if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }

            if (detections.length > 0) {
                if (!this.isMobile) {
                console.log(`${detections.length} rosto(s) detectado(s)`);
                }
                this.faceDetected = true;
                
                // Mostrar status de rosto detectado
                this.showFaceStatus('Rosto detectado', '#4ECDC4');
                
                // FIXAR CUBO NO ROSTO COM PROFUNDIDADE
                this.fixCubeOnFace(detections[0].detection.box, detections[0].landmarks);
                
                // Processar movimento da cabeça
                this.processHeadMovement(detections[0].landmarks);
            } else {
                this.faceDetected = false;
                if (!this.isMobile) {
                console.log('Nenhum rosto detectado');
                }
                
                // Mostrar status de rosto perdido
                this.showFaceStatus('Rosto não detectado', '#FF6B6B');
            }
        } catch (error) {
            if (!this.isMobile) {
            console.error('Erro na detecção:', error);
            }
            
            // Mostrar erro de detecção
            this.showFaceStatus('Erro na detecção', '#FF6B6B');
        }
    }
    
    showFaceStatus(message, color) {
        if (!this.faceStatusOverlay) return;
        
        // Limpar timeout anterior
        if (this.faceLostTimeout) {
            clearTimeout(this.faceLostTimeout);
        }
        
        // Se for rosto detectado, esconder silhueta e não mostrar status
        if (color === '#4ECDC4') {
            this.faceStatusOverlay.style.opacity = '0';
            if (this.silhouetteOverlay) {
                this.silhouetteOverlay.style.opacity = '0';
            }
            return;
        }
        
        // Para rosto não detectado ou erro, mostrar silhueta e status
        if (this.silhouetteOverlay) {
            this.silhouetteOverlay.style.opacity = '1';
        }
        
        // Mostrar mensagem de status simples
        this.faceStatusOverlay.textContent = message;
        this.faceStatusOverlay.style.background = `rgba(0, 0, 0, 0.8)`;
        this.faceStatusOverlay.style.border = `2px solid ${color}`;
        
        // Mostrar overlay de status
        this.faceStatusOverlay.style.opacity = '1';
        
        // Esconder após 2 segundos
        this.faceLostTimeout = setTimeout(() => {
            this.faceStatusOverlay.style.opacity = '0';
        }, 2000);
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
            const now = Date.now();
            
            // Controlar taxa de atualização para otimizar performance
            if (now - this.lastDetectionTime >= this.detectionInterval) {
                this.lastDetectionTime = now;
            this.detectFaces().then(() => {
                    // Usar setTimeout para controle mais preciso em mobile
                    if (this.isMobile) {
                        setTimeout(() => this.detectLoop(), this.detectionInterval);
                    } else {
                requestAnimationFrame(() => this.detectLoop());
                    }
                });
            } else {
                // Aguardar próximo intervalo
                if (this.isMobile) {
                    setTimeout(() => this.detectLoop(), this.detectionInterval - (now - this.lastDetectionTime));
                } else {
                    requestAnimationFrame(() => this.detectLoop());
                }
            }
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
        
        // Debug: mostrar rotação da cabeça (apenas em desktop)
        if (!this.isMobile) {
        console.log(`🔄 ROTAÇÃO da cabeça: ${normalizedRotation.toFixed(3)} (threshold: ±${this.headThreshold})`);
        console.log(`📊 Valores - Eye Distance: ${eyeDistance.toFixed(3)}, Nose Offset: ${noseOffset.toFixed(3)}`);
        console.log(`👁️ Olhos - Left: ${leftEye.x.toFixed(3)}, Right: ${rightEye.x.toFixed(3)}, Center: ${eyeCenter.toFixed(3)}`);
        console.log(`👃 Nariz: ${nose.x.toFixed(3)}`);
        }

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
        
        if (!this.isMobile) {
            console.log(`🎯 Progresso ${side}: ${this.selectionProgress[side].toFixed(1)}%`);
        }
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

        // Inicializar cena A-Frame
        this.initAFrameScene();

        // Iniciar face tracking
        this.setupCanvas();

        // Criar overlay de carregamento
        this.createLoadingOverlay();

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
        
        // Mostrar barra de progresso
        if (this.progressBar) {
            this.progressBar.style.display = 'block';
            // Resetar progresso
            if (this.progressFill) {
                this.progressFill.style.width = '0%';
                this.progressFill.style.background = 'linear-gradient(90deg, #90EE90, #32CD32)';
            }
            this.correctAnswers = 0;
        }
    }
    
    handleExit() {
        console.log('👋 Saiu da tela do jogo');

        // Parar face tracking
        this.detectionActive = false;

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

        // Limpar timeout
        if (this.faceLostTimeout) {
            clearTimeout(this.faceLostTimeout);
            this.faceLostTimeout = null;
        }

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
            font-family: 'Nunito', Arial, sans-serif;
            font-size: 9px;
            font-weight: 600;
            text-align: center;
            width: 150px;
            pointer-events: none;
            user-select: none;
        `;
        
        // Determinar posições aleatórias para as opções (fixas para esta pergunta)
        if (!this.currentQuestion.optionPositions) {
            this.currentQuestion.optionPositions = {
                isCorrectAnswerLeft: Math.random() < 0.5,
                wrongOption: this.getRandomWrongOption()
            };
        }
        
        const { isCorrectAnswerLeft, wrongOption } = this.currentQuestion.optionPositions;
        
        // Criar opção 1 (esquerda)
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
        
        // Criar texto da opção 1 (esquerda)
        const option1Text = document.createElement('div');
        option1Text.id = 'option1-text-2d';
        option1Text.textContent = `1. ${isCorrectAnswerLeft ? 
            this.currentQuestion.respostas['00'][0].resposta : 
            wrongOption.resposta}`;
        option1Text.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #000000;
            font-family: 'Nunito', Arial, sans-serif;
            font-size: 8px;
            font-weight: 600;
            text-align: center;
            width: 50px;
            pointer-events: none;
            user-select: none;
            z-index: 1002;
        `;
        
        // Criar opção 2 (direita)
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
        
        // Criar texto da opção 2 (direita)
        const option2Text = document.createElement('div');
        option2Text.id = 'option2-text-2d';
        option2Text.textContent = `2. ${isCorrectAnswerLeft ? 
            wrongOption.resposta : 
            this.currentQuestion.respostas['00'][0].resposta}`;
        option2Text.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #000000;
            font-family: 'Nunito', Arial, sans-serif;
            font-size: 8px;
            font-weight: 600;
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
        
        // Guardar informação sobre qual lado tem a resposta correta
        this.correctAnswerSide = isCorrectAnswerLeft ? 'left' : 'right';
        
        console.log(`🎯 Resposta correta (00) posicionada no lado: ${this.correctAnswerSide}`);
        console.log(`🎯 Opção incorreta: ${wrongOption.resposta}`);
    }
    
    positionElementsOnFace() {
        
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
        let isCorrect = false;
        
        // Verificar se a resposta selecionada é a correta baseada no lado
        if (side === this.correctAnswerSide) {
            // Resposta correta selecionada
            const correctOption = this.currentQuestion.respostas['00'][0];
            fallbackMessage = correctOption.fallback;
            isCorrect = true;
        } else {
            // Resposta incorreta selecionada
            const wrongOption = this.getRandomWrongOption();
            fallbackMessage = wrongOption.fallback;
            isCorrect = false;
        }
        
        console.log(`🎯 Resposta selecionada: ${side}, Lado correto: ${this.correctAnswerSide}, É correta: ${isCorrect}`);
        
        // Mostrar mensagem 2D fixa no rosto
        this.show2DFallbackMessage(fallbackMessage, isCorrect);
    }
    
    show2DFallbackMessage(fallbackMessage, isCorrect) {
        if (!this.gameElements2D) return;
        
        // Limpar elementos anteriores com fade-out
        this.fadeOutCurrentElements();
        
        // Aguardar fade-out antes de mostrar nova mensagem
        setTimeout(() => {
            this.createFallbackMessage(fallbackMessage, isCorrect);
        }, 300);
    }
    
    fadeOutCurrentElements() {
        if (!this.gameElements2D) return;
        
        const elements = this.gameElements2D.children;
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            element.style.animation = 'slideOutToBottom 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
            element.style.transition = 'none';
        }
    }
    
    createFallbackMessage(fallbackMessage, isCorrect) {
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
            top: 70%;
            left: 50%;
            opacity: 0;
            transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
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
            font-family: 'Nunito', Arial, sans-serif;
            font-size: 16px;
            font-weight: 700;
            text-align: center;
            width: 280px;
            pointer-events: none;
            user-select: none;
            opacity: 0;
            transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s;
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
                @keyframes slideInFromBottom {
                    from { 
                        transform: translate(-50%, -50%) scale(0.5) translateY(100px);
                        opacity: 0;
                    }
                    to { 
                        transform: translate(-50%, -50%) scale(1) translateY(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutToBottom {
                    from { 
                        transform: translate(-50%, -50%) scale(1) translateY(0);
                        opacity: 1;
                    }
                    to { 
                        transform: translate(-50%, -50%) scale(0.5) translateY(100px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        fallbackBg.appendChild(fallbackText);
        this.gameElements2D.appendChild(fallbackBg);
        
        // Animar entrada dos elementos com slide in
        requestAnimationFrame(() => {
            fallbackBg.style.animation = 'slideInFromBottom 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
            fallbackBg.style.opacity = '1';
            
            fallbackText.style.animation = 'slideInFromBottom 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s forwards';
            fallbackText.style.opacity = '1';
            
            decorativeSphere.style.animation = 'slideInFromBottom 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.5s forwards';
            decorativeSphere.style.opacity = '1';
        });
        
        // Adicionar animação de rotação após entrada
        setTimeout(() => {
            decorativeSphere.style.animation = 'spin 2s linear infinite';
        }, 1200);
        
        // Controlar fluxo baseado na resposta
        setTimeout(() => {
            if (isCorrect) {
                // Resposta correta - atualizar progresso e ir para próxima pergunta
                this.updateProgress();
                this.nextQuestion();
            } else {
                // Resposta incorreta - mostrar a mesma pergunta novamente
                this.showQuestion();
            }
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
        
        // Ir para tela final após 3 segundos
        setTimeout(() => {
            if (window.screenManager) {
                window.screenManager.showScreen('final');
            }
        }, 3000);
    }
    
    show2DGameCompleted() {
        
      
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
    
    updateProgress() {
        if (!this.progressBar || !this.progressFill) return;
        
        this.correctAnswers++;
        const progressPercentage = (this.correctAnswers / this.totalQuestions) * 100;
        
        // Mostrar barra de progresso se ainda não estiver visível
        if (this.progressBar.style.display === 'none') {
            this.progressBar.style.display = 'block';
        }
        
        // Atualizar preenchimento da barra
        this.progressFill.style.width = `${progressPercentage}%`;
        
        console.log(`🎯 Progresso: ${this.correctAnswers}/${this.totalQuestions} (${progressPercentage.toFixed(1)}%)`);
        
        // Adicionar efeito visual quando completar
        if (this.correctAnswers === this.totalQuestions) {
            this.progressFill.style.background = 'linear-gradient(90deg, #FFD700, #FFA500)';
            console.log('🏆 Todas as perguntas respondidas corretamente!');
        }
    }
}

// Exportar para uso global
window.GameScreen = GameScreen;