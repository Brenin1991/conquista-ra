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
        
        // Sistema de dente de leão interativo
        this.denteLeaoElement = null;
        this.isDenteLeaoBlown = false;
        this.motionDetector = null;
        this.lastMotionTime = 0;
        this.motionThreshold = 15; // Sensibilidade do movimento
        this.petalasElements = [];
        this.isMotionEnabled = false;
        this.motionHandler = null;
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
    }
    
    setupCameraIcon() {
        // Configurar ícone da câmera para captura da tela
        const cameraIcon = this.element.querySelector('#camera-icon-selfie');
        if (cameraIcon) {
            // Esconder o botão de selfie
            cameraIcon.style.display = 'none';
            console.log('📷 Botão de selfie escondido');
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
    
    handleEnter() {
        // Lógica específica ao entrar na tela de selfie
        console.log('📸 Entrou na tela de selfie');
        
        // Atualizar personagem ANTES de inicializar a câmera
        this.updatePersonagem();
        
        // Inicializar câmera
        this.initializeSelfieCamera();
        
        // Configurar animações de entrada
        this.setupSelfieAnimations();
        
        // Inicializar sistema de dente de leão quando a tela estiver ativa
        console.log('🌼 Inicializando dente de leão na entrada da tela...');
        this.setupDenteLeaoSystem();
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
        
        // Limpar sistema de dente de leão
        this.cleanupDenteLeaoSystem();
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
    
    setupDenteLeaoSystem() {
        // Injetar animações CSS primeiro
        this.injectDenteLeaoAnimations();
        
        // Configurar botão finalizar (escondido inicialmente)
        this.setupFinalizarButton();
        
        // Criar elemento do dente de leão
        this.createDenteLeaoElement();
        
        // Configurar detecção de movimento se for mobile
        if (this.isMobile) {
            this.setupMotionDetection();
            console.log('🌪️ Sistema de detecção de movimento configurado');
        } else {
            console.log('💻 Dispositivo desktop - movimento desabilitado');
        }
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
    
    createDenteLeaoElement() {
        console.log('🌼 Criando elemento do dente de leão...');
        console.log('🌼 Elemento da tela existe:', !!this.element);
        
        // Criar elemento do dente de leão central
        this.denteLeaoElement = document.createElement('div');
        this.denteLeaoElement.id = 'dente-leao-interactive';
        this.denteLeaoElement.style.cssText = `
            position: absolute;
            bottom: 0%;
            left: 50%;
            transform: translate(-50%, 0%);
            width: 300px;
            height: 300px;
            background-image: url('assets/textures/selfie/dente_de_leao.png');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            z-index: 1000;
            pointer-events: none;
            transition: all 0.5s ease-in-out;
        `;
        
        // Adicionar apenas na tela de selfie
        if (this.element) {
            this.element.appendChild(this.denteLeaoElement);
            console.log('🌼 Elemento do dente de leão criado e adicionado à tela');
            
            // Adicionar botão de simulação para PC
            this.createSimulateButton();
        } else {
            console.error('❌ Elemento da tela não existe!');
        }
    }
    
    createSimulateButton() {
        // Criar botão de simulação para PC
        const simulateButton = document.createElement('button');
        simulateButton.id = 'simulate-motion-btn';
        simulateButton.textContent = '💨 Soprar Dente de Leão';
        simulateButton.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: #4ECDC4;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'Nunito', Arial, sans-serif;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            z-index: 2000;
            transition: all 0.3s ease;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        `;
        
        // Efeitos hover
        simulateButton.addEventListener('mouseenter', () => {
            simulateButton.style.background = '#45B7AA';
            simulateButton.style.transform = 'scale(1.05)';
        });
        
        simulateButton.addEventListener('mouseleave', () => {
            simulateButton.style.background = '#4ECDC4';
            simulateButton.style.transform = 'scale(1)';
        });
        
        // Simular sopro
        simulateButton.addEventListener('click', () => {
            console.log('💨 Botão de simulação clicado!');
            if (this.denteLeaoElement) {
                this.blowDenteLeao();
            } else {
                console.error('❌ Elemento do dente de leão não encontrado');
            }
        });
        
        this.element.appendChild(simulateButton);
        console.log('🎮 Botão de simulação criado');
    }
    
    setupMotionDetection() {
        // Verificar se o dispositivo suporta eventos de movimento
        if (window.DeviceMotionEvent) {
            this.isMotionEnabled = true;
            
            // Configurar listener para movimento do dispositivo
            const motionHandler = (event) => {
                this.handleDeviceMotion(event);
            };
            
            // Adicionar listener com opções
            window.addEventListener('devicemotion', motionHandler, { passive: true });
            
            // Guardar referência para remoção posterior
            this.motionHandler = motionHandler;
            
            console.log('📱 Detecção de movimento ativada');
            
            // Testar se está funcionando
            setTimeout(() => {
                console.log('🔍 Testando detecção de movimento...');
                console.log('📱 DeviceMotionEvent disponível:', !!window.DeviceMotionEvent);
                console.log('📱 Listener ativo:', this.isMotionEnabled);
            }, 1000);
        } else {
            console.warn('⚠️ Dispositivo não suporta detecção de movimento');
        }
    }
    
    handleDeviceMotion(event) {
        if (!this.isMotionEnabled || this.isDenteLeaoBlown) return;
        
        const currentTime = Date.now();
        
        // Evitar múltiplas detecções em sequência
        if (currentTime - this.lastMotionTime < 1000) return;
        
        // Obter dados de aceleração (tentar diferentes propriedades)
        let acceleration = event.accelerationIncludingGravity;
        if (!acceleration) {
            acceleration = event.acceleration;
        }
        if (!acceleration) {
            console.log('⚠️ Nenhum dado de aceleração disponível');
            return;
        }
        
        // Calcular magnitude do movimento
        const x = acceleration.x || 0;
        const y = acceleration.y || 0;
        const z = acceleration.z || 0;
        
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        
        // Log para debug (apenas a cada 2 segundos)
        if (currentTime - this.lastMotionTime > 2000) {
            console.log('📱 Dados de movimento:', { x, y, z, magnitude, threshold: this.motionThreshold });
        }
        
        // Verificar se o movimento é forte o suficiente
        if (magnitude > this.motionThreshold) {
            this.blowDenteLeao();
            this.lastMotionTime = currentTime;
            console.log('💨 Movimento detectado! Magnitude:', magnitude, 'X:', x, 'Y:', y, 'Z:', z);
        }
    }
    
    blowDenteLeao() {
        if (this.isDenteLeaoBlown || !this.denteLeaoElement) {
            console.warn('⚠️ Dente de leão já soprado ou elemento não existe');
            return;
        }
        
        this.isDenteLeaoBlown = true;
        
        // Trocar textura para dente de leão soprado
        this.denteLeaoElement.style.backgroundImage = "url('assets/textures/selfie/dente_de_leao_2.png')";
        
        // Adicionar animação de sopro
        this.denteLeaoElement.style.animation = 'dente-leao-blow 1s ease-out forwards';
        
        // Criar efeito de pétalas
        this.createPetalasEffect();
        
        // Mostrar botão finalizar após um delay
        setTimeout(() => {
            this.showFinalizarButton();
        }, 2000); // 2 segundos após soprar
        
        console.log('🌼 Dente de leão soprado!');
    }
    
    showFinalizarButton() {
        // Mostrar botão finalizar com animação
        const finalizarBtn = document.getElementById('finalizar-btn');
        if (finalizarBtn) {
            finalizarBtn.style.display = 'block';
            
            // Animar entrada
            setTimeout(() => {
                finalizarBtn.style.opacity = '1';
            }, 100);
            
            console.log('✅ Botão finalizar apareceu!');
        }
    }
    
    createPetalasEffect() {
        // Criar múltiplas pétalas voando
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.createPetala();
            }, i * 80); // Delay escalonado mais rápido
        }
    }
    
    createPetala() {
        const petala = document.createElement('div');
        const petalaNumber = Math.floor(Math.random() * 36) + 1; // 1-36
        const petalaSrc = `assets/textures/selfie/petalas/dente_${petalaNumber}.png`;
        
        // Posição inicial (centro do dente de leão relativo à tela de selfie)
        const startX = this.element.offsetWidth / 2;
        const startY = this.element.offsetHeight / 2;
        
        // Direção aleatória mais espalhada
        const angle = Math.random() * Math.PI * 2;
        const distance = 150 + Math.random() * 400; // Mais variação na distância
        const endX = startX + Math.cos(angle) * distance;
        const endY = startY + Math.sin(angle) * distance;
        
        // Tamanho aleatório da pétala
        const size = 25 + Math.random() * 30; // 25-55px
        
        // Rotação inicial aleatória
        const initialRotation = Math.random() * 360;
        
        petala.style.cssText = `
            position: absolute;
            top: ${startY}px;
            left: ${startX}px;
            width: ${size}px;
            height: ${size}px;
            background-image: url('${petalaSrc}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            z-index: 999;
            pointer-events: none;
            transform: translate(-50%, -50%) rotate(${initialRotation}deg);
            animation: petala-float 4s ease-out forwards;
            --end-x: ${endX}px;
            --end-y: ${endY}px;
            --rotation: ${initialRotation + 720 + Math.random() * 360}deg;
        `;
        
        // Adicionar apenas na tela de selfie
        this.element.appendChild(petala);
        this.petalasElements.push(petala);
        
        // Remover pétala após animação
        setTimeout(() => {
            if (petala.parentNode) {
                petala.parentNode.removeChild(petala);
            }
            this.petalasElements = this.petalasElements.filter(p => p !== petala);
        }, 4000);
    }
    
    injectDenteLeaoAnimations() {
        const style = document.createElement('style');
        style.id = 'dente-leao-animations';
        style.textContent = `
            @keyframes dente-leao-blow {
                0% { 
                    transform: translate(-50%, 0%) scale(1);
                    opacity: 1;
                }
                50% { 
                    transform: translate(-50%, 0%) scale(1.2);
                    opacity: 0.8;
                }
                100% { 
                    transform: translate(-50%, 0%) scale(0.8);
                    opacity: 0.6;
                }
            }
            
            @keyframes petala-float {
                0% { 
                    transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) scale(1);
                    opacity: 1;
                }
                25% {
                    transform: translate(calc(var(--end-x, 100px) * 0.25 - 50%), calc(var(--end-y, 100px) * 0.25 - 50%)) rotate(calc(var(--rotation, 0deg) * 0.25)) scale(0.9);
                    opacity: 1;
                }
                50% {
                    transform: translate(calc(var(--end-x, 100px) * 0.5 - 50%), calc(var(--end-y, 100px) * 0.5 - 50%)) rotate(calc(var(--rotation, 0deg) * 0.5)) scale(0.8);
                    opacity: 0.8;
                }
                75% {
                    transform: translate(calc(var(--end-x, 100px) * 0.75 - 50%), calc(var(--end-y, 100px) * 0.75 - 50%)) rotate(calc(var(--rotation, 0deg) * 0.75)) scale(0.6);
                    opacity: 0.5;
                }
                100% { 
                    transform: translate(calc(var(--end-x, 100px) - 50%), calc(var(--end-y, 100px) - 50%)) rotate(var(--rotation, 0deg)) scale(0.3);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
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

    cleanupDenteLeaoSystem() {
        // Remover elemento do dente de leão
        if (this.denteLeaoElement) {
            this.denteLeaoElement.remove();
            this.denteLeaoElement = null;
        }
        
        // Remover botão de simulação
        const simulateButton = document.getElementById('simulate-motion-btn');
        if (simulateButton) {
            simulateButton.remove();
        }
        
        // Remover todas as pétalas
        this.petalasElements.forEach(petala => {
            petala.remove();
        });
        this.petalasElements = [];
        
        // Esconder botão finalizar
        const finalizarBtn = document.getElementById('finalizar-btn');
        if (finalizarBtn) {
            finalizarBtn.style.display = 'none';
            finalizarBtn.style.opacity = '0';
        }
        
        // Remover listener de movimento
        if (this.isMotionEnabled && this.motionHandler) {
            window.removeEventListener('devicemotion', this.motionHandler);
            this.isMotionEnabled = false;
            this.motionHandler = null;
        }
        
        // Remover animações CSS
        const styleElement = document.getElementById('dente-leao-animations');
        if (styleElement) {
            styleElement.remove();
        }
        
        // Resetar estado
        this.isDenteLeaoBlown = false;
        this.lastMotionTime = 0;
        
        console.log('🧹 Sistema de dente de leão limpo');
    }
}

// Exportar para uso global
window.SelfieScreen = SelfieScreen;