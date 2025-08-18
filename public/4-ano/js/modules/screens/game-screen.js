/**
 * Game Screen - Tela do Jogo
 * Jogo de RA com boneco e reações emocionais
 */

class GameScreen extends BaseScreen {
    constructor() {
        super('game', { 
            next: 'final',
            onEnter: () => this.handleEnter(),
            onExit: () => this.handleExit()
        });
        
        this.currentEmotion = 'normal';
        this.selectedButton = null;
        this.onInit();
    }
    
    async loadGameData() {
        try {
            const response = await fetch('assets/data/data.json');
            this.gameData = await response.json();
            console.log('✅ Dados do jogo carregados:', this.gameData);
        } catch (error) {
            console.error('❌ Erro ao carregar dados do jogo:', error);
        }
    }
    
    onInit() {
        this.loadGameData();
        this.cameraStream = null;
        this.dialogTimeout = null;
        this.currentDialogIndex = 0;
        this.currentDialogs = [];
    }

    async initCamera() {
        try {
            // Solicitar acesso à câmera
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Câmera traseira
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            // Criar elemento de vídeo
            const videoElement = document.createElement('video');
            videoElement.id = 'camera-video';
            videoElement.autoplay = true;
            videoElement.muted = true;
            videoElement.playsInline = true;
            videoElement.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                object-fit: cover;
                z-index: 1;
                transform: scaleX(-1);
            `;

            // Conectar stream ao vídeo
            videoElement.srcObject = this.cameraStream;
            
            // Adicionar ao DOM
            document.body.appendChild(videoElement);
            
            console.log('📹 Câmera inicializada com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao acessar câmera:', error);
            // Fallback: usar imagem de fundo
            this.setFallbackBackground();
        }
    }

    setFallbackBackground() {
        const gameContainer = document.getElementById('game');
        if (gameContainer) {
            gameContainer.style.backgroundImage = 'url(assets/textures/game-bg.png)';
            gameContainer.style.backgroundSize = 'cover';
            gameContainer.style.backgroundPosition = 'center';
        }
    }
     
    handleEnter() {
        console.log('🎮 Entrou na tela do jogo de RA');

        this.initCamera();
        this.createReactionButtons();
        this.initAFrameScene();
        this.animateGameElements();
    }

    createReactionButtons() {
        const botoesContainer = document.getElementById('botoes-container');
        if (!botoesContainer || !this.gameData) return;

        // Limpar container
        botoesContainer.innerHTML = '';

        // Criar botões baseados no JSON
        this.gameData.botoes.forEach((botao, index) => {
            const buttonDiv = document.createElement('div');
            buttonDiv.className = 'reaction-button';
            buttonDiv.dataset.emotion = botao.nome;
            buttonDiv.dataset.index = index;
            
            buttonDiv.innerHTML = `<img src="${botao.url}" alt="${botao.nome}">`;
            
            // Adicionar evento de clique
            buttonDiv.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.SoundManager.forceAudioActivation();
                window.SoundManager.playSoundWithControl('click');
                this.selectEmotion(botao.nome, index);
            });
            
            // Adicionar evento de touch para melhor responsividade
            buttonDiv.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.SoundManager.forceAudioActivation();
                window.SoundManager.playSoundWithControl('click');
                this.selectEmotion(botao.nome, index);
            });
            
            botoesContainer.appendChild(buttonDiv);
        });

        // Adicionar funcionalidade de swipe
        this.addSwipeFunctionality(botoesContainer);

        // Adicionar estilos CSS dinamicamente
        this.addButtonStyles();
    }

    addSwipeFunctionality(container) {
        let startX = 0;
        let scrollLeft = 0;
        let isDown = false;

        // Mouse events
        container.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        });

        container.addEventListener('mouseleave', () => {
            isDown = false;
        });

        container.addEventListener('mouseup', () => {
            isDown = false;
        });

        container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 2;
            container.scrollLeft = scrollLeft - walk;
        });

        // Touch events
        container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        });

        container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const x = e.touches[0].pageX - container.offsetLeft;
            const walk = (x - startX) * 2;
            container.scrollLeft = scrollLeft - walk;
        });
    }

    addButtonStyles() {
        if (document.getElementById('reaction-button-styles')) return;

        const style = document.createElement('style');
        style.id = 'reaction-button-styles';
        style.textContent = `
            #botoes-container {
                position: fixed;
                top: 20px;
                left: 0;
                right: 0;
                display: flex;
                gap: 15px;
                z-index: 9999;
                padding: 0 20px;
                overflow-x: auto;
                overflow-y: hidden;
                scrollbar-width: none;
                -ms-overflow-style: none;
                scroll-behavior: smooth;
                touch-action: pan-x;
            }

            #botoes-container::-webkit-scrollbar {
                display: none;
            }

            .reaction-button {
                cursor: pointer;
                transition: all 0.3s ease;
                flex-shrink: 0;
            }

            .reaction-button img {
                width: 100px;
                height: 100px;
                object-fit: contain;
            }

            .reaction-button:hover {
                transform: translateY(-2px);
            }

            .reaction-button.selected {
                transform: translateY(-2px);
            }

            #main-scene {
                z-index: 2000;
            }
        `;
        document.head.appendChild(style);
    }

    selectEmotion(emotion, index) {
        console.log(`🎭 Selecionada emoção: ${emotion}`);
        
        // Remover seleção anterior
        if (this.selectedButton) {
            this.selectedButton.classList.remove('selected');
            // Voltar para imagem normal
            const prevIndex = this.selectedButton.dataset.index;
            const prevBotao = this.gameData.botoes[prevIndex];
            this.selectedButton.querySelector('img').src = prevBotao.url;
        }
        
        // Selecionar novo botão
        const buttons = document.querySelectorAll('.reaction-button');
        this.selectedButton = buttons[index];
        this.selectedButton.classList.add('selected');
        
        // Trocar para imagem selecionada
        const botao = this.gameData.botoes[index];
        this.selectedButton.querySelector('img').src = botao.selecionado;
        
        // Atualizar emoção atual
        this.currentEmotion = emotion;
        
        // Atualizar textura do boneco
        this.updateCharacterTexture(emotion);
        
        // Atualizar tag
        this.updateGameTag(emotion);
        
        // Mostrar diálogos
        this.showDialogs(emotion);
    }

    updateCharacterTexture(emotion) {
        if (!this.characterPlane || !this.gameData) return;

        // Encontrar dados da emoção
        const bonecoData = this.gameData.bonecos.find(b => b.nome === emotion);
        
        if (bonecoData) {
            // Atualizar textura do boneco
            this.characterPlane.setAttribute('material', 'src', bonecoData.url);
            // Manter transparência
            this.characterPlane.setAttribute('material', 'transparent', true);
            this.characterPlane.setAttribute('material', 'alphaTest', 0.5);
            console.log(`🎨 Textura atualizada para: ${bonecoData.url}`);
        } else {
            console.warn(`⚠️ Dados não encontrados para emoção: ${emotion}`);
        }
    }

    updateGameTag(emotion) {
        const gameTag = document.getElementById('game-tag');
        if (!gameTag || !this.gameData) return;

        const bonecoData = this.gameData.bonecos.find(b => b.nome === emotion);
        if (bonecoData) {
            gameTag.src = bonecoData.tag;
            console.log(`🏷️ Tag atualizada para: ${bonecoData.tag}`);
        }
    }

    showDialogs(emotion) {
        const bonecoData = this.gameData.bonecos.find(b => b.nome === emotion);
        if (!bonecoData || !bonecoData.dialogo) return;

        console.log(`🎭 Iniciando diálogos para: ${emotion}`);
        console.log(`📝 Diálogos disponíveis:`, bonecoData.dialogo);

        // Limpar TUDO primeiro
        this.clearAllDialogs();

        // Armazenar diálogos atuais
        this.currentDialogs = bonecoData.dialogo;
        this.currentDialogIndex = 0;

        // Mostrar primeiro diálogo com navegação
        this.showDialogWithNavigation(this.currentDialogs[0].url, 0);
    }

    showDialogWithNavigation(imageUrl, index) {
        // Animar saída do diálogo anterior se existir
        const existingContainer = document.getElementById('dialog-container');
        if (existingContainer) {
            const existingImage = existingContainer.querySelector('img');
            if (existingImage) {
                existingImage.style.transform = 'translateY(100px)';
                existingImage.style.opacity = '0';
                
                setTimeout(() => {
                    this.clearAllDialogs();
                    this.createNewDialog(imageUrl, index);
                }, 400);
                return;
            }
        }
        
        // Se não há diálogo anterior, criar novo diretamente
        this.createNewDialog(imageUrl, index);
    }

    createNewDialog(imageUrl, index) {

        const dialogContainer = document.createElement('div');
        dialogContainer.id = 'dialog-container';
        dialogContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
            width: 100%;
        `;

        // Imagem do diálogo
        const dialogImage = document.createElement('img');
        dialogImage.src = imageUrl;
        dialogImage.style.cssText = `
            width: 80%;
            height: auto;
            max-height: 80%;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        `;

        // Container dos botões
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 20px;
            align-items: center;
        `;

        // Botão voltar (só se não for o primeiro)
        if (index > 0) {
            const backButton = document.createElement('img');
            backButton.src = 'assets/textures/btn-voltar.png';
            backButton.style.cssText = `
                width: 60px;
                height: 60px;
                cursor: pointer;
                transition: transform 0.2s ease;
            `;
            backButton.addEventListener('click', () => {
                window.SoundManager.forceAudioActivation();
                window.SoundManager.playSoundWithControl('click');
                this.previousDialog();
            });
            backButton.addEventListener('mouseenter', () => {
                backButton.style.transform = 'scale(1.1)';
            });
            backButton.addEventListener('mouseleave', () => {
                backButton.style.transform = 'scale(1)';
            });
            buttonContainer.appendChild(backButton);
        }

        // Botão avançar (sempre aparece)
        const nextButton = document.createElement('img');
        nextButton.src = 'assets/textures/btn-avancar.png';
                    nextButton.style.cssText = `
                width: 60px;
                height: 60px;
                cursor: pointer;
                transition: transform 0.2s ease;
            `;
        
        if (index < this.currentDialogs.length - 1) {
            // Se não for o último, avança para próximo diálogo
            nextButton.addEventListener('click', () => {
                window.SoundManager.forceAudioActivation();
                window.SoundManager.playSoundWithControl('click');
                this.nextDialog();
            });
        } else {
            // Se for o último, fecha o diálogo
            nextButton.addEventListener('click', () => {
                window.SoundManager.forceAudioActivation();
                window.SoundManager.playSoundWithControl('click');
                this.closeDialogs();
            });
        }
        
        nextButton.addEventListener('mouseenter', () => {
            nextButton.style.transform = 'scale(1.1)';
        });
        nextButton.addEventListener('mouseleave', () => {
            nextButton.style.transform = 'scale(1)';
        });
        buttonContainer.appendChild(nextButton);

        // Montar container
        dialogContainer.appendChild(dialogImage);
        dialogContainer.appendChild(buttonContainer);

        // Adicionar ao DOM
        document.body.appendChild(dialogContainer);

        // Animar entrada
        setTimeout(() => {
            dialogImage.style.transform = 'translateY(0)';
            dialogImage.style.opacity = '1';
        }, 100);

        console.log(`💬 Diálogo ${index + 1} mostrado com navegação`);
    }

    nextDialog() {
        if (this.currentDialogIndex < this.currentDialogs.length - 1) {
            this.currentDialogIndex++;
            this.showDialogWithNavigation(this.currentDialogs[this.currentDialogIndex].url, this.currentDialogIndex);
        }
    }

    previousDialog() {
        if (this.currentDialogIndex > 0) {
            this.currentDialogIndex--;
            this.showDialogWithNavigation(this.currentDialogs[this.currentDialogIndex].url, this.currentDialogIndex);
        }
    }

    closeDialogs() {
        console.log('🚪 Fechando diálogos');
        
        const dialogContainer = document.getElementById('dialog-container');
        if (dialogContainer) {
            const dialogImage = dialogContainer.querySelector('img');
            if (dialogImage) {
                // Animar saída
                dialogImage.style.transform = 'translateY(100px)';
                dialogImage.style.opacity = '0';
                
                // Remover após animação
                setTimeout(() => {
                    this.clearAllDialogs();
                    this.currentDialogIndex = 0;
                    this.currentDialogs = [];
                }, 800);
            } else {
                this.clearAllDialogs();
                this.currentDialogIndex = 0;
                this.currentDialogs = [];
            }
        } else {
            this.clearAllDialogs();
            this.currentDialogIndex = 0;
            this.currentDialogs = [];
        }
    }

    clearAllDialogs() {
        // Limpar timeout anterior
        if (this.dialogTimeout) {
            clearTimeout(this.dialogTimeout);
            this.dialogTimeout = null;
        }

        // Remover diálogo anterior
        const existingDialog = document.getElementById('dialog-image');
        if (existingDialog) {
            existingDialog.remove();
        }

        // Remover container de diálogo
        const dialogContainer = document.getElementById('dialog-container');
        if (dialogContainer) {
            dialogContainer.remove();
        }
    }

    forceRemoveDialog() {
        console.log('💥 Tentando remover diálogo...');
        
        // Tentar por ID
        const dialogImage = document.getElementById('dialog-image');
        if (dialogImage) {
            dialogImage.remove();
            console.log('💥 Diálogo removido por ID!');
            return;
        }
        
        // Tentar por classe ou tag
        const allImages = document.querySelectorAll('img');
        for (let img of allImages) {
            if (img.style.position === 'fixed' && img.style.zIndex === '9999') {
                img.remove();
                console.log('💥 Diálogo removido por estilo!');
                return;
            }
        }
        
        console.log('💥 Nenhum diálogo encontrado para remover');
    }

    showDialog(imageUrl) {
        const dialogImage = document.createElement('img');
        dialogImage.id = 'dialog-image';
        dialogImage.src = imageUrl;
        dialogImage.style.cssText = `
            position: fixed;
            bottom: -100%;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            max-width: 80%;
            max-height: 40%;
            transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        `;

        document.body.appendChild(dialogImage);
        console.log(`💬 Diálogo criado: ${imageUrl}`);

        // Animar entrada (sobe de baixo)
        setTimeout(() => {
            dialogImage.style.bottom = '60px';
            dialogImage.style.transform = 'translateX(-50%)';
        }, 100);
    }

    hideDialog() {
        const dialogImage = document.getElementById('dialog-image');
        if (dialogImage) {
            // Animar saída (vai para baixo)
            dialogImage.style.bottom = '-100%';
            dialogImage.style.transform = 'translateX(-50%)';
            
            // Remover após animação
            setTimeout(() => {
                if (dialogImage.parentNode) {
                    dialogImage.remove();
                }
                console.log('💬 Diálogo removido');
            }, 500);
        }
    }

    createCharacterPlane() {
        if (!this.gameElements) {
            console.error('❌ Game elements não encontrado');
            return;
        }

        // Criar plano do boneco com billboard
        this.characterPlane = document.createElement('a-plane');
        this.characterPlane.setAttribute('id', 'character-plane');
        this.characterPlane.setAttribute('position', '0 0 -3');
        this.characterPlane.setAttribute('rotation', '0 0 0');
        this.characterPlane.setAttribute('width', '2');
        this.characterPlane.setAttribute('height', '3');
        // Definir material com delay para garantir carregamento
        setTimeout(() => {
            this.characterPlane.setAttribute('material', 'src', 'assets/textures/boneco/normal.png');
            this.characterPlane.setAttribute('material', 'transparent', true);
            this.characterPlane.setAttribute('material', 'alphaTest', 0.5);
            this.characterPlane.setAttribute('material', 'color', '#ffffff');
            console.log('🎨 Material aplicado ao plano');
            
            // Fallback se a textura não carregar
            this.characterPlane.addEventListener('materialtextureerror', () => {
                console.warn('⚠️ Erro ao carregar textura, usando cor sólida');
                this.characterPlane.setAttribute('material', 'color', '#87CEEB');
            });
        }, 100);
        this.characterPlane.setAttribute('visible', 'true');
        
        // Adicionar componente billboard customizado se não existir
        if (!AFRAME.components.billboard) {
            AFRAME.registerComponent('billboard', {
                tick: function() {
                    const camera = document.getElementById('main-camera');
                    if (camera) {
                        const cameraPosition = camera.getAttribute('position');
                        const planePosition = this.el.getAttribute('position');
                        
                        // Calcular direção para a câmera
                        const direction = {
                            x: cameraPosition.x - planePosition.x,
                            y: cameraPosition.y - planePosition.y,
                            z: cameraPosition.z - planePosition.z
                        };
                        
                        // Calcular rotação para olhar para a câmera
                        const angle = Math.atan2(direction.x, direction.z) * (180 / Math.PI);
                        this.el.setAttribute('rotation', `0 ${angle} 0`);
                    }
                }
            });
        }
        
        this.characterPlane.setAttribute('billboard', '');
        
        // Adicionar ao container de elementos do jogo
        this.gameElements.appendChild(this.characterPlane);
        
        // Criar plano de chão
        this.floorPlane = document.createElement('a-plane');
        this.floorPlane.setAttribute('id', 'floor-plane');
        this.floorPlane.setAttribute('position', '0 -1.5 -3');
        this.floorPlane.setAttribute('rotation', '-90 0 0');
        this.floorPlane.setAttribute('width', '2');
        this.floorPlane.setAttribute('height', '2');
        this.floorPlane.setAttribute('material', 'src', 'assets/textures/boneco/base.png');
        this.floorPlane.setAttribute('material', 'transparent', true);
        this.floorPlane.setAttribute('material', 'alphaTest', 0.5);
        this.floorPlane.setAttribute('material', 'emissive', '#87CEEB');
        this.floorPlane.setAttribute('material', 'emissiveIntensity', 0.3);
        this.floorPlane.setAttribute('visible', 'true');
        
        // Adicionar efeito de pulse
        this.addPulseEffect(this.floorPlane);
        
        // Adicionar plano de chão ao container
        this.gameElements.appendChild(this.floorPlane);
        
        console.log('🎭 Plano do boneco criado com billboard');
        console.log('📍 Posição do plano:', this.characterPlane.getAttribute('position'));
        console.log('👁️ Visibilidade:', this.characterPlane.getAttribute('visible'));
        console.log('🏠 Plano de chão criado');
    }

    addPulseEffect(element) {
        let scale = 1;
        let alpha = 0.6;
        let emissiveIntensity = 0.3;
        let growing = true;
        
        const pulse = () => {
            if (growing) {
                scale += 0.01;
                alpha += 0.01;
                emissiveIntensity += 0.005;
                if (scale >= 1.2) {
                    growing = false;
                }
            } else {
                scale -= 0.01;
                alpha -= 0.01;
                emissiveIntensity -= 0.005;
                if (scale <= 0.8) {
                    growing = true;
                }
            }
            
            // Aplicar escala
            element.setAttribute('scale', `${scale} ${scale} ${scale}`);
            
            // Aplicar transparência
            element.setAttribute('material', 'opacity', alpha);
            
            // Aplicar emissão
            element.setAttribute('material', 'emissiveIntensity', emissiveIntensity);
            
            // Continuar animação
            requestAnimationFrame(pulse);
        };
        
        // Iniciar animação
        pulse();
        console.log('💓 Efeito de pulse adicionado ao chão com emissão');
    }

    animateGameElements() {
        // Animação de entrada dos elementos
        const botoesContainer = document.getElementById('botoes-container');
        if (botoesContainer) {
            botoesContainer.style.opacity = '0';
            botoesContainer.style.transform = 'translateX(0%) translateY(-50px)';
            botoesContainer.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

            setTimeout(() => {
                botoesContainer.style.opacity = '1';
                botoesContainer.style.transform = 'translateX(0%) translateY(0)';
            }, 500);
        }
    }
    
    handleExit() {
        this.clearScene();
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
                
                // Tornar elementos visíveis
                this.gameElements.setAttribute('visible', true);
                console.log('👁️ Elementos 3D tornados visíveis');
                
                // Configurar câmera para RA
                this.setupARCamera();
                
                // Criar plano do boneco após a cena estar pronta
                this.createCharacterPlane();
            } else {
                console.error('❌ Elementos A-Frame não encontrados!');
            }
        }, 1000);
    }

    setupARCamera() {
        if (!this.camera) return;

        // Configurar câmera com controles habilitados
        this.camera.setAttribute('position', '0 1.6 0');
        this.camera.setAttribute('look-controls', 'enabled: true');
        this.camera.setAttribute('wasd-controls', 'enabled: true');
        this.camera.setAttribute('cursor', 'rayOrigin: mouse');
        
        console.log('📹 Câmera configurada com controles habilitados');
    }

    clearScene() {
        // Parar câmera
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        
        // Remover vídeo da câmera
        const videoElement = document.getElementById('camera-video');
        if (videoElement) {
            videoElement.remove();
        }
        
        // Limpar elementos 3D
        if (this.gameElements) {
            this.gameElements.innerHTML = '';
        }
        
        // Limpar botões
        const botoesContainer = document.getElementById('botoes-container');
        if (botoesContainer) {
            botoesContainer.innerHTML = '';
        }
        
        // Limpar diálogos
        this.clearAllDialogs();
        
        // Resetar estado
        this.currentEmotion = 'normal';
        this.selectedButton = null;
        this.characterPlane = null;
        this.floorPlane = null;
        this.currentDialogIndex = 0;
        this.currentDialogs = [];
        
        console.log('🧹 Cena limpa e câmera parada');
    }
}

// Exportar para uso global
window.GameScreen = GameScreen;