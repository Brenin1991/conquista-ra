/**
 * Main Screen - Tela Principal
 * Primeira tela da aplicação com botão de início
 */

class MainScreen extends BaseScreen {
    constructor() {
        super('main', {
            next: 'tutorial',
            onEnter: () => this.handleEnter(),
            onExit: () => this.handleExit()
        });
    }
    
    onInit() {
        // Configurações específicas da tela principal
        this.setupMainButton();
        this.setupCreditosButton();
    }
    
    setupMainButton() {
        const mainButton = this.element.querySelector('#main-button');
        if (mainButton) {
            mainButton.addEventListener('click', () => {
                this.nextScreen();
                window.SoundManager.forceAudioActivation();
                window.SoundManager.playSoundWithControl('click');
            });
        }
    }
    
    setupCreditosButton() {
        const creditosButton = this.element.querySelector('#creditos-button');
        const creditosPanel = this.element.querySelector('#creditos-panel');
        
        if (creditosButton && creditosPanel) {
            // Estado inicial: painel escondido
            this.isCreditosVisible = false;
            
            // Configurar transição suave
            creditosPanel.style.transition = 'transform 0.5s ease-in-out';
            
            // Evento de clique no botão
            creditosButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleCreditos();
            });
            
            // Evento de clique no painel para fechar
            creditosPanel.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.hideCreditos();
            });
        }
    }
    
    toggleCreditos() {
        if (this.isCreditosVisible) {
            this.hideCreditos();
        } else {
            this.showCreditos();
        }
    }
    
    showCreditos() {
        const creditosPanel = this.element.querySelector('#creditos-panel');
        if (creditosPanel && !this.isCreditosVisible) {
            creditosPanel.style.transform = 'translate(-50%, 50%)';
            this.isCreditosVisible = true;
            console.log('📋 Créditos exibidos');
        }
    }
    
    hideCreditos() {
        const creditosPanel = this.element.querySelector('#creditos-panel');
        if (creditosPanel && this.isCreditosVisible) {
            creditosPanel.style.transform = 'translate(-50%, -200%)';
            this.isCreditosVisible = false;
            console.log('📋 Créditos ocultados');
        }
    }
    
    handleEnter() {
        // Lógica específica ao entrar na tela principal
        console.log('🎮 Entrou na tela principal');
        
        // Resetar estado da aplicação se necessário
        this.resetApplicationState();
        
        // Configurar animações de entrada se houver
        this.setupEntranceAnimations();
    }
    
    handleExit() {
        // Lógica específica ao sair da tela principal
        console.log('👋 Saiu da tela principal');
        
        // Limpar animações se necessário
        this.cleanupAnimations();
    }
    
    resetApplicationState() {
        // Resetar estado global da aplicação
        console.log('🔄 Estado da aplicação resetado');
    }
    
    setupEntranceAnimations() {
        // Configurar animações de entrada se necessário
        const elements = this.element.querySelectorAll('.animate-on-enter');
        elements.forEach((element, index) => {
            setTimeout(() => {
                element.classList.add('animated');
            }, index * 200);
        });
    }
    
    cleanupAnimations() {
        // Limpar classes de animação
        const elements = this.element.querySelectorAll('.animate-on-enter');
        elements.forEach(element => {
            element.classList.remove('animated');
        });
    }
}

// Exportar para uso global
window.MainScreen = MainScreen;