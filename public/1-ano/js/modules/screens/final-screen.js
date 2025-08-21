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
        
        // Estado da animação do vaso
        this.vasoAnimationState = 'initial'; // initial, transforming, complete
        this.vasoElement = null;
        this.finalContainer = null;
    }
    
    onInit() {
        this.setupNarracaoButton();
    }
    
        setupVasoAnimation() {
        console.log('🔧 Configurando animação do vaso...');
        
        // Injetar CSS para animações
        this.injectVasoAnimations();
        
        // Criar elemento do vaso (overlay separado)
        this.vasoElement = document.createElement('div');
        this.vasoElement.id = 'vaso-final-animation';
        this.vasoElement.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 300px !important;
            height: 300px !important;
            z-index: 999999 !important;
            opacity: 0 !important;
            transition: all 0.8s ease-in-out !important;
            pointer-events: none !important;
        `;
        
        // Criar imagem do vaso
        const vasoImage = document.createElement('img');
        vasoImage.id = 'vaso-final-image';
        vasoImage.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: contain;
            filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
        `;
        
        this.vasoElement.appendChild(vasoImage);
        document.body.appendChild(this.vasoElement);
        
        console.log('🔍 Vaso criado e adicionado ao DOM');
        console.log('🔍 Elemento do vaso:', this.vasoElement);
        console.log('🔍 Z-index do vaso:', this.vasoElement.style.zIndex);
        console.log('🔍 Opacidade inicial do vaso:', this.vasoElement.style.opacity);
        
        // Obter o final-container existente (para o enunciado final)
        this.finalContainer = document.getElementById('final-container');
        
        if (!this.finalContainer) {
            console.error('❌ final-container não encontrado');
            return;
        }
        
        // Trocar a textura do final-container para o enunciado final da fase
        if (window.selectedFase && window.selectedFase['enunciado-final']) {
            this.finalContainer.style.backgroundImage = `url(${window.selectedFase['enunciado-final']})`;
            console.log('✅ Textura do final-container trocada para enunciado final da fase');
            console.log('🔍 URL do enunciado final:', window.selectedFase['enunciado-final']);
        } else {
            console.warn('⚠️ Nenhum enunciado-final encontrado na fase');
            console.log('🔍 Fase atual:', window.selectedFase);
        }
        
        console.log('✅ Sistema de animação do vaso configurado');
    }
    
    injectVasoAnimations() {
        if (document.getElementById('vaso-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'vaso-animations';
        style.textContent = `
            @keyframes vaso-glow {
                0%, 100% { 
                    filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
                }
                50% { 
                    filter: drop-shadow(0 15px 30px rgba(78, 205, 196, 0.5));
                }
            }
            
            @keyframes vaso-bounce {
                0%, 100% { transform: translate(-50%, -50%) scale(1); }
                50% { transform: translate(-50%, -50%) scale(1.05); }
            }
            
            @keyframes vaso-zoom-fade {
                0% { 
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                25% { 
                    transform: translate(-50%, -50%) scale(0.7);
                    opacity: 0.3;
                }
                50% { 
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 0.5;
                }
                75% { 
                    transform: translate(-50%, -50%) scale(1.2);
                    opacity: 0.9;
                }
                100% { 
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
            }
            
            @keyframes enunciado-slide-in {
                from { 
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8) translateY(30px);
                }
                to { 
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1) translateY(0);
                }
            }
            
            #vaso-final-animation.transforming {
                animation: vaso-zoom-fade 1.6s ease-in-out;
            }
            
            /* Animações removidas - final-container mantém CSS original */
        `;
        document.head.appendChild(style);
        
        console.log('✅ Animações CSS injetadas');
    } 

    setupNarracaoButton() {
        const narracaoButton = this.element.querySelector('#narracao-final');
        if (narracaoButton) {
            narracaoButton.addEventListener('click', () => {
                window.SoundManager.forceAudioActivation();
                window.SoundManager.playSoundWithControl('NA003');
            });
        }
    }
    
    handleEnter() {
        // Lógica específica ao entrar na tela final
        console.log('🏆 Entrou na tela final do jogo');
        
        // Aguardar um pouco para garantir que o DOM esteja pronto
        setTimeout(() => {
            // Configurar animação do vaso primeiro
            this.setupVasoAnimation();
            
            // Iniciar animação do vaso
            this.startVasoAnimation();
        }, 500); // Aumentei o delay para garantir que o DOM esteja pronto
        
        // Animar elementos da tela final após delay
        setTimeout(() => {
            this.animateFinalElements();
        }, 3000); // Delay para permitir animação do vaso
    }
    
    startVasoAnimation() {
        console.log('🌱 Iniciando animação do vaso...');
        
        // Debug das texturas dos vasos do JSON
        console.log('🔍 Fase atual para vasos:', window.selectedFase);
        console.log('🔍 Textura vazo-final:', window.selectedFase['vazo-final']);
        console.log('🔍 Textura vazo-final-completo:', window.selectedFase['vazo-final-completo']);
        
        if (!this.vasoElement) {
            console.error('❌ Elemento do vaso não encontrado');
            return;
        }
        
        console.log('🔍 Vaso encontrado:', this.vasoElement);
        console.log('🔍 Z-index atual do vaso:', this.vasoElement.style.zIndex);
        console.log('🔍 Opacidade atual do vaso:', this.vasoElement.style.opacity);
        
        // Fase 1: Mostrar vaso inicial
        this.vasoAnimationState = 'initial';
        const vasoImage = this.vasoElement.querySelector('#vaso-final-image');
        
        if (vasoImage) {
            console.log('🔍 Imagem do vaso encontrada:', vasoImage);
            
            // Mostrar vaso inicial
            vasoImage.src = window.selectedFase['vazo-final'] || 'assets/textures/reacoes/raiva/vazo_final.png';
            
            // Forçar visibilidade com !important
            this.vasoElement.style.setProperty('opacity', '1', 'important');
            this.vasoElement.style.setProperty('transform', 'translate(-50%, -50%) scale(1)', 'important');
            this.vasoElement.style.setProperty('z-index', '999999', 'important');
            
            // Adicionar classe para debug
            this.vasoElement.classList.add('vaso-visible');
            
            console.log('🌱 Vaso inicial mostrado como overlay');
            console.log('🔍 Opacidade após mostrar:', this.vasoElement.style.opacity);
            console.log('🔍 Transform após mostrar:', this.vasoElement.style.transform);
            
            // Fase 2: Transformar para vaso completo após delay
            setTimeout(() => {
                this.transformVaso();
            }, 1500);
        } else {
            console.error('❌ Imagem do vaso não encontrada');
        }
    }
    
    transformVaso() {
        console.log('🔄 Transformando vaso...');
        
        if (!this.vasoElement) return;
        
        this.vasoAnimationState = 'transforming';
        const vasoImage = this.vasoElement.querySelector('#vaso-final-image');
        
        if (vasoImage) {
            console.log('🔄 Iniciando transição do vaso...');
            
            // Fase 1: Zoom out + fade out (0.4s)
            this.vasoElement.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            this.vasoElement.style.transform = 'translate(-50%, -50%) scale(0.7)';
            this.vasoElement.style.opacity = '0.3';
            
            // Adicionar classe para animação CSS
            this.vasoElement.classList.add('transforming');
            
            // Fase 2: Trocar textura no meio da transição (0.4s)
            setTimeout(() => {
                vasoImage.src = window.selectedFase['vazo-final-completo'] || 'assets/textures/reacoes/raiva/vazo_final_completo.png';
                console.log('🔄 Textura do vaso trocada durante transição');
                
                // Fase 3: Zoom in + fade in (0.4s)
                this.vasoElement.style.transform = 'translate(-50%, -50%) scale(1.2)';
                this.vasoElement.style.opacity = '0.9';
                
                // Fase 4: Voltar ao normal (0.4s)
                setTimeout(() => {
                    this.vasoElement.style.transform = 'translate(-50%, -50%) scale(1)';
                    this.vasoElement.style.opacity = '1';
                    this.vasoAnimationState = 'complete';
                    
                    console.log('✅ Vaso transformado com sucesso');
                    
                    // Fase 5: Mostrar enunciado final após delay
                    setTimeout(() => {
                        this.hideEnunciadoAndShowFinal();
                    }, 1000);
                    
                }, 400);
                
            }, 400);
        }
    }
    

    
    hideEnunciadoAndShowFinal() {
        console.log('🎬 Escondendo enunciado e mostrando tela final...');
        
        if (!this.finalContainer) return;
        
        // Esconder o vaso se ainda estiver visível
        if (this.vasoElement) {
            this.vasoElement.style.opacity = '0';
            this.vasoElement.style.transform = 'translate(-50%, -50%) scale(0.8)';
        }
        
        console.log('✅ Vaso escondido, enunciado final permanece no final-container');
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
        window.SoundManager.stopCurrentSound();
        
        // Limpar elementos de animação
        this.cleanupAnimationElements();
    }
    
    cleanupAnimationElements() {
        // Remover vaso se existir
        if (this.vasoElement && this.vasoElement.parentNode) {
            this.vasoElement.parentNode.removeChild(this.vasoElement);
            this.vasoElement = null;
        }
        
        // Final-container mantém a textura do enunciado final da fase
        console.log('✅ Final-container mantém textura do enunciado final');
        
        // Remover animações CSS
        const styleElement = document.getElementById('vaso-animations');
        if (styleElement) {
            styleElement.remove();
        }
        
        console.log('🧹 Elementos de animação limpos');
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
            window.SoundManager.playSoundWithControl('NA003');
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