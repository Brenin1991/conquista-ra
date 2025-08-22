/**
 * Selfie Screen - Tela de Selfie
 * Tela para tirar selfie após completar o puzzle
 */

class SelfieScreen extends BaseScreen {
    constructor() {
        super('selfie', {
            next: 'main',
            onEnter: () => this.handleEnter(),
            onExit: () => this.handleExit()
        });
        
        this.selfieStream = null;
        this.selfieImage = null;
        this.isPhotoTaken = false;
        this.isIOS = this.detectIOS();
        this.currentFase = null;
        
        // Sistema do vaso final completo
        this.vasoElement = null;
        
        // Sistema de zoom
        this.zoomLevel = 1.0;
        this.minZoom = 0.5;
        this.maxZoom = 3.0;
        this.zoomStep = 0.2;
        
        // Sistema de drag (movimento da planta)
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.plantOffsetX = 0;
        this.plantOffsetY = 0;
        this.screenBounds = { width: 0, height: 0 };
    }
    
    onInit() {
        // Configurações específicas da tela de selfie
        this.setupSelfieElements();
        this.setupSelfieControls();
        this.setupCameraIcon();
        
        // Detectar se é mobile
        this.isMobile = this.detectMobile();
        console.log('📱 Dispositivo móvel:', this.isMobile);
        console.log('🍎 iOS detectado:', this.isIOS);
    }
    
    setupSelfieElements() {
        // Configurar elementos da tela de selfie
        this.selfieCamera = this.element.querySelector('#selfie-camera');
        this.selfieCanvas = this.element.querySelector('#selfie-canvas');
        this.selfieImage = this.element.querySelector('#selfie-image');
        this.selfiePreview = this.element.querySelector('#selfie-preview');
    }
    
    setupSelfieControls() {
        // Configurar controles da tela de selfie
        this.setupTakeSelfieButton();
        this.setupRetakeSelfieButton();
        this.setupSaveSelfieButton();
        this.setupBackButton();
        this.setupZoomControls();
    }
    
    setupCameraIcon() {
        // Configurar ícone da câmera para captura da tela
        const cameraIcon = this.element.querySelector('#camera-icon-selfie');
        if (cameraIcon) {
            // Mostrar o botão de selfie
            cameraIcon.style.display = 'block';
            cameraIcon.style.cursor = 'pointer';
            console.log('📷 Botão de selfie configurado');
            
            // Adicionar evento de clique para capturar selfie
            cameraIcon.addEventListener('click', () => {
                this.captureSelfieScreen();
            });
        }
    }
    
    setupTakeSelfieButton() {
        const takeSelfieButton = this.element.querySelector('#btn-take-selfie');
        if (takeSelfieButton) {
            takeSelfieButton.addEventListener('click', () => {
                this.takeSelfie();
            });
        }
    }
    
    setupRetakeSelfieButton() {
        const retakeSelfieButton = this.element.querySelector('#btn-retake-selfie');
        if (retakeSelfieButton) {
            retakeSelfieButton.addEventListener('click', () => {
                this.retakeSelfie();
            });
        }
    }
    
    setupSaveSelfieButton() {
        const saveSelfieButton = this.element.querySelector('#btn-save-selfie');
        if (saveSelfieButton) {
            saveSelfieButton.addEventListener('click', () => {
                this.saveSelfie();
            });
        }
    }
    
    setupBackButton() {
        const backButton = this.element.querySelector('#btn-back-to-congratulations');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.backToCongratulations();
            });
        }
    }
    
    setupZoomControls() {
        // Criar botões de zoom
        this.createZoomButtons();
        
        console.log('🔍 Controles de zoom configurados');
    }
    
    createZoomButtons() {
        // Criar container para os botões de zoom
        const zoomContainer = document.createElement('div');
        zoomContainer.id = 'zoom-controls';
        zoomContainer.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 20px;
            z-index: 1500;
        `;
        
        // Botão zoom-in
        const zoomInBtn = document.createElement('div');
        zoomInBtn.id = 'zoom-in-btn';
        zoomInBtn.style.cssText = `
            width: 60px;
            height: 60px;
            background-image: url('assets/textures/zoom-in.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            cursor: pointer;
            transition: transform 0.2s ease;
        `;
        
        // Botão zoom-out
        const zoomOutBtn = document.createElement('div');
        zoomOutBtn.id = 'zoom-out-btn';
        zoomOutBtn.style.cssText = `
            width: 60px;
            height: 60px;
            background-image: url('assets/textures/zoom-out.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            cursor: pointer;
            transition: transform 0.2s ease;
        `;
        
        // Adicionar eventos de clique
        zoomInBtn.addEventListener('click', () => {
            this.zoomIn();
        });
        
        zoomOutBtn.addEventListener('click', () => {
            this.zoomOut();
        });
        
        // Adicionar efeitos de hover
        zoomInBtn.addEventListener('mouseenter', () => {
            zoomInBtn.style.transform = 'scale(1.1)';
        });
        
        zoomInBtn.addEventListener('mouseleave', () => {
            zoomInBtn.style.transform = 'scale(1)';
        });
        
        zoomOutBtn.addEventListener('mouseenter', () => {
            zoomOutBtn.style.transform = 'scale(1.1)';
        });
        
        zoomOutBtn.addEventListener('mouseleave', () => {
            zoomOutBtn.style.transform = 'scale(1)';
        });
        
        // Adicionar botões ao container
        zoomContainer.appendChild(zoomInBtn);
        zoomContainer.appendChild(zoomOutBtn);
        
        // Adicionar à tela
        if (this.element) {
            this.element.appendChild(zoomContainer);
            console.log('🔍 Botões de zoom criados e adicionados');
        }
    }
    
    zoomIn() {
        if (this.zoomLevel < this.maxZoom) {
            this.zoomLevel += this.zoomStep;
            this.applyZoom();
            console.log('🔍 Zoom in:', this.zoomLevel);
        }
    }
    
    zoomOut() {
        if (this.zoomLevel > this.minZoom) {
            this.zoomLevel -= this.zoomStep;
            this.applyZoom();
            console.log('🔍 Zoom out:', this.zoomLevel);
        }
    }
    
    applyZoom() {
        if (this.vasoElement) {
            // Atualizar dimensões da tela para recalcular limites
            this.updateScreenBounds();
            
            // Aplicar zoom e posição atual
            this.updatePlantPosition();
            
            // Atualizar tamanho base para manter proporções
            const baseWidth = 350;
            const baseHeight = 350;
            this.vasoElement.style.width = `${baseWidth * this.zoomLevel}px`;
            this.vasoElement.style.height = `${baseHeight * this.zoomLevel}px`;
            
            console.log('🔍 Zoom aplicado ao vaso:', this.zoomLevel);
        }
    }
    
    resetZoom() {
        this.zoomLevel = 1.0;
        this.plantOffsetX = 0;
        this.plantOffsetY = 0;
        
        if (this.vasoElement) {
            this.vasoElement.style.transform = 'translate(-50%, 0%) scale(1)';
            this.vasoElement.style.width = '350px';
            this.vasoElement.style.height = '350px';
        }
        console.log('🔍 Zoom resetado');
    }
    
    handleEnter() {
        // Lógica específica ao entrar na tela de selfie
        console.log('📸 Entrou na tela de selfie');
        
        // Atualizar personagem ANTES de inicializar a câmera
        this.updatePersonagem();
        
        // Inicializar câmera
        this.initializeSelfieCamera();
        
        // Configurar animações de entrada
        this.setupSelfieAnimations();
        
        // Inicializar sistema do vaso quando a tela estiver ativa
        console.log('🌱 Inicializando vaso final na entrada da tela...');
        this.setupVasoSystem();
    }
    
    setCurrentFase(fase) {
        this.currentFase = fase;
        console.log('🎮 Fase definida para selfie:', fase);
    }
    
    updatePersonagem() {
        const personagemImg = this.element.querySelector('#personagem-game-selfie');
        if (personagemImg && this.currentFase) {
            const personagemSrc = `assets/textures/${this.currentFase}/personagem-selfie.png`;
            personagemImg.src = personagemSrc;
            console.log('👤 Personagem selfie atualizado para:', personagemSrc);
        }
    }
    
    handleExit() {
        // Lógica específica ao sair da tela de selfie
        console.log('👋 Saiu da tela de selfie');
        
        // Parar câmera
        this.stopSelfieCamera();
        
        // Limpar animações
        this.cleanupAnimations();
        
        // Resetar zoom
        this.resetZoom();
        
        // Limpar sistema do vaso
        this.cleanupVasoSystem();
    }
    
    async initializeSelfieCamera() {
        try {
            console.log('📷 Inicializando câmera de selfie...');
            
            // Configurações específicas para mobile
            const constraints = {
                video: {
                    facingMode: 'user', // Câmera frontal
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    aspectRatio: { ideal: 16/9 }
                },
                audio: false
            };
            
            // Tentar câmera frontal primeiro
            try {
                this.selfieStream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('✅ Câmera frontal inicializada');
            } catch (frontError) {
                console.log('⚠️ Câmera frontal falhou, tentando traseira...');
                
                // Se falhar, tentar câmera traseira
                const backConstraints = {
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1280, max: 1920 },
                        height: { ideal: 720, max: 1080 },
                        aspectRatio: { ideal: 16/9 }
                    },
                    audio: false
                };
                
                this.selfieStream = await navigator.mediaDevices.getUserMedia(backConstraints);
                console.log('✅ Câmera traseira inicializada como fallback');
            }
            
            // Conectar stream ao vídeo
            if (this.selfieCamera) {
                this.selfieCamera.srcObject = this.selfieStream;
                
                // Configurar para mobile
                this.selfieCamera.style.objectFit = 'cover';
                this.selfieCamera.style.width = '100%';
                this.selfieCamera.style.height = '100%';
                
                // Aguardar vídeo carregar
                await new Promise((resolve) => {
                    this.selfieCamera.onloadedmetadata = () => {
                        console.log('✅ Vídeo carregado:', this.selfieCamera.videoWidth, 'x', this.selfieCamera.videoHeight);
                        resolve();
                    };
                });
                
                console.log('✅ Câmera de selfie inicializada com sucesso');
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar câmera de selfie:', error);
            this.showCameraError();
        }
    }
    
    stopSelfieCamera() {
        if (this.selfieStream) {
            this.selfieStream.getTracks().forEach(track => track.stop());
            this.selfieStream = null;
            console.log('📷 Câmera de selfie parada');
        }
    }
    
    takeSelfie() {
        if (!this.selfieCamera || !this.selfieCanvas) {
            console.error('❌ Elementos de câmera não encontrados');
            return;
        }
        
        try {
            console.log('📸 Tirando selfie...');
            
            // Configurar canvas com tamanho otimizado para mobile
            const context = this.selfieCanvas.getContext('2d');
            
            // Usar dimensões da tela para melhor qualidade no mobile
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            
            this.selfieCanvas.width = screenWidth;
            this.selfieCanvas.height = screenHeight;
            
            // Calcular proporções para manter aspect ratio
            const videoAspect = this.selfieCamera.videoWidth / this.selfieCamera.videoHeight;
            const canvasAspect = screenWidth / screenHeight;
            
            let drawWidth, drawHeight, offsetX, offsetY;
            
            if (videoAspect > canvasAspect) {
                // Vídeo mais largo que canvas
                drawHeight = screenHeight;
                drawWidth = screenHeight * videoAspect;
                offsetX = (screenWidth - drawWidth) / 2;
                offsetY = 0;
            } else {
                // Vídeo mais alto que canvas
                drawWidth = screenWidth;
                drawHeight = screenWidth / videoAspect;
                offsetX = 0;
                offsetY = (screenHeight - drawHeight) / 2;
            }
            
            // Desenhar vídeo no canvas (espelhado para selfie)
            context.scale(-1, 1);
            context.translate(-screenWidth, 0);
            context.drawImage(this.selfieCamera, offsetX, offsetY, drawWidth, drawHeight);
            
            // Converter para imagem com alta qualidade
            const imageData = this.selfieCanvas.toDataURL('image/jpeg', 0.9);
            
            // Mostrar preview
            this.showSelfiePreview(imageData);
            
            // Atualizar botões
            this.updateSelfieButtons(true);
            
            this.isPhotoTaken = true;
            console.log('✅ Selfie tirada com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao tirar selfie:', error);
        }
    }
    
    showSelfiePreview(imageData) {
        if (this.selfieImage && this.selfiePreview) {
            this.selfieImage.src = imageData;
            this.selfiePreview.style.display = 'flex';
            
            // Esconder preview após 3 segundos
            setTimeout(() => {
                this.selfiePreview.style.display = 'none';
            }, 3000);
        }
    }
    
    retakeSelfie() {
        console.log('🔄 Tirando selfie novamente');
        
        // Esconder preview
        if (this.selfiePreview) {
            this.selfiePreview.style.display = 'none';
        }
        
        // Atualizar botões
        this.updateSelfieButtons(false);
        
        this.isPhotoTaken = false;
    }
    
    saveSelfie() {
        if (!this.isPhotoTaken) {
            console.warn('⚠️ Nenhuma selfie tirada');
            return;
        }
        
        try {
            console.log('💾 Salvando selfie...');
            
            // Usar método otimizado para iOS
            this.saveImageOptimized(this.selfieImage.src, `selfie-${Date.now()}.jpg`);
            
        } catch (error) {
            console.error('❌ Erro ao salvar selfie:', error);
        }
    }
    
    // Método otimizado para salvar imagens (compatível com iOS)
    saveImageOptimized(dataURL, filename) {
        try {
            // Converter data URL para blob
            const byteString = atob(dataURL.split(',')[1]);
            const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            
            const blob = new Blob([ab], { type: mimeString });
            
            // Método 1: Usar Web Share API (melhor para iOS)
            if (navigator.share && this.isIOS) {
                this.shareImage(blob, filename);
                return;
            }
            
            // Método 2: Usar FileSaver.js se disponível
            if (typeof saveAs !== 'undefined') {
                saveAs(blob, filename);
                console.log('✅ Imagem salva usando FileSaver.js');
                this.showSaveFeedback();
                return;
            }
            
            // Método 3: Usar URL.createObjectURL (fallback)
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            // Para iOS, usar target="_blank"
            if (this.isIOS) {
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
            }
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Limpar URL após um tempo
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
            
            console.log('✅ Imagem salva usando URL.createObjectURL');
            this.showSaveFeedback();
            
        } catch (error) {
            console.error('❌ Erro no método otimizado:', error);
            
            // Fallback: método original
            this.saveImageFallback(dataURL, filename);
        }
    }
    
    // Método para compartilhar imagem usando Web Share API
    async shareImage(blob, filename) {
        try {
            console.log('📤 Compartilhando imagem via Web Share API...');
            
            // Criar arquivo para compartilhamento
            const file = new File([blob], filename, { type: blob.type });
            
            // Configurar dados para compartilhamento
            const shareData = {
                title: 'Minha Selfie AR',
                text: 'Confira minha selfie tirada na experiência de Realidade Aumentada!',
                files: [file]
            };
            
            // Tentar compartilhar
            if (navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
                console.log('✅ Imagem compartilhada com sucesso via Web Share API');
                this.showShareFeedback();
            } else {
                console.log('⚠️ Web Share API não suporta arquivos, tentando método alternativo');
                this.fallbackShare(blob, filename);
            }
            
        } catch (error) {
            console.error('❌ Erro ao compartilhar:', error);
            
            // Se o usuário cancelou o compartilhamento, não mostrar erro
            if (error.name === 'AbortError') {
                console.log('👤 Usuário cancelou o compartilhamento');
                return;
            }
            
            // Fallback para outros métodos
            this.fallbackShare(blob, filename);
        }
    }
    
    // Fallback para compartilhamento
    fallbackShare(blob, filename) {
        try {
            console.log('🔄 Usando método fallback para compartilhamento...');
            
            // Criar URL temporária
            const url = URL.createObjectURL(blob);
            
            // Criar link de compartilhamento
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            // Para iOS, abrir em nova aba
            if (this.isIOS) {
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
            }
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Limpar URL
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
            
            console.log('✅ Imagem salva usando método fallback');
            this.showSaveFeedback();
            
        } catch (error) {
            console.error('❌ Erro no fallback:', error);
            this.showErrorFeedback('Erro ao salvar/compartilhar imagem');
        }
    }
    
    // Fallback para navegadores mais antigos
    saveImageFallback(dataURL, filename) {
        try {
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataURL;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ Imagem salva usando método fallback');
            this.showSaveFeedback();
            
        } catch (error) {
            console.error('❌ Erro no fallback:', error);
            this.showErrorFeedback('Erro ao salvar imagem');
        }
    }
    
    showSaveFeedback() {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 18000;
            background: rgba(0, 255, 0, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        `;
        
        feedback.textContent = '💾 Selfie salva!';
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 2000);
    }
    
    showShareFeedback() {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 18000;
            background: rgba(0, 150, 255, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        `;
        
        feedback.textContent = '📤 Compartilhando...';
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 2000);
    }
    
    showCameraError() {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 18000;
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        `;
        
        errorDiv.textContent = '❌ Erro ao acessar câmera';
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 3000);
    }
    
    async captureSelfieScreen() {
        try {
            console.log('📸 Capturando tela de selfie...');
            
            // Esconder temporariamente o botão da câmera
            const cameraIcon = this.element.querySelector('#camera-icon-selfie');
            let originalDisplay = '';
            if (cameraIcon) {
                originalDisplay = cameraIcon.style.display;
                cameraIcon.style.display = 'none';
            }
            
            // Mostrar feedback de captura
            this.showCaptureFeedback();
            
            // Aguardar um pouco para o feedback aparecer
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verificar se html2canvas está disponível
            if (typeof html2canvas === 'undefined') {
                console.error('❌ html2canvas não está disponível');
                this.showErrorFeedback('Biblioteca html2canvas não carregada');
                return;
            }
            
            // Configurações otimizadas para mobile
            const options = {
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#000000',
                scale: window.devicePixelRatio || 2, // Usar pixel ratio do dispositivo
                logging: false,
                width: window.innerWidth,
                height: window.innerHeight,
                scrollX: 0,
                scrollY: 0,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
                // Configurações específicas para mobile
                foreignObjectRendering: false, // Melhor compatibilidade mobile
                removeContainer: true,
                ignoreElements: (element) => {
                    // Ignorar elementos que podem causar problemas
                    return element.classList.contains('capture-ignore') || 
                           element.id === 'camera-icon-selfie' || // Ignorar botão da câmera
                           element.classList.contains('camera-icon-selfie') || // Ignorar por classe também
                           element.closest('#camera-icon-selfie') !== null; // Ignorar se for filho do botão
                }
            };
            
            // Capturar a tela de selfie
            const canvas = await html2canvas(this.element, options);
            
            // Converter para imagem com qualidade otimizada
            const imageData = canvas.toDataURL('image/jpeg', 0.9);
            
            // Salvar a imagem usando método otimizado
            this.saveCapturedImageOptimized(imageData);
            
            // Restaurar o botão da câmera
            if (cameraIcon) {
                cameraIcon.style.display = originalDisplay;
            }
            
            console.log('✅ Tela de selfie capturada com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao capturar tela de selfie:', error);
            this.showErrorFeedback('Erro ao capturar imagem');
            
            // Restaurar o botão da câmera mesmo em caso de erro
            if (cameraIcon) {
                cameraIcon.style.display = originalDisplay;
            }
        }
    }
    
    saveCapturedImageOptimized(imageData) {
        try {
            // Usar método otimizado para salvar/compartilhar
            this.saveImageOptimized(imageData, `selfie-certificado-${Date.now()}.jpg`);
            
            console.log('💾 Imagem capturada processada com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao processar imagem capturada:', error);
            this.showErrorFeedback('Erro ao processar imagem');
        }
    }
    
    // Método antigo (mantido para compatibilidade)
    saveCapturedImage(imageData) {
        this.saveCapturedImageOptimized(imageData);
    }
    
    showCaptureFeedback() {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 18000;
            background: rgba(0, 150, 255, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        `;
        
        feedback.textContent = '📸 Capturando...';
        feedback.id = 'capture-feedback';
        document.body.appendChild(feedback);
        
        // Remover após 2 segundos
        setTimeout(() => {
            const element = document.getElementById('capture-feedback');
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 2000);
    }
    
    showSaveSuccessFeedback() {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 18000;
            background: rgba(0, 255, 0, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        `;
        
        feedback.textContent = '💾 Certificado salvo!';
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 3000);
    }
    
    showErrorFeedback(message) {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 18000;
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        `;
        
        feedback.textContent = `❌ ${message}`;
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 3000);
    }
    
    updateSelfieButtons(photoTaken) {
        const takeButton = this.element.querySelector('#btn-take-selfie');
        const retakeButton = this.element.querySelector('#btn-retake-selfie');
        const saveButton = this.element.querySelector('#btn-save-selfie');
        
        if (photoTaken) {
            if (takeButton) takeButton.style.display = 'none';
            if (retakeButton) retakeButton.style.display = 'inline-block';
            if (saveButton) saveButton.style.display = 'inline-block';
        } else {
            if (takeButton) takeButton.style.display = 'inline-block';
            if (retakeButton) retakeButton.style.display = 'none';
            if (saveButton) saveButton.style.display = 'none';
        }
    }
    
    backToCongratulations() {
        console.log('⬅️ Voltando para tela de parabéns');
        
        if (window.screenManager) {
            window.screenManager.showScreen('congratulations');
        }
    }
    
    setupSelfieAnimations() {
        // Configurar animações de entrada da tela de selfie
        const selfieElements = this.element.querySelectorAll('.selfie-button');
        selfieElements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = this.isMobile ? 'translateY(30px)' : 'translateY(20px)';
            
            setTimeout(() => {
                element.style.transition = 'all 0.5s ease';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * (this.isMobile ? 150 : 200));
        });
        
        // Animar ícone da câmera se for mobile
        if (this.isMobile) {
            const cameraIcon = this.element.querySelector('#camera-icon-selfie');
            if (cameraIcon) {
                cameraIcon.style.opacity = '0';
                cameraIcon.style.transform = 'scale(0.8)';
                
                setTimeout(() => {
                    cameraIcon.style.transition = 'all 0.5s ease';
                    cameraIcon.style.opacity = '1';
                    cameraIcon.style.transform = 'scale(1)';
                }, 500);
            }
        }
    }
    
    cleanupAnimations() {
        // Limpar animações da tela de selfie
        const selfieElements = this.element.querySelectorAll('.selfie-button');
        selfieElements.forEach(element => {
            element.style.opacity = '';
            element.style.transform = '';
            element.style.transition = '';
        });
    }
    
    setupVasoSystem() {
        // Configurar botão finalizar (escondido inicialmente)
        this.setupFinalizarButton();
        
        // Criar elemento do vaso final completo
        this.createVasoElement();
        
        // Configurar sistema de drag para a planta
        this.setupPlantDrag();
        
        console.log('🌱 Sistema do vaso final configurado');
    }
    
    setupFinalizarButton() {
        // Configurar botão finalizar
        const finalizarBtn = document.getElementById('finalizar-btn');
        if (finalizarBtn) {
            // Esconder inicialmente
            finalizarBtn.style.display = 'none';
            finalizarBtn.style.opacity = '0';
            finalizarBtn.style.transition = 'opacity 0.5s ease-in-out';
            
            // Adicionar evento de clique para reload
            finalizarBtn.addEventListener('click', () => {
                console.log('🔄 Recarregando página...');
                window.location.reload();
            });
            
            console.log('✅ Botão finalizar configurado (escondido)');
        } else {
            console.warn('⚠️ Botão finalizar não encontrado');
        }
    }
    
    createVasoElement() {
        console.log('🌱 Criando elemento do vaso final completo...');
        console.log('🌱 Elemento da tela existe:', !!this.element);
        
        // Obter textura do vaso do JSON
        const vasoTexture = window.selectedFase && window.selectedFase['vazo-final-completo'] 
            ? window.selectedFase['vazo-final-completo'] 
            : 'assets/textures/reacoes/raiva/vazo_final_completo.png';
        
        console.log('🔍 Textura do vaso:', vasoTexture);
        
        // Criar elemento do vaso final completo central
        this.vasoElement = document.createElement('div');
        this.vasoElement.id = 'vaso-final-selfie';
        this.vasoElement.style.cssText = `
            position: absolute;
            bottom: 10%;
            left: 50%;
            transform: translate(-50%, 0%);
            width: 350px;
            height: 350px;
            background-image: url('${vasoTexture}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            z-index: 1000;
            transition: all 0.3s ease-in-out;
            opacity: 0;
            cursor: grab;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        `;
        
        // Adicionar apenas na tela de selfie
        if (this.element) {
            this.element.appendChild(this.vasoElement);
            console.log('🌱 Elemento do vaso final criado e adicionado à tela');
            
            // Fazer o vaso aparecer com animação
            setTimeout(() => {
                this.vasoElement.style.opacity = '1';
                this.vasoElement.style.transform = 'translate(-50%, 0%) scale(1.1)';
                
                setTimeout(() => {
                    this.vasoElement.style.transform = 'translate(-50%, 0%) scale(1)';
                }, 300);
            }, 500);
        } else {
            console.error('❌ Elemento da tela não existe!');
        }
    }
    
    setupPlantDrag() {
        if (!this.vasoElement) return;
        
        // Atualizar dimensões da tela
        this.updateScreenBounds();
        
        // Adicionar eventos de mouse/touch para desktop
        this.vasoElement.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        
        // Adicionar eventos de touch para mobile
        this.vasoElement.addEventListener('touchstart', (e) => this.startDrag(e));
        document.addEventListener('touchmove', (e) => this.drag(e));
        document.addEventListener('touchend', () => this.stopDrag());
        
        // Prevenir comportamento padrão do touch
        this.vasoElement.addEventListener('touchstart', (e) => e.preventDefault());
        this.vasoElement.addEventListener('touchmove', (e) => e.preventDefault());
        
        // Adicionar listener para redimensionamento da janela
        this.resizeListener = () => this.updateScreenBounds();
        window.addEventListener('resize', this.resizeListener);
        
        console.log('🖱️ Sistema de drag configurado para a planta');
    }
    
    updateScreenBounds() {
        this.screenBounds.width = window.innerWidth;
        this.screenBounds.height = window.innerHeight;
    }
    
    startDrag(e) {
        this.isDragging = true;
        
        // Obter coordenadas do evento (mouse ou touch)
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        this.dragStartX = clientX - this.plantOffsetX;
        this.dragStartY = clientY - this.plantOffsetY;
        
        // Adicionar cursor de arrastar
        if (this.vasoElement) {
            this.vasoElement.style.cursor = 'grabbing';
        }
        
        console.log('🖱️ Iniciando drag da planta');
    }
    
    drag(e) {
        if (!this.isDragging) return;
        
        // Obter coordenadas do evento (mouse ou touch)
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        // Calcular nova posição
        let newX = clientX - this.dragStartX;
        let newY = clientY - this.dragStartY;
        
        // Aplicar limites para manter a planta dentro da tela
        const plantSize = 350 * this.zoomLevel;
        const maxOffsetX = (this.screenBounds.width - plantSize) / 2;
        const maxOffsetY = (this.screenBounds.height - plantSize) / 2;
        
        // Limitar movimento horizontal
        if (newX > maxOffsetX) newX = maxOffsetX;
        if (newX < -maxOffsetX) newX = -maxOffsetX;
        
        // Limitar movimento vertical
        if (newY > maxOffsetY) newY = maxOffsetY;
        if (newY < -maxOffsetY) newY = -maxOffsetY;
        
        // Atualizar offset da planta
        this.plantOffsetX = newX;
        this.plantOffsetY = newY;
        
        // Aplicar nova posição
        this.updatePlantPosition();
    }
    
    stopDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        // Restaurar cursor normal
        if (this.vasoElement) {
            this.vasoElement.style.cursor = 'grab';
        }
        
        console.log('🖱️ Parando drag da planta');
    }
    
    updatePlantPosition() {
        if (!this.vasoElement) return;
        
        // Aplicar posição com zoom e offset
        this.vasoElement.style.transform = `translate(calc(-50% + ${this.plantOffsetX}px), calc(0% + ${this.plantOffsetY}px)) scale(${this.zoomLevel})`;
    }
    
    // Detectar se é dispositivo móvel
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    }
    
    // Detectar se é iOS
    detectIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }
    
    // Método de teste para verificar se a captura funciona
    testCapture() {
        console.log('🧪 Testando captura de tela...');
        this.captureSelfieScreen();
    }

    cleanupVasoSystem() {
        // Remover elemento do vaso
        if (this.vasoElement) {
            // Remover eventos de drag
            this.removeDragEvents();
            this.vasoElement.remove();
            this.vasoElement = null;
        }
        
        // Remover controles de zoom
        const zoomControls = this.element.querySelector('#zoom-controls');
        if (zoomControls) {
            zoomControls.remove();
        }
        
        // Esconder botão finalizar
        const finalizarBtn = document.getElementById('finalizar-btn');
        if (finalizarBtn) {
            finalizarBtn.style.display = 'none';
            finalizarBtn.style.opacity = '0';
        }
        
        // Resetar zoom e posição
        this.zoomLevel = 1.0;
        this.plantOffsetX = 0;
        this.plantOffsetY = 0;
        this.isDragging = false;
        
        console.log('🧹 Sistema do vaso e controles de zoom limpos');
    }
    
    removeDragEvents() {
        // Remover eventos de mouse
        document.removeEventListener('mousemove', (e) => this.drag(e));
        document.removeEventListener('mouseup', () => this.stopDrag());
        
        // Remover eventos de touch
        document.removeEventListener('touchmove', (e) => this.drag(e));
        document.removeEventListener('touchend', () => this.stopDrag());
        
        // Remover listener de redimensionamento
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
        }
        
        console.log('🖱️ Eventos de drag removidos');
    }
}

// Exportar para uso global
window.SelfieScreen = SelfieScreen;
