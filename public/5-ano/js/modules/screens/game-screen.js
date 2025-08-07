/**
 * Game Screen - Tela do Jogo
 * Jogo de perguntas e respostas com fases dinâmicas
 */

class GameScreen extends BaseScreen {
    constructor() {
        super('game', {
            next: 'selfie',
            onEnter: () => this.handleEnter(),
            onExit: () => this.handleExit()
        });
        
        this.gameData = null;
        this.currentFase = null;
        this.selectedAnswer = null;
        this.gameState = 'content'; // 'content', 'selected', 'fallback', 'goto-selfie'
    }
    
    onInit() {
        this.loadGameData();
        this.setupGameElements();
    }
    
    async loadGameData() {
        try {
            const response = await fetch('assets/data/data.json');
            this.gameData = await response.json();
            console.log('📊 Dados do jogo carregados:', this.gameData);
            
            // Pré-carregar imagens dos personagens
            this.preloadPersonagens();
        } catch (error) {
            console.error('❌ Erro ao carregar dados do jogo:', error);
        }
    }
    
    preloadPersonagens() {
        const fases = Object.keys(this.gameData);
        fases.forEach(fase => {
            // Pré-carregar personagem do game
            const gamePersonagem = new Image();
            gamePersonagem.src = `assets/textures/${fase}/personagem.png`;
            
            // Pré-carregar personagem da selfie
            const selfiePersonagem = new Image();
            selfiePersonagem.src = `assets/textures/${fase}/personagem-selfie.png`;
        });
        console.log('🖼️ Personagens pré-carregados');
    }
    
    setupGameElements() {
        // Configurar botão de ir para selfie
        const gotoSelfieButton = this.element.querySelector('#goto-selfie-button');
        if (gotoSelfieButton) {
            gotoSelfieButton.addEventListener('click', () => {
                // Passar informação da fase para a tela selfie
                if (window.screenManager) {
                    const selfieScreen = window.screenManager.getScreen('selfie');
                    if (selfieScreen) {
                        selfieScreen.setCurrentFase(this.currentFase);
                    }
                }
                this.nextScreen();
            });
        }
    }
    
    handleEnter() {
        console.log('🎮 Entrou na tela do jogo');
        this.startGame();
    }
    
    handleExit() {
        console.log('👋 Saiu da tela do jogo');
        this.cleanupGame();
    }
    
    startGame() {
        if (!this.gameData) {
            console.error('❌ Dados do jogo não carregados');
            return;
        }
        
        // Sortear uma fase aleatória
        const fases = Object.keys(this.gameData);
        this.currentFase = fases[Math.floor(Math.random() * fases.length)];
        console.log('🎲 Fase selecionada:', this.currentFase);
        
        this.showGameContent();
    }
    
    showGameContent() {
        this.gameState = 'content';
        
        // Esconder outras seções
        this.hideAllSections();
        
        // Mostrar game-content
        const gameContent = this.element.querySelector('#game-content');
        if (gameContent) {
            gameContent.style.display = 'block';
            gameContent.style.opacity = '0';
            gameContent.style.transition = 'opacity 0.5s ease-in-out';
            
            // Limpar conteúdo anterior
            this.clearGameContent();
            
            // Adicionar pergunta
            this.addPergunta();
            
            // Adicionar respostas
            this.addRespostas();
            
            // Fade in
            setTimeout(() => {
                gameContent.style.opacity = '1';
            }, 100);
        }
    }
    
    clearGameContent() {
        const gameContent = this.element.querySelector('#game-content');
        if (gameContent) {
            // Manter apenas as imagens de fundo (game-top e game-bottom)
            const perguntaImg = gameContent.querySelector('#pergunta-img');
            const respostasContainer = gameContent.querySelector('#respostas-container');
            
            if (perguntaImg) perguntaImg.remove();
            if (respostasContainer) respostasContainer.remove();
        }
    }
    
    addPergunta() {
        const gameContent = this.element.querySelector('#game-content');
        if (!gameContent || !this.currentFase) return;
        
        const perguntaSrc = this.gameData[this.currentFase].pergunta;
        
        const perguntaImg = document.createElement('img');
        perguntaImg.id = 'pergunta-img';
        perguntaImg.src = perguntaSrc;
        perguntaImg.alt = 'Pergunta';
        perguntaImg.style.cssText = `
            position: absolute;
            top: 20%;
            left: 50%;
            transform: translate(-50%, -50%);
            max-width: 80%;
            max-height: 40%;
            object-fit: contain;
            z-index: 2101;
        `;
        
        gameContent.appendChild(perguntaImg);
    }
    
    addRespostas() {
        const gameContent = this.element.querySelector('#game-content');
        if (!gameContent || !this.currentFase) return;
        
        const respostas = this.gameData[this.currentFase].respostas;
        
        const respostasContainer = document.createElement('div');
        respostasContainer.id = 'respostas-container';
        respostasContainer.style.cssText = `
            position: absolute;
            bottom: 10%;
            left: 50%;
            transform: translate(-50%, 0%);
            display: flex;
            flex-direction: column;
            gap: 20px;
            z-index: 2101;
            pointer-events: auto;
        `;
        
        respostas.forEach((respostaSrc, index) => {
            const respostaImg = document.createElement('img');
            respostaImg.src = respostaSrc;
            respostaImg.alt = `Resposta ${index + 1}`;
            respostaImg.style.cssText = `
                max-width: 400px;
                max-height: 300px;
                width: 100%;
                height: auto;
                object-fit: contain;
                cursor: pointer;
                transition: transform 0.2s ease;
                pointer-events: auto;
            `;
            
            // Adicionar evento de clique
            respostaImg.addEventListener('click', () => {
                this.selectAnswer(index);
            });
            
            // Adicionar hover effect
            respostaImg.addEventListener('mouseenter', () => {
                respostaImg.style.transform = 'scale(1.05)';
            });
            
            respostaImg.addEventListener('mouseleave', () => {
                respostaImg.style.transform = 'scale(1)';
            });
            
            respostasContainer.appendChild(respostaImg);
        });
        
        gameContent.appendChild(respostasContainer);
    }
    
    selectAnswer(answerIndex) {
        this.selectedAnswer = answerIndex;
        console.log('✅ Resposta selecionada:', answerIndex);
        
        this.showSelectedAnswer();
    }
    
    showSelectedAnswer() {
        this.gameState = 'selected';
        
        // Esconder outras seções
        this.hideAllSections();
        
        // Mostrar game-content com resposta selecionada
        const gameContent = this.element.querySelector('#game-content');
        if (gameContent) {
            gameContent.style.display = 'block';
            gameContent.style.opacity = '0';
            gameContent.style.transition = 'opacity 0.5s ease-in-out';
            
            // Limpar conteúdo anterior
            this.clearGameContent();
            
            // Adicionar apenas a resposta selecionada (sem pergunta)
            this.addSelectedAnswer();
            
            // Fade in
            setTimeout(() => {
                gameContent.style.opacity = '1';
            }, 100);
        }
        
        // Aguardar alguns segundos e ir para fallback
        setTimeout(() => {
            this.showFallback();
        }, 2000);
    }
    
    addSelectedAnswer() {
        const gameContent = this.element.querySelector('#game-content');
        if (!gameContent || this.selectedAnswer === null) return;
        
        // Construir nome da imagem selecionada
        const fase = this.currentFase;
        const selectedAnswerSrc = `assets/textures/${fase}/resposta-0${this.selectedAnswer + 1}-select.png`;
        
        const selectedImg = document.createElement('img');
        selectedImg.id = 'selected-answer-img';
        selectedImg.src = selectedAnswerSrc;
        selectedImg.alt = 'Resposta Selecionada';
        selectedImg.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            max-width: 80%;
            max-height: 80%;
            object-fit: contain;
            z-index: 2101;
        `;
        
        gameContent.appendChild(selectedImg);
    }
    
    showFallback() {
        this.gameState = 'fallback';
        
        // Esconder outras seções
        this.hideAllSections();
        
        // Atualizar personagem da fase ANTES de mostrar a tela
        this.updatePersonagem();
        
        // Mostrar fallback
        const fallback = this.element.querySelector('#fallback');
        if (fallback) {
            fallback.style.display = 'block';
            fallback.style.opacity = '0';
            fallback.style.transition = 'opacity 0.5s ease-in-out';
            
            // Limpar conteúdo anterior
            this.clearFallback();
            
            // Adicionar imagem de fallback
            this.addFallbackImage();
            
            // Fade in
            setTimeout(() => {
                fallback.style.opacity = '1';
            }, 100);
        }
        
        // Aguardar alguns segundos e ir para goto-selfie
        setTimeout(() => {
            this.showGotoSelfie();
        }, 3000);
    }
    
    clearFallback() {
        const fallback = this.element.querySelector('#fallback');
        if (fallback) {
            const fallbackImg = fallback.querySelector('#fallback-img');
            if (fallbackImg) fallbackImg.remove();
        }
    }
    
    addFallbackImage() {
        const fallback = this.element.querySelector('#fallback');
        if (!fallback || this.selectedAnswer === null) return;
        
        // Construir nome da imagem de fallback
        const fase = this.currentFase;
        const fallbackSrc = `assets/textures/${fase}/fallback-0${this.selectedAnswer + 1}.png`;
        
        const fallbackImg = document.createElement('img');
        fallbackImg.id = 'fallback-img';
        fallbackImg.src = fallbackSrc;
        fallbackImg.alt = 'Fallback';
        fallbackImg.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            max-width: 80%;
            max-height: 80%;
            object-fit: contain;
            z-index: 2101;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
        `;
        
        fallback.appendChild(fallbackImg);
        
        // Fade in
        setTimeout(() => {
            fallbackImg.style.opacity = '1';
        }, 100);
    }
    
    showGotoSelfie() {
        this.gameState = 'goto-selfie';
        
        // Esconder outras seções
        this.hideAllSections();
        
        // Atualizar personagem da fase ANTES de mostrar a tela
        this.updatePersonagem();
        
        // Mostrar goto-selfie
        const gotoSelfie = this.element.querySelector('#goto-selfie');
        if (gotoSelfie) {
            gotoSelfie.style.display = 'block';
            gotoSelfie.style.opacity = '0';
            gotoSelfie.style.transition = 'opacity 0.5s ease-in-out';
            
            // Fade in
            setTimeout(() => {
                gotoSelfie.style.opacity = '1';
            }, 100);
        }
    }
    
    updatePersonagem() {
        const personagemImg = this.element.querySelector('#personagem-game');
        if (personagemImg && this.currentFase) {
            const personagemSrc = `assets/textures/${this.currentFase}/personagem.png`;
            personagemImg.src = personagemSrc;
            console.log('👤 Personagem atualizado para:', personagemSrc);
        }
    }
    
    hideAllSections() {
        const sections = ['#game-content', '#fallback', '#goto-selfie'];
        sections.forEach(selector => {
            const section = this.element.querySelector(selector);
            if (section) {
                section.style.display = 'none';
            }
        });
    }
    
    cleanupGame() {
        // Limpar estado do jogo
        this.gameState = 'content';
        this.selectedAnswer = null;
        this.currentFase = null;
        
        // Limpar elementos dinâmicos
        this.clearGameContent();
        this.clearFallback();
        
        // Esconder todas as seções
        this.hideAllSections();
    }
}

// Exportar para uso global
window.GameScreen = GameScreen;