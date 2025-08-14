/**
 * Final Screen - Tela de Final
 * Tela de final do jogo
 */

class FinalScreen extends BaseScreen {
    constructor() {
        super('final', {
            next: 'selfie',
            onEnter: () => this.handleEnter(),
            onExit: () => this.handleExit()
        });
    }
    
    onInit() {
       
    } 
    
    handleEnter() {
        // Lógica específica ao entrar na tela final
        console.log('🏆 Entrou na tela final do jogo');
        
        // Animar elementos da tela final
        this.animateFinalElements();
    }
    
    animateFinalElements() {
        // Elementos principais da tela final
        const finalTop = document.getElementById('final-container');
        const finalButton = document.getElementById('final-button');
        const finalBackground = document.getElementById('final');
        const mascote = document.getElementById('mascote');
        
        // Animar fundo primeiro
        if (finalBackground) {
            finalBackground.style.opacity = '0';
            finalBackground.style.transition = 'opacity 1s ease-in-out';
            
            setTimeout(() => {
                finalBackground.style.opacity = '1';
            }, 100);
        }
        
        if (finalTop) {
            // Reset inicial
            finalTop.style.opacity = '0';
            finalTop.style.transform = 'translate(-50%, -300%) scale(0.7)';
            finalTop.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            // Animar entrada com delay
            setTimeout(() => {
                finalTop.style.opacity = '1';
                finalTop.style.transform = 'translate(-50%, -50%) scale(1)';
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

        if (finalButton) {
            // Reset inicial
            finalButton.style.opacity = '0';
            finalButton.style.transform = 'translate(-50%, 0%) scale(0.7)';
            finalButton.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            // Animar entrada com delay maior
            setTimeout(() => {
                finalButton.style.opacity = '1';
                finalButton.style.transform = 'translate(-50%, 0%) scale(1)';
            }, 500);
        }
        
        // Adicionar evento de clique no botão final
        if (finalButton) {
            finalButton.addEventListener('click', () => {
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
window.FinalScreen = FinalScreen;