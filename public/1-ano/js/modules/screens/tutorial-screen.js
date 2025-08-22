/**
 * Tutorial Screen - Tela de Tutorial
 * Tela intermediária com instruções e botão de narração
 */

class TutorialScreen extends BaseScreen {
    constructor() {
        super('tutorial', {
            next: 'game',
            onEnter: () => this.handleEnter(),
            onExit: () => this.handleExit()
        });
        
        this.gameData = null;
        this.selectedFase = null;
    }
    
    onInit() {
        // Configurações específicas da tela de tutorial
        this.setupNarracaoButton();
        this.setupSkipButton();
        this.loadGameData();
    }
    
    async loadGameData() {
        try {
            const response = await fetch('assets/data/data.json');
            this.gameData = await response.json();
            console.log('✅ Dados do jogo carregados no tutorial:', this.gameData);
        } catch (error) {
            console.error('❌ Erro ao carregar dados do jogo:', error);
        }
    }
    

    
    setupNarracaoButton() {
        const narracaoButton = this.element.querySelector('#narracao-tutorial');
        if (narracaoButton) {
            narracaoButton.addEventListener('click', () => {
                window.SoundManager.forceAudioActivation();
                window.SoundManager.playSoundWithControl('NA002');
            });
        }
    }
    
    setupSkipButton() {
        const skipButton = this.element.querySelector('#skip-tutorial');
        if (skipButton) {
            skipButton.addEventListener('click', () => {
                this.skipTutorial();
            });
        }
    }
    
    createFasesList() {
        if (!this.gameData || !this.gameData.fases) {
            console.error('❌ Dados das fases não disponíveis');
            return;
        }
        
        const reacaoContainer = this.element.querySelector('#reacao-container-tutorial');
        if (!reacaoContainer) {
            console.error('❌ Container de reações não encontrado');
            return;
        }
        
        // Limpar container
        reacaoContainer.innerHTML = '';
        
        // Criar lista de fases
        this.gameData.fases.forEach((fase, index) => {
            const faseElement = document.createElement('div');
            faseElement.className = 'fase-item';
            faseElement.dataset.faseId = fase.id;
            faseElement.dataset.faseIndex = index;
            
            faseElement.style.cssText = `
                opacity: 0;
                transform: scale(0.8);
            `;
            
            const faseImage = document.createElement('img');
            faseImage.src = fase.url;
            faseImage.alt = `Fase ${fase.nome}`;
            
            faseElement.appendChild(faseImage);
            
            // Adicionar evento de clique
            faseElement.addEventListener('click', () => {
                this.selectFase(fase, index);
            });
            
            // Adicionar eventos de hover
            faseElement.addEventListener('mouseenter', () => {
                if (!faseElement.classList.contains('selected')) {
                    faseElement.style.transform = 'scale(1.05)';
                }
            });
            
            faseElement.addEventListener('mouseleave', () => {
                if (!faseElement.classList.contains('selected')) {
                    faseElement.style.transform = 'scale(1)';
                }
            });
            
            reacaoContainer.appendChild(faseElement);
            
            // Animar entrada com delay
            setTimeout(() => {
                faseElement.style.opacity = '1';
                faseElement.style.transform = 'scale(1)';
            }, 200 + (index * 100));
        });
        
        console.log('✅ Lista de fases criada');
    }
    
    selectFase(fase, index) {
        // Remover seleção anterior
        const previousSelected = this.element.querySelector('.fase-item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
            previousSelected.style.transform = 'scale(1)';
        }
        
        // Selecionar nova fase
        const selectedElement = this.element.querySelector(`[data-fase-index="${index}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
            selectedElement.style.transform = 'scale(1)';
        }
        
        this.selectedFase = fase;
        console.log(`✅ Fase selecionada: ${fase.nome}`);
        
        // Iniciar jogo diretamente
        this.startGame();
    }
    
    startGame() {
        if (this.selectedFase) {
            // Armazenar a fase selecionada globalmente
            window.selectedFase = this.selectedFase;
            this.nextScreen();
            window.SoundManager.forceAudioActivation();
            window.SoundManager.playSoundWithControl('click');
        } else {
            console.log('⚠️ Nenhuma fase selecionada');
        }
    }
    
    handleEnter() {
        // Lógica específica ao entrar no tutorial
        console.log('📚 Entrou no tutorial');
        
        // Criar lista de fases
        this.createFasesList();
        
        // Animar elementos da tela de tutorial
        this.animateTutorialElements();
    }
    
    handleExit() {
        // Lógica específica ao sair do tutorial
        console.log('📖 Saiu do tutorial');
        
        // Parar narração se estiver tocando
        window.SoundManager.stopCurrentSound();
        
        // Limpar animações
        this.cleanupTutorialAnimations();
    }
    
    animateTutorialElements() {
        // Injetar animação CSS para o botão
        this.injectTutorialAnimations();
        
        // Elementos principais da tela de tutorial
        const tutorialContent = document.getElementById('tutorial-content');
        const tutorialBackground = document.getElementById('tutorial');
        const narracaoTutorial = document.getElementById('narracao-tutorial');
        const mascoteTutorial = document.getElementById('mascote-tutorial');
        
        // Animar fundo primeiro
        if (tutorialBackground) {
            tutorialBackground.style.opacity = '0';
            tutorialBackground.style.transition = 'opacity 1s ease-in-out';
            
            setTimeout(() => {
                tutorialBackground.style.opacity = '1';
            }, 100);
        }
        
        if (tutorialContent) {
            // Reset inicial
            tutorialContent.style.opacity = '0';
            tutorialContent.style.transform = 'translate(-50%, -300%) scale(0.7)';
            tutorialContent.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            // Animar entrada com delay
            setTimeout(() => {
                tutorialContent.style.opacity = '1';
                tutorialContent.style.transform = 'translate(-50%, -90%) scale(1)';
            }, 200);
        }

        if (narracaoTutorial) {
            narracaoTutorial.style.opacity = '0';
            narracaoTutorial.style.transform = 'translate(-200%, 0%) scale(0.7)';
            narracaoTutorial.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

            setTimeout(() => {
                narracaoTutorial.style.opacity = '1';
                narracaoTutorial.style.transform = 'translate(0%, 0%) scale(1)';
            }, 300);
        }



        if (mascoteTutorial) {
            mascoteTutorial.style.opacity = '0';
            mascoteTutorial.style.transform = 'translate(-200%, 0%) scale(0.7)';
            mascoteTutorial.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

            setTimeout(() => {
                mascoteTutorial.style.opacity = '1';
                mascoteTutorial.style.transform = 'translate(0%, 0%) scale(1)';
            }, 300);
        }
    }
    
    injectTutorialAnimations() {
        // Verificar se a animação já foi injetada
        if (document.getElementById('tutorial-animations')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'tutorial-animations';
        style.textContent = `
            @keyframes tutorial-button-pulse {
                0%, 100% { 
                    transform: translate(-50%, 0%) scale(1);
                }
                50% { 
                    transform: translate(-50%, 0%) scale(1.05);
                }
            }
            
            .fase-item.selected {
                animation: fase-selected-pulse 2s ease-in-out infinite;
            }
            
            @keyframes fase-selected-pulse {
                0%, 100% { 
                    box-shadow: 0 0 20px rgba(78, 205, 196, 0.5);
                }
                50% { 
                    box-shadow: 0 0 30px rgba(78, 205, 196, 0.8);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    cleanupTutorialAnimations() {
        // Remover estilos CSS injetados
        const styleElement = document.getElementById('tutorial-animations');
        if (styleElement) {
            styleElement.remove();
        }
    }
    
    skipTutorial() {
        // Pular tutorial e ir direto para a UI
        console.log('⏭️ Tutorial pulado');
        this.nextScreen();
    }
    
    show() {
       
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        
        // Executar função de saída da tela atual
        if (window.screenManager && window.screenManager.getCurrentScreen()) {
            const currentScreen = window.screenManager.getCurrentScreen();
            if (currentScreen.data && currentScreen.data.onExit) {
                currentScreen.data.onExit();
            }
        }
        
        // Esconder todas as telas EXCETO a atual
        this.hideAllScreensExcept(this.element);
        
        // Preparar tela para animação
        this.element.style.display = 'block';
        this.element.style.visibility = 'visible';
        this.element.style.opacity = '0';
        this.element.style.transition = 'opacity 0.8s ease-in-out';
        
        this.isActive = true;
        
        // Animar entrada da tela com fade-in
        requestAnimationFrame(() => {
            this.element.style.opacity = '1';
            window.SoundManager.forceAudioActivation();
            window.SoundManager.playSoundWithControl('NA002');
        });
        
        // Executar função de entrada após a transição
        setTimeout(() => {
            this.config.onEnter();
            this.onEnter();
        }, 500);
        
        // Finalizar transição
        setTimeout(() => {
            this.isTransitioning = false;
        }, 1000);
    }
}

// Exportar para uso global
window.TutorialScreen = TutorialScreen;