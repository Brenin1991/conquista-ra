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
            buttonDiv.addEventListener('click', () => this.selectEmotion(botao.nome, index));
            
            botoesContainer.appendChild(buttonDiv);
        });

        // Adicionar estilos CSS dinamicamente
        this.addButtonStyles();
    }

    addButtonStyles() {
        if (document.getElementById('reaction-button-styles')) return;

        const style = document.createElement('style');
        style.id = 'reaction-button-styles';
        style.textContent = `
            #botoes-container {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 15px;
                z-index: 9999;
            }

            .reaction-button {
                cursor: pointer;
                transition: all 0.3s ease;
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
        
        console.log('🎭 Plano do boneco criado com billboard');
        console.log('📍 Posição do plano:', this.characterPlane.getAttribute('position'));
        console.log('👁️ Visibilidade:', this.characterPlane.getAttribute('visible'));
    }

    animateGameElements() {
        // Animação de entrada dos elementos
        const botoesContainer = document.getElementById('botoes-container');
        if (botoesContainer) {
            botoesContainer.style.opacity = '0';
            botoesContainer.style.transform = 'translateX(-50%) translateY(-50px)';
            botoesContainer.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            setTimeout(() => {
                botoesContainer.style.opacity = '1';
                botoesContainer.style.transform = 'translateX(-50%) translateY(0)';
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
        
        // Resetar estado
        this.currentEmotion = 'normal';
        this.selectedButton = null;
        this.characterPlane = null;
        
        console.log('🧹 Cena limpa e câmera parada');
    }
}

// Exportar para uso global
window.GameScreen = GameScreen;