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
                this.selectEmotion(botao.nome, index);
            });
            
            // Adicionar evento de touch para melhor responsividade
            buttonDiv.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
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

        // Mostrar primeiro diálogo
        this.showDialog(bonecoData.dialogo[0].url);
        console.log(`💬 Primeiro diálogo mostrado: ${bonecoData.dialogo[0].url}`);
        
        // Após 2 segundos, mostrar segundo diálogo
        this.dialogTimeout = setTimeout(() => {
            this.showDialog(bonecoData.dialogo[1].url);
            console.log(`💬 Segundo diálogo mostrado: ${bonecoData.dialogo[1].url}`);
            
            // Após mais 2 segundos, remover segundo diálogo
            this.dialogTimeout = setTimeout(() => {
                console.log(`⏰ Hora de remover o segundo diálogo!`);
                this.forceRemoveDialog();
                
                // Timeout de segurança - se não sair em 1 segundo, força novamente
                setTimeout(() => {
                    const stillThere = document.getElementById('dialog-image');
                    if (stillThere) {
                        console.log('🚨 DIALOGO AINDA LÁ! FORÇANDO REMOÇÃO!');
                        stillThere.remove();
                    }
                }, 1000);
            }, 2000);
        }, 2000);
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
            top: -100%;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            max-width: 80%;
            max-height: 60%;
            transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        `;

        document.body.appendChild(dialogImage);
        console.log(`💬 Diálogo criado: ${imageUrl}`);

        // Animar entrada (desce de cima)
        setTimeout(() => {
            dialogImage.style.top = '50%';
            dialogImage.style.transform = 'translate(-50%, -50%)';
        }, 100);
    }

    hideDialog() {
        const dialogImage = document.getElementById('dialog-image');
        if (dialogImage) {
            // Animar saída (vai para baixo)
            dialogImage.style.top = '100%';
            dialogImage.style.transform = 'translate(-50%, -50%)';
            
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
        this.floorPlane.setAttribute('width', '4');
        this.floorPlane.setAttribute('height', '4');
        this.floorPlane.setAttribute('material', 'src', 'assets/textures/boneco/base.png');
        this.floorPlane.setAttribute('material', 'transparent', true);
        this.floorPlane.setAttribute('material', 'alphaTest', 0.5);
        this.floorPlane.setAttribute('visible', 'true');
        
        // Adicionar plano de chão ao container
        this.gameElements.appendChild(this.floorPlane);
        
        console.log('🎭 Plano do boneco criado com billboard');
        console.log('📍 Posição do plano:', this.characterPlane.getAttribute('position'));
        console.log('👁️ Visibilidade:', this.characterPlane.getAttribute('visible'));
        console.log('🏠 Plano de chão criado');
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
        
        console.log('🧹 Cena limpa e câmera parada');
    }
}

// Exportar para uso global
window.GameScreen = GameScreen;