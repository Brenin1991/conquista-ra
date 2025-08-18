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
                this.nextScreen();
                window.SoundManager.forceAudioActivation();
                window.SoundManager.playSoundWithControl('click');
            });
        }
    }
    
    setupNarracaoButton() {
        const narracaoButton = this.element.querySelector('#narracao-tutorial');
        if (narracaoButton) {
            narracaoButton.addEventListener('click', () => {
                window.SoundManager.forceAudioActivation();
                window.SoundManager.playSoundWithControl('NA001');
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
        const tutorialButton = document.getElementById('tutorial-button');
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
                tutorialContent.style.transform = 'translate(-50%, -50%) scale(1)';
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
        `;
        document.head.appendChild(style);
    }
    
    cleanupTutorialAnimations() {
        // Remover animação do botão
        const tutorialButton = document.getElementById('tutorial-button');
        if (tutorialButton) {
            tutorialButton.style.animation = '';
        }
        
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
            window.SoundManager.playSoundWithControl('NA001');
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