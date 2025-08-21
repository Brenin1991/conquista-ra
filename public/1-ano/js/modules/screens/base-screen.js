/**
 * Base Screen - Classe base para todas as telas
 * Fornece funcionalidades comuns a todas as telas
 */

class BaseScreen {
    constructor(elementId, config = {}) {
        this.elementId = elementId;
        this.element = document.getElementById(elementId);
        this.config = {
            next: null,
            onEnter: () => {},
            onExit: () => {},
            ...config
        };
        
        this.isActive = false;
        this.isTransitioning = false;
        
        this.init();
    }
    
    init() {
        if (!this.element) {
            console.error(`❌ Elemento da tela não encontrado: ${this.elementId}`);
            return;
        }
        
        this.setupEventListeners();
        this.onInit();
    }
    
    setupEventListeners() {
        // Configurar botões padrão se existirem
        const nextButton = this.element.querySelector('[data-screen-next]');
        if (nextButton) {
            nextButton.addEventListener('click', () => this.nextScreen());
        }
        
        const prevButton = this.element.querySelector('[data-screen-prev]');
        if (prevButton) {
            prevButton.addEventListener('click', () => this.previousScreen());
        }
    }
    
    // Método para ser sobrescrito pelas classes filhas
    onInit() {
        // Implementação padrão vazia
    }
    
    // Mostrar a tela
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
        
        // Esconder todas as telas EXCETO a atual (para primeira execução)
        this.hideAllScreensExcept(this.element);
        
        // Preparar tela para animação
        this.element.style.display = 'block';
        this.element.style.visibility = 'visible';
        this.element.style.opacity = '0';
        this.element.style.transition = 'opacity 0.5s ease-in-out';
        
        // Adicionar classe ativo se existir
        if (this.element.classList.contains('selfie-screen')) {
            this.element.classList.add('ativo');
        }
        
        // Adicionar classe de animação específica
        this.element.classList.add('entering');
        
        this.isActive = true;
        
        // Animar entrada da tela (apenas opacity)
        requestAnimationFrame(() => {
            this.element.style.opacity = '1';
            
            // Animar elementos internos com delay
            this.animateInternalElements();
        });
        
        // Executar função de entrada
        setTimeout(() => {
            this.config.onEnter();
            this.onEnter();
        }, 300);
        
        // Finalizar transição
        setTimeout(() => {
            this.isTransitioning = false;
            this.element.classList.remove('entering');
        }, 800);
    }
    
    // Animar elementos internos da tela
    animateInternalElements() {
        const buttons = this.element.querySelectorAll('button, .selfie-button, .puzzle-button, .congratulations-button');
        const headers = this.element.querySelectorAll('.puzzle-header, .selfie-header, .congratulations-content');
        const images = this.element.querySelectorAll('img');
        
        // Animar botões (apenas opacity)
        buttons.forEach((button, index) => {
            setTimeout(() => {
                button.style.opacity = '0';
                button.style.transition = 'opacity 0.4s ease-out';
                
                requestAnimationFrame(() => {
                    button.style.opacity = '1';
                });
            }, 200 + (index * 100));
        });
        
        // Animar headers (apenas opacity)
        headers.forEach((header, index) => {
            setTimeout(() => {
                header.style.opacity = '0';
                header.style.transition = 'opacity 0.5s ease-out';
                
                requestAnimationFrame(() => {
                    header.style.opacity = '1';
                });
            }, 100 + (index * 50));
        });
        
        // Animar imagens (apenas opacity)
        images.forEach((img, index) => {
            setTimeout(() => {
                img.style.opacity = '0';
                img.style.transition = 'opacity 0.6s ease-out';
                
                requestAnimationFrame(() => {
                    img.style.opacity = '1';
                });
            }, 300 + (index * 50));
        });
    }
    
    // Esconder a tela
    hide() {
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        
        // Adicionar classe de saída
        this.element.classList.add('screen-exiting');
        
        // Animar saída da tela (apenas opacity)
        this.element.style.opacity = '0';
        
        setTimeout(() => {
            this.element.style.display = 'none';
            this.element.style.visibility = 'hidden';
            this.element.classList.remove('screen-exiting', 'entering');
            this.isActive = false;
            this.isTransitioning = false;
            
            this.config.onExit();
            this.onExit();
        }, 400);
    }
    
    // Ir para próxima tela
    nextScreen() {
        if (this.config.next && window.screenManager) {
            window.screenManager.showScreen(this.config.next);
        }
    }
    
    // Voltar para tela anterior
    previousScreen() {
        if (window.screenManager) {
            window.screenManager.previousScreen();
        }
    }
    
    // Esconder todas as telas
    hideAllScreens() {
        // Esconder todas as telas por ID
        const allScreens = document.querySelectorAll('#main, #tutorial, #game, #interacao, #final, #gameOver, #selfie');
        allScreens.forEach(screen => {
            screen.style.display = 'none';
            screen.style.opacity = '0';
            screen.style.visibility = 'hidden';
            screen.classList.remove('ativo');
        });
        
        // Esconder telas por classe CSS também
        const cssScreens = document.querySelectorAll('.selfie-screen');
        cssScreens.forEach(screen => {
            screen.style.display = 'none';
            screen.style.opacity = '0';
            screen.style.visibility = 'hidden';
            screen.classList.remove('ativo');
        });
        
        console.log('👁️ Todas as telas escondidas');
    }
    
    // Esconder todas as telas exceto uma específica
    hideAllScreensExcept(exceptElement) {
        // Esconder todas as telas por ID
        const allScreens = document.querySelectorAll('#main, #tutorial, #game, #interacao, #final, #gameOver, #selfie');
        allScreens.forEach(screen => {
            if (screen !== exceptElement) {
                screen.style.display = 'none';
                screen.style.opacity = '0';
                screen.style.visibility = 'hidden';
                screen.classList.remove('ativo');
            }
        });
        
        // Esconder telas por classe CSS também
        const cssScreens = document.querySelectorAll('.selfie-screen');
        cssScreens.forEach(screen => {
            if (screen !== exceptElement) {
                screen.style.display = 'none';
                screen.style.opacity = '0';
                screen.style.visibility = 'hidden';
                screen.classList.remove('ativo');
            }
        });
        
        console.log('👁️ Todas as telas escondidas (exceto atual)');
    }
    
    // Métodos para ser sobrescritos pelas classes filhas
    onEnter() {
        // Implementação padrão vazia
    }
    
    onExit() {
        // Implementação padrão vazia
    }
    
    // Verificar se a tela está ativa
    isScreenActive() {
        return this.isActive;
    }
    
    // Obter elemento da tela
    getElement() {
        return this.element;
    }
    
    // Obter configuração da tela
    getConfig() {
        return this.config;
    }
}

// Exportar para uso global
window.BaseScreen = BaseScreen;