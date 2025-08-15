/**
 * Game Over Screen - Tela de Game Over
 * Tela de game over do jogo
 */

class GameOverScreen extends BaseScreen {
    constructor() {
        super('gameOver', {
            next: 'selfie',
            onEnter: () => this.handleEnter(),
            onExit: () => this.handleExit()
        });
    }
    
    onInit() {
        this.setupNarracaoButton();
    } 

    setupNarracaoButton() {
        const narracaoButton = this.element.querySelector('#narracao-gameOver');
        if (narracaoButton) {
            narracaoButton.addEventListener('click', () => {
                window.SoundManager.forceAudioActivation();
                window.SoundManager.playSoundWithControl('NA002');
            });
        }
    }
    
    handleEnter() {
        // Lógica específica ao entrar na tela de game over
        console.log('💀 Entrou na tela gameOver do jogo');
        
        // Animar elementos da tela de game over
        this.animateGameOverElements();
    }
    
    animateGameOverElements() {
        // Elementos principais da tela de game over
        const gameOverTop = document.getElementById('gameOver-container');
        const gameOverButton = document.getElementById('gameOver-button');
        const gameOverBackground = document.getElementById('gameOver');
        const mascote = document.getElementById('mascote-gameOver');
        
        // Animar fundo primeiro
        if (gameOverBackground) {
            gameOverBackground.style.opacity = '0';
            gameOverBackground.style.transition = 'opacity 1s ease-in-out';
            
            setTimeout(() => {
                gameOverBackground.style.opacity = '1';
            }, 100);
        }
        
        if (gameOverTop) {
            // Reset inicial
            gameOverTop.style.opacity = '0';
            gameOverTop.style.transform = 'translate(-50%, -300%) scale(0.7)';
            gameOverTop.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            // Animar entrada com delay
            setTimeout(() => {
                gameOverTop.style.opacity = '1';
                gameOverTop.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 200);
        }

        if (mascote) {
            mascote.style.opacity = '0';
            mascote.style.transform = 'translate(-200%, 0%) scale(0.7)';
            mascote.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

            setTimeout(() => {
                mascote.style.opacity = '1';
                mascote.style.transform = 'translate(0%, 0%) scale(1)';
            }, 200);
        }

        if (gameOverButton) {
            // Reset inicial
            gameOverButton.style.opacity = '0';
            gameOverButton.style.transform = 'translate(-50%, 0%) scale(0.7)';
            gameOverButton.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            // Animar entrada com delay maior
            setTimeout(() => {
                gameOverButton.style.opacity = '1';
                gameOverButton.style.transform = 'translate(-50%, 0%) scale(1)';
            }, 500);
        }
        
        // Adicionar evento de clique no botão de game over
        if (gameOverButton) {
            gameOverButton.addEventListener('click', () => {
                // Ir para a próxima tela usando o screen manager
                if (window.screenManager) {
                    window.screenManager.showScreen('selfie');
                } else {
                    console.warn('⚠️ Screen manager não encontrado, recarregando página');
                    window.location.reload();
                }
            });
        }
    }
    
    handleExit() {
               
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
window.GameOverScreen = GameOverScreen;