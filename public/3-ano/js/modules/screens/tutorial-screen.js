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
        
        // Configuração da sequência de imagens do tutorial
        this.tutorialImages = [
            'assets/textures/tutorial-sequence/01.png',
            'assets/textures/tutorial-sequence/02.png',
            'assets/textures/tutorial-sequence/03.png',
            'assets/textures/tutorial-sequence/04.png'
        ];
        this.currentImageIndex = 0;
        this.imageChangeInterval = null;
        this.imageChangeDelay = 500; // 3 segundos entre cada imagem
    }
    
    onInit() {
        // Configurações específicas da tela de tutorial
        this.setupTutorialButton();
        this.setupNarracaoButton();
        this.setupSkipButton();
    }
    
    setupTutorialButton() {
        const tutorialButton = this.element.querySelector('#tutorial-button');
        if (tutorialButton) {
            tutorialButton.addEventListener('click', () => {
                window.SoundManager.forceAudioActivation();
                window.SoundManager.playSoundWithControl('click');
                this.nextScreen();
                
            });
        }
    }
    
    setupNarracaoButton() {
        const narracaoButton = this.element.querySelector('#narracao-button');
        if (narracaoButton) {
            narracaoButton.addEventListener('click', () => {
                this.toggleNarracao();
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
    
   
    
    handleEnter() {
        // Lógica específica ao entrar no tutorial
        console.log('📚 Entrou no tutorial');
        this.animateTutorialElements();
        this.startTutorialSequence();
    }

    animateTutorialElements() {
        // Injetar animação CSS para o botão
        this.injectTutorialAnimations();
        
        // Elementos principais da tela de tutorial
        const tutorialContent = document.getElementById('tutorial-content');
        const tutorialButton = document.getElementById('tutorial-button');
        const tutorialBackground = document.getElementById('tutorial');
        const mascote = document.getElementById('mascote-tutorial');

        if (mascote) {
            mascote.style.opacity = '0';
            mascote.style.transform = 'translate(200%, 0%) scale(0.7)';
            mascote.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

            setTimeout(() => {
                mascote.style.opacity = '1';
                mascote.style.transform = 'translate(0%, 0%) scale(1)';
            }, 200);
        }
        
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
                tutorialContent.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 200);
        }

        if (tutorialButton) {
            // Reset inicial
            tutorialButton.style.opacity = '0';
            tutorialButton.style.transform = 'translate(-50%, 0%) scale(0.7)';
            tutorialButton.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            // Animar entrada com delay maior
            setTimeout(() => {
                tutorialButton.style.opacity = '1';
                tutorialButton.style.transform = 'translate(-50%, 0%) scale(1)';
                
                // Adicionar animação de pulse após a entrada
                setTimeout(() => {
                    tutorialButton.style.animation = 'tutorial-button-pulse 2s ease-in-out infinite';
                }, 1000);
            }, 500);
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
        `;
        document.head.appendChild(style);
    }
    
    startTutorialSequence() {
        // Iniciar a sequência de imagens em loop
        this.currentImageIndex = 0;
        this.changeTutorialImage();
        
        // Configurar intervalo para trocar imagens automaticamente
        this.imageChangeInterval = setInterval(() => {
            this.nextTutorialImage();
        }, this.imageChangeDelay);
    }
    
    changeTutorialImage() {
        const tutorialSequence = document.getElementById('tutorial-sequence');
        if (tutorialSequence) {
            // Fade out
            tutorialSequence.style.opacity = '0';
            tutorialSequence.style.transition = 'opacity 0.5s ease-in-out';
            
            setTimeout(() => {
                // Trocar imagem
                tutorialSequence.src = this.tutorialImages[this.currentImageIndex];
                
                // Fade in
                setTimeout(() => {
                    tutorialSequence.style.opacity = '1';
                }, 100);
            }, 500);
        }
    }
    
    nextTutorialImage() {
        this.currentImageIndex = (this.currentImageIndex + 1) % this.tutorialImages.length;
        this.changeTutorialImage();
    }
    
    stopTutorialSequence() {
        if (this.imageChangeInterval) {
            clearInterval(this.imageChangeInterval);
            this.imageChangeInterval = null;
        }
    }
    
    handleExit() {
        // Lógica específica ao sair do tutorial
        console.log('📖 Saiu do tutorial');
        
        // Parar a sequência de imagens
        this.stopTutorialSequence();
        
        // Parar narração se estiver tocando
        this.stopNarracao();
    }
    
    toggleNarracao() {
        if (this.isNarracaoPlaying) {
            this.stopNarracao();
        } else {
            this.playNarracao();
        }
    }
    
    playNarracao() {
        // Implementar reprodução de narração
        console.log('🔊 Reproduzindo narração...');
        this.isNarracaoPlaying = true;
        
        // Atualizar botão
        const narracaoButton = this.element.querySelector('#narracao-button');
        if (narracaoButton) {
            narracaoButton.textContent = '⏸️ Pausar';
        }
    }
    
    stopNarracao() {
        // Parar narração
        console.log('🔇 Narração pausada');
        this.isNarracaoPlaying = false;
        
        // Atualizar botão
        const narracaoButton = this.element.querySelector('#narracao-button');
        if (narracaoButton) {
            narracaoButton.textContent = '🔊 Ouvir';
        }
    }
    
    startAutoNarracao() {
        // Iniciar narração automaticamente após um delay
        setTimeout(() => {
            if (this.isScreenActive()) {
                this.playNarracao();
            }
        }, 1000);
    }
    
    skipTutorial() {
        // Pular tutorial e ir direto para a UI
        console.log('⏭️ Tutorial pulado');
        this.nextScreen();
        window.SoundManager.forceAudioActivation();
        window.SoundManager.playSoundWithControl('click');
    }
}

// Exportar para uso global
window.TutorialScreen = TutorialScreen;