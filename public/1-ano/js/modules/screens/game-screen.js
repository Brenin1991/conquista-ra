/**
 * Game Screen - Tela do Jogo
 * Jogo de sequência de botões baseado na fase selecionada
 */

class GameScreen extends BaseScreen {
    constructor() {
        super('game', { 
            next: null, // Será definido dinamicamente baseado na cena do JSON
            onEnter: () => this.handleEnter(),
            onExit: () => this.handleExit()
        });
        
        // Estado do jogo
        this.gameState = 'waiting'; // waiting, playing, completed
        this.currentFase = null;
        this.currentStep = 0;
        this.totalSteps = 0;
        this.sequence = [];
        this.isSequenceComplete = false;
        
        // Elementos da interface
        this.enunciadoElement = null;
        this.buttonsContainer = null;
        this.vasoElement = null;
        this.progressElement = null;
        
        // Sistema de feedback
        this.feedbackTimeout = null;
        this.isShowingFeedback = false;
        
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
        this.setupGameElements();
        this.setupNarracaoButton();
        
        // Garantir que o vídeo seja sempre visível
        this.setupVideoVisibilityOverride();
    }
    
    setupVideoVisibilityOverride() {
        // Sobrescrever o comportamento padrão para garantir que o vídeo seja sempre visível
        const originalShow = this.show.bind(this);
        this.show = function() {
            // Chamar método original
            originalShow();
            
            // Garantir que o vídeo seja visível após a transição
            setTimeout(() => {
                this.ensureVideoVisibility();
            }, 500);
        }.bind(this);
    }
    
    setupGameElements() {
        // Configurar elementos da interface
        this.enunciadoElement = document.getElementById('planta-game');
        this.buttonsContainer = document.getElementById('buttons-content');
        this.vasoElement = document.getElementById('planta-game');
        
        if (!this.buttonsContainer) {
            console.error('❌ Container de botões não encontrado');
        }
        
        if (!this.vasoElement) {
            console.error('❌ Elemento do vaso não encontrado');
        }
        
        // Configurar vídeo de fundo
        this.setupVideo();
    }
    
    setupVideo() {
        const video = document.getElementById('video');
        if (video) {
            console.log('🎥 Configurando vídeo de fundo...');
            
            // Verificar se o vídeo já tem um stream
            if (!video.srcObject) {
                // Se não tiver stream, criar um stream da câmera
                this.initializeCamera();
            } else {
                console.log('✅ Vídeo já tem stream configurado');
            }
        } else {
            console.error('❌ Elemento de vídeo não encontrado');
        }
    }
    
    async initializeCamera() {
        try {
            console.log('🎥 Inicializando câmera para tela de fundo...');
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });
            
            const video = document.getElementById('video');
            if (video) {
                video.srcObject = stream;
                video.play().then(() => {
                    console.log('✅ Vídeo de fundo iniciado com sucesso');
                }).catch(error => {
                    console.error('❌ Erro ao reproduzir vídeo:', error);
                });
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar câmera:', error);
        }
    }
    
    createEnunciado() {
        if (!this.currentFase || !this.enunciadoElement) return;
        
        // Usar o container existente no HTML
        const enunciadoContent = document.getElementById('enunciado-content');
        
        if (!enunciadoContent) {
            console.error('❌ Container do enunciado não encontrado');
            return;
        }
        
        // Aplicar o enunciado como background do enunciado-content
        enunciadoContent.style.backgroundImage = `url(${this.currentFase.enunciado})`;
        
        // Criar botão
        const closeButton = document.createElement('button');
        closeButton.className = 'btn-comecar';
        
        closeButton.addEventListener('click', () => {
            this.startGame();
        });
        
        enunciadoContent.appendChild(closeButton);
        
        // Aplicar animação de entrada igual ao tutorial
        enunciadoContent.style.opacity = '0';
        enunciadoContent.style.transform = 'translate(-50%, -300%) scale(0.7)';
        enunciadoContent.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        
        // Animar entrada com delay
        setTimeout(() => {
            enunciadoContent.style.opacity = '1';
            enunciadoContent.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 200);
        
        // Animar botão de narração igual ao tutorial
        const narracaoButton = document.getElementById('narracao-enunciado');
        if (narracaoButton) {
            narracaoButton.style.opacity = '0';
            narracaoButton.style.transform = 'translate(-200%, 0%) scale(0.7)';
            narracaoButton.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            setTimeout(() => {
                narracaoButton.style.opacity = '1';
                narracaoButton.style.transform = 'translate(0%, 0%) scale(1)';
            }, 300);
        }
        
        console.log('✅ Enunciado criado com animação');
    }
    
    setupNarracaoButton() {
        const narracaoButton = document.getElementById('narracao-enunciado');
        if (narracaoButton) {
            narracaoButton.addEventListener('click', () => {
                window.SoundManager.forceAudioActivation();
                window.SoundManager.playSoundWithControl('NA001');
            });
        }
    }
    
    createButtons() {
        if (!this.currentFase || !this.buttonsContainer) return;
        
        console.log('🎯 Criando botões para fase:', this.currentFase);
        console.log('🎯 Botões da fase:', this.currentFase.botoes);
        
        // Limpar container
        this.buttonsContainer.innerHTML = '';
        
        // Criar botões baseados na fase
        this.currentFase.botoes.forEach((botao, index) => {
            console.log(`🎯 Criando botão ${index}:`, botao);
            const buttonElement = document.createElement('div');
            buttonElement.className = 'game-button';
            buttonElement.dataset.buttonId = botao.id;
            buttonElement.dataset.buttonOrder = botao.ordem;
            

            
            const buttonImage = document.createElement('img');
            
            // Se for o primeiro botão (ordem 1), já começar com a versão selecionada
            if (botao.ordem === 1) {
                buttonImage.src = botao.url_selected;
                buttonElement.classList.add('selected');
                console.log(`🎯 Botão ${botao.id} iniciando ativo com: ${botao.url_selected}`);
            } else {
                buttonImage.src = botao.url;
                console.log(`🎯 Botão ${botao.id} iniciando normal com: ${botao.url}`);
            }
            
            buttonImage.alt = `Botão ${botao.id}`;
            buttonImage.style.width = '80px';
            buttonImage.style.height = '80px';

            
            buttonElement.appendChild(buttonImage);
            
            // Adicionar evento de clique
            buttonElement.addEventListener('click', () => {
                console.log(`🖱️ Clique detectado no botão ${botao.id}`);
                this.handleButtonClick(botao, index);
            });
            

            
            this.buttonsContainer.appendChild(buttonElement);
            

        });
        
        console.log('✅ Botões criados');
    }
    
    handleButtonClick(botao, index) {
        console.log(`🎯 Clique no botão: ${botao.id}, ordem: ${botao.ordem}, passo atual: ${this.currentStep + 1}`);
        
        if (this.gameState !== 'playing') {
            console.log('⚠️ Jogo não está em estado de playing');
            return;
        }
        
        const buttonElement = this.buttonsContainer.querySelector(`[data-button-id="${botao.id}"]`);
        if (!buttonElement) {
            console.error('❌ Elemento do botão não encontrado');
            return;
        }
        
        // Verificar se o botão clicado está ativo (selected)
        if (!buttonElement.classList.contains('selected')) {
            console.log(`⚠️ Botão ${botao.id} não está ativo, clique ignorado`);
            return;
        }
        
        // Verificar se é o botão correto na sequência
        const expectedOrder = this.currentStep + 1;
        const botaoOrder = parseInt(botao.ordem);
        const isCorrect = botaoOrder === expectedOrder;
        
        console.log(`🎯 Verificação: esperado ${expectedOrder}, clicado ${botaoOrder} (${typeof botaoOrder}), correto: ${isCorrect}`);
        console.log(`🎯 Dados do botão:`, botao);
        
        if (isCorrect) {
            // Botão correto
            this.handleCorrectButton(buttonElement, botao);
        } else {
            // Botão incorreto
            this.handleIncorrectButton(buttonElement);
        }
    }
    
    handleCorrectButton(buttonElement, botao) {
        // Marcar como selecionado
        buttonElement.classList.add('selected');
        
        // Mudar imagem para versão selecionada
        const buttonImage = buttonElement.querySelector('img');
        if (buttonImage && botao.url_selected) {
            console.log(`🖼️ Mudando imagem do botão ${botao.id}: ${botao.url} → ${botao.url_selected}`);
            buttonImage.src = botao.url_selected;
        } else {
            console.warn(`⚠️ Não foi possível mudar imagem do botão ${botao.id}:`, {
                hasImage: !!buttonImage,
                hasSelectedUrl: !!botao.url_selected,
                selectedUrl: botao.url_selected
            });
        }
        
        // Tocar som de feedback positivo
        if (window.SoundManager) {
            window.SoundManager.playSound('feedback-positivo');
        }
        
        // Avançar para próximo passo
        this.currentStep++;
        
        // Atualizar vaso
        this.updateVaso();
        
        // Verificar se completou a sequência
        if (this.currentStep >= this.totalSteps) {
            this.completeSequence();
        } else {
            // Mostrar feedback temporário
            this.showFeedback(true);
            
            // Ativar automaticamente o próximo botão na sequência
            this.activateNextButton();
        }
        
        console.log(`✅ Botão correto: ${botao.id} (passo ${this.currentStep}/${this.totalSteps})`);
    }
    
    goToScene() {
        if (!this.currentFase || !this.currentFase.cena) {
            console.warn('⚠️ Nenhuma cena especificada na fase, indo para tela padrão');
            this.nextScreen();
            return;
        }
        
        console.log(`🎬 Indo para cena: ${this.currentFase.cena}`);
        
        // Mapear a cena do JSON para o nome da tela no sistema
        let targetScreen = this.currentFase.cena;
        
        // Remover sufixo "-screen" se existir para compatibilidade
        if (targetScreen.endsWith('-screen')) {
            targetScreen = targetScreen.replace('-screen', '');
        }
        
        // Mapear nomes específicos se necessário
        const screenMapping = {
            'raiva': 'interacao',
            'tristeza': 'tristeza',
            'alegria': 'alegria',
            'medo': 'medo'
        };
        
        if (screenMapping[targetScreen]) {
            targetScreen = screenMapping[targetScreen];
        }
        
        console.log(`🎬 Tela de destino: ${targetScreen}`);
        
        // Verificar se a tela existe no screenManager
        if (window.screenManager && window.screenManager.screens[targetScreen]) {
            console.log(`✅ Tela ${targetScreen} encontrada, navegando...`);
            window.screenManager.showScreen(targetScreen);
        } else {
            console.warn(`⚠️ Tela ${targetScreen} não encontrada, indo para tela padrão`);
            this.nextScreen();
        }
    }
    
    activateNextButton() {
        // Encontrar o próximo botão na sequência
        const nextOrder = this.currentStep + 1;
        const nextButton = this.buttonsContainer.querySelector(`[data-button-order="${nextOrder}"]`);
        
        if (nextButton) {
            console.log(`🎯 Ativando próximo botão: ordem ${nextOrder}`);
            
            // Remover seleção de todos os botões
            const allButtons = this.buttonsContainer.querySelectorAll('.game-button');
            allButtons.forEach(btn => {
                btn.classList.remove('selected');
                const img = btn.querySelector('img');
                if (img) {
                    const buttonId = btn.dataset.buttonId;
                    const botao = this.currentFase.botoes.find(b => b.id === buttonId);
                    if (botao) {
                        img.src = botao.url; // Voltar para versão normal
                        console.log(`🔄 Botão ${buttonId} voltou para versão normal: ${botao.url}`);
                    }
                }
            });
            
            // Ativar o próximo botão
            nextButton.classList.add('selected');
            const nextButtonImg = nextButton.querySelector('img');
            const nextButtonId = nextButton.dataset.buttonId;
            const nextBotao = this.currentFase.botoes.find(b => b.id === nextButtonId);
            
            if (nextButtonImg && nextBotao && nextBotao.url_selected) {
                nextButtonImg.src = nextBotao.url_selected;
                console.log(`🎯 Próximo botão ativado: ${nextBotao.id} com ${nextBotao.url_selected}`);
            }
            
            // Atualizar vaso para mostrar o progresso atual
            this.updateVaso();
        } else {
            console.log(`⚠️ Próximo botão não encontrado para ordem ${nextOrder}`);
        }
    }
    
    handleIncorrectButton(buttonElement) {
        // Marcar como incorreto
        buttonElement.classList.add('incorrect');
        
        // Tocar som de feedback negativo
        if (window.SoundManager) {
            window.SoundManager.playSound('feedback-negativo');
        }
        
        // Mostrar feedback temporário
        this.showFeedback(false);
        
        // Resetar após delay
        setTimeout(() => {
            this.resetButtons();
        }, 1000);
        
        console.log('❌ Botão incorreto - sequência resetada');
    }
    
    resetButtons() {
        const buttons = this.buttonsContainer.querySelectorAll('.game-button');
        buttons.forEach(button => {
            button.classList.remove('selected', 'incorrect', 'completed');
            
            // Resetar imagem
            const buttonImage = button.querySelector('img');
            if (buttonImage) {
                const buttonId = button.dataset.buttonId;
                const botao = this.currentFase.botoes.find(b => b.id === buttonId);
                if (botao) {
                    // Se for o primeiro botão, voltar para versão selecionada
                    if (botao.ordem === 1) {
                        buttonImage.src = botao.url_selected;
                        button.classList.add('selected');
                        console.log(`🔄 Botão ${buttonId} resetado para ativo: ${botao.url_selected}`);
                    } else {
                        buttonImage.src = botao.url;
                        console.log(`🔄 Resetando imagem do botão ${buttonId}: ${botao.url}`);
                    }
                }
            }
        });
        
        this.currentStep = 0;
        console.log('🔄 Botões resetados - botão 01 ativo novamente');
        
        // Resetar vaso para estado inicial
        this.updateVaso();
    }
    
    updateVaso() {
        if (!this.vasoElement || !this.currentFase) return;
        
        // Calcular progresso baseado no passo atual
        // currentStep começa em 0, então o primeiro clique (botão 01) = passo 1
        const currentProgress = this.currentStep;
        const totalSteps = this.totalSteps;
        
        console.log(`🌱 Atualizando vaso: passo ${currentProgress}/${totalSteps}`);
        
        // Determinar qual vaso mostrar baseado no progresso
        let vasoIndex = 0;
        
        if (currentProgress === 0) {
            // Início: vaso vazio
            vasoIndex = 0;
        } else if (currentProgress === 1) {
            // Primeiro botão clicado: vaso com broto
            vasoIndex = 1;
        } else if (currentProgress === 2) {
            // Segundo botão clicado: vaso crescendo
            vasoIndex = 2;
        } else if (currentProgress >= 3) {
            // Terceiro botão clicado: vaso completo
            vasoIndex = this.currentFase.vazos.length - 1;
        }
        
        // Atualizar imagem do vaso
        const selectedVaso = this.currentFase.vazos[vasoIndex];
        if (selectedVaso) {
            this.vasoElement.src = selectedVaso.url;
            console.log(`🌱 Vaso atualizado para: ${selectedVaso.url} (passo ${currentProgress})`);
        } else {
            console.warn(`⚠️ Vaso não encontrado para índice ${vasoIndex}`);
        }
    }
    
    showFeedback(isCorrect) {
        if (this.isShowingFeedback) return;
        
        this.isShowingFeedback = true;
        
        const feedbackElement = document.createElement('div');
        feedbackElement.className = 'feedback-element';
        
        document.body.appendChild(feedbackElement);
        
        // Remover feedback após animação
        setTimeout(() => {
            if (feedbackElement.parentNode) {
                feedbackElement.parentNode.removeChild(feedbackElement);
            }
            this.isShowingFeedback = false;
        }, 600);
    }
    
    completeSequence() {
        console.log('🎉 Sequência completada!');
        
        // Marcar todos os botões como completados
        const buttons = this.buttonsContainer.querySelectorAll('.game-button');
        buttons.forEach(button => {
            button.classList.remove('selected');
            button.classList.add('completed');
            
            // Garantir que todos os botões tenham a versão selecionada
            const buttonImage = button.querySelector('img');
            const buttonId = button.dataset.buttonId;
            const botao = this.currentFase.botoes.find(b => b.id === buttonId);
            
            if (buttonImage && botao && botao.url_selected) {
                console.log(`🎯 Definindo versão selecionada para botão ${buttonId}: ${botao.url_selected}`);
                buttonImage.src = botao.url_selected;
            }
        });
        
        // Tocar som de vitória
        if (window.SoundManager) {
            window.SoundManager.playSound('feedback-positivo');
        }
        
        // Mostrar efeito de vitória
        this.showVictoryEffect();
        
        // Ir para a cena especificada no JSON após delay
        setTimeout(() => {
            this.goToScene();
        }, 3000);
    }
    
    showVictoryEffect() {
        // Criar efeito de vitória
        const victoryEffect = document.createElement('div');
        victoryEffect.className = 'victory-effect';
        
        document.body.appendChild(victoryEffect);
        
        // Remover efeito após animação
        setTimeout(() => {
            if (victoryEffect.parentNode) {
                victoryEffect.parentNode.removeChild(victoryEffect);
            }
        }, 2000);
    }
    
    injectGameAnimations() {
        if (document.getElementById('game-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'game-animations';
        style.textContent = `
            @keyframes feedback-pop {
                0% { 
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 0;
                }
                50% { 
                    transform: translate(-50%, -50%) scale(1.2);
                    opacity: 1;
                }
                100% { 
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
            }
            
            @keyframes victory-fade {
                0% { opacity: 0; }
                50% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    startGame() {
        console.log('🚀 Iniciando jogo...');
        
        // Esconder enunciado
        const enunciadoContent = document.getElementById('enunciado-content');
        if (enunciadoContent) {
            enunciadoContent.style.display = 'none';
        }
        
        // Iniciar jogo
        this.gameState = 'playing';
        this.currentStep = 0;
        this.totalSteps = this.currentFase.botoes.length;
        
        console.log(`🎮 Estado do jogo: ${this.gameState}, passos: ${this.totalSteps}`);
        
        // Criar botões
        this.createButtons();
        
        console.log('🎮 Jogo iniciado');
    }
    
    handleEnter() {
        console.log('🎮 Entrou na tela do jogo');
        
        // Obter fase selecionada
        this.currentFase = window.selectedFase;
        if (!this.currentFase) {
            console.error('❌ Nenhuma fase selecionada');
            return;
        }
        
        console.log(`🎯 Fase selecionada: ${this.currentFase.nome}`);
        console.log(`🎯 Cena configurada: ${this.currentFase.cena}`);
        console.log(`🎯 Dados completos da fase:`, this.currentFase);
        
        // Garantir que o vídeo esteja visível
        this.ensureVideoVisibility();
        
        // Injetar animações
        this.injectGameAnimations();
        
        // Mostrar enunciado primeiro
        this.createEnunciado();
        
        // Configurar vaso inicial (vazio)
        if (this.vasoElement && this.currentFase.vazos.length > 0) {
            this.vasoElement.src = this.currentFase.vazos[0].url;
            console.log(`🌱 Vaso inicial configurado: ${this.currentFase.vazos[0].url}`);
        }
    }
    
    ensureVideoVisibility() {
        const video = document.getElementById('video');
        if (video) {
            console.log('🎥 Garantindo visibilidade do vídeo...');
            
            // Verificar se está reproduzindo
            if (video.paused) {
                console.log('🎥 Vídeo pausado, tentando reproduzir...');
                video.play().then(() => {
                    console.log('✅ Vídeo reproduzindo com sucesso');
                }).catch(error => {
                    console.error('❌ Erro ao reproduzir vídeo:', error);
                });
            } else {
                console.log('✅ Vídeo já está reproduzindo');
            }
        } else {
            console.error('❌ Elemento de vídeo não encontrado');
        }
    }
    
    handleExit() {
        console.log('👋 Saiu da tela do jogo');
        
        // Limpar estado
        this.gameState = 'waiting';
        this.currentStep = 0;
        this.currentFase = null;
        
        // Limpar elementos
        if (this.buttonsContainer) {
            this.buttonsContainer.innerHTML = '';
        }
        
        // Mostrar enunciado novamente
        const enunciadoContent = document.getElementById('enunciado-content');
        if (enunciadoContent) {
            enunciadoContent.style.display = 'flex';
        }
        
        // Limpar animações
        const styleElement = document.getElementById('game-animations');
        if (styleElement) {
            styleElement.remove();
        }
    }
}

// Exportar para uso global
window.GameScreen = GameScreen;