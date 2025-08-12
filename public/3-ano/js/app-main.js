/**
 * App Main - Aplicação Principal
 * Integração limpa e organizada com a nova Game Engine
 */

class AppMain {
    constructor() {
        this.engine = null;
        this.currentPhase = AppConfig.get('puzzle.defaultPhase', 'fase1');
        this.gameData = null;
        this.isARMode = AppConfig.get('ar.enableAR', true);
        this.currentStream = null;
        this.photographedPieces = new Set();
        
        this.init();
    }
    
    async init() {
        // Aguardar a engine estar pronta
        document.addEventListener('DOMContentLoaded', async () => {
            // Inicializar viewportUnitsBuggyfill
            this.initViewportBuggyfill();
            
            // Prevenir zoom de pinça
            this.preventPinchZoom();
            
            // Aguardar a engine estar pronta
            await this.waitForEngine();
            
            // Inicializar aplicação
            await this.initializeApp();
        });
    }
    
    // Aguardar a engine estar pronta
    async waitForEngine() {
        return new Promise((resolve) => {
            const checkEngine = () => {
                if (window.gameEngine) {
                    this.engine = window.gameEngine;
                    resolve();
                } else {
                    setTimeout(checkEngine, 100);
                }
            };
            checkEngine();
        });
    }
    
    // Inicializar aplicação
    async initializeApp() {
        this.engine.log('🎮 Inicializando aplicação principal');
        
        // Carregar dados do jogo
        await this.loadGameData();
        
        // Configurar módulos customizados
        this.setupCustomModules();
        
        // Configurar telas
        this.setupScreens();
        
        // Configurar eventos da aplicação
        this.setupAppEvents();
        
        // Inicializar componentes A-Frame
        this.setupAFrameComponents();
        
        // Mostrar tela inicial
        this.showInitialScreen();
        
        this.engine.log('✅ Aplicação inicializada com sucesso');
    }
    
    // Carregar dados do jogo
    async loadGameData() {
        try {
            const dataPath = AppConfig.get('data.dataPath', 'assets/data/data.json');
            const data = await this.engine.loadData(dataPath);
            this.gameData = data;
            this.engine.log('📊 Dados do jogo carregados');
        } catch (error) {
            this.engine.log('❌ Erro ao carregar dados do jogo', 'error');
        }
    }
    
    // Configurar módulos customizados
    setupCustomModules() {
        // Registrar módulos específicos da aplicação
        const customModules = [
            {
                name: 'puzzleManager',
                module: PuzzleGameManager,
                config: {
                    gameData: this.gameData,
                    currentPhase: this.currentPhase,
                    ...AppConfig.getModuleConfig('puzzle')
                }
            },
            {
                name: 'arManager',
                module: ARGameManager,
                config: {
                    photographedPieces: this.photographedPieces,
                    ...AppConfig.getModuleConfig('ar')
                }
            }
        ];
        
        customModules.forEach(moduleConfig => {
            this.engine.registerCustomModule(moduleConfig);
        });
    }
    
    // Configurar telas
    setupScreens() {
        // Registrar telas customizadas
        const screens = [
            { name: 'main', screen: new MainScreen(this.engine) },
            { name: 'tutorial', screen: new TutorialScreen(this.engine) },
            { name: 'puzzle', screen: new PuzzleScreen(this.engine) },
            { name: 'congratulations', screen: new CongratulationsScreen(this.engine) }
        ];
        
        screens.forEach(({ name, screen }) => {
            this.engine.registerScreen(name, screen);
        });
    }
    
    // Configurar eventos da aplicação
    setupAppEvents() {
        // Eventos de mudança de tela
        this.engine.on('screenChanged', (data) => {
            this.handleScreenChange(data);
        });
        
        // Eventos de puzzle
        this.engine.on('puzzleCompleted', (data) => {
            this.handlePuzzleCompletion(data);
        });
        
        // Eventos de AR
        this.engine.on('piecePhotographed', (data) => {
            this.handlePiecePhotographed(data);
        });
        
        // Eventos de dados
        this.engine.on('dataLoaded', (data) => {
            this.handleDataLoaded(data);
        });
        
        // Eventos de modo AR
        this.engine.on('modeChanged', (data) => {
            this.handleModeChange(data);
        });
    }
    
    // Configurar componentes A-Frame
    setupAFrameComponents() {
        // Componente para objetos sempre olharem para a câmera
        AFRAME.registerComponent('billboard', {
            tick: function () {
                const camera = document.querySelector('[camera]');
                if (camera) {
                    this.el.object3D.lookAt(camera.object3D.position);
                }
            }
        });
        
        // Componente para interação com peças
        AFRAME.registerComponent('piece-interaction', {
            init: function () {
                this.el.addEventListener('mouseenter', this.onMouseEnter.bind(this));
                this.el.addEventListener('mouseleave', this.onMouseLeave.bind(this));
                this.el.addEventListener('click', this.onClick.bind(this));
            },
            
            onMouseEnter: function () {
                this.el.setAttribute('scale', '1.1 1.1 1.1');
            },
            
            onMouseLeave: function () {
                this.el.setAttribute('scale', '1 1 1');
            },
            
            onClick: function () {
                this.el.emit('pieceClicked', { pieceId: this.el.dataset.pieceId });
            }
        });
    }
    
    // Mostrar tela inicial
    showInitialScreen() {
        // Verificar se é primeira vez
        const isFirstTime = !this.engine.getData('hasSeenTutorial');
        const tutorialConfig = AppConfig.getScreenConfig('tutorial');
        
        if (isFirstTime && tutorialConfig.showOnFirstTime) {
            this.engine.showScreen('tutorial');
        } else {
            const defaultScreen = AppConfig.get('screens.defaultScreen', 'main');
            this.engine.showScreen(defaultScreen);
        }
    }
    
    // Handlers de eventos
    handleScreenChange(data) {
        this.engine.log(`🔄 Mudança de tela: ${data.from} → ${data.to}`);
    }
    
    handlePuzzleCompletion(data) {
        this.engine.log('🎉 Puzzle completado!');
        this.engine.showScreen('congratulations', data);
    }
    
    handlePiecePhotographed(data) {
        this.photographedPieces.add(data.pieceId);
        this.updatePhotoCounter();
        this.engine.log(`📸 Peça fotografada: ${data.pieceId}`);
    }
    
    handleDataLoaded(data) {
        this.engine.log('📊 Dados carregados com sucesso');
    }
    
    handleModeChange(data) {
        this.isARMode = data.isARMode;
        this.engine.log(`🌅 Modo alterado: ${this.isARMode ? 'AR' : 'HDRI'}`);
    }
    
    // Atualizar contador de fotos
    updatePhotoCounter() {
        if (!AppConfig.isFeatureEnabled('ui.enablePhotoCounter')) return;
        
        const photoCount = document.getElementById('photo-count');
        const totalPieces = document.getElementById('total-pieces');
        
        if (photoCount && totalPieces) {
            photoCount.textContent = this.photographedPieces.size;
            totalPieces.textContent = this.gameData?.pieces?.length || 0;
        }
    }
    
    // Inicializar viewportUnitsBuggyfill
    initViewportBuggyfill() {
        if (window.viewportUnitsBuggyfill) {
            viewportUnitsBuggyfill.init({
                refreshDebounceWait: 250,
                hacks: viewportUnitsBuggyfill.hacks
            });
            
            // Recarregar quando a orientação mudar
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    viewportUnitsBuggyfill.refresh();
                }, 500);
            });
            
            window.addEventListener('resize', () => {
                viewportUnitsBuggyfill.refresh();
            });
        }
    }
    
    // Prevenir zoom de pinça
    preventPinchZoom() {
        let lastTouchEnd = 0;
        
        document.addEventListener('touchstart', (event) => {
            if (event.touches.length > 1) {
                event.preventDefault();
            }
        }, { passive: false });
        
        document.addEventListener('touchend', (event) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
        
        document.addEventListener('gesturestart', (event) => {
            event.preventDefault();
        }, { passive: false });
        
        document.addEventListener('gesturechange', (event) => {
            event.preventDefault();
        }, { passive: false });
        
        document.addEventListener('gestureend', (event) => {
            event.preventDefault();
        }, { passive: false });
        
        document.addEventListener('wheel', (event) => {
            if (event.ctrlKey) {
                event.preventDefault();
            }
        }, { passive: false });
        
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && (event.key === '+' || event.key === '-' || event.key === '=')) {
                event.preventDefault();
            }
        }, { passive: false });
    }
    
    // Métodos de conveniência
    getEngine() {
        return this.engine;
    }
    
    getGameData() {
        return this.gameData;
    }
    
    getCurrentPhase() {
        return this.currentPhase;
    }
    
    setCurrentPhase(phase) {
        this.currentPhase = phase;
        this.engine.setState('currentPhase', phase);
    }
    
    isARMode() {
        return this.isARMode;
    }
    
    setARMode(mode) {
        this.isARMode = mode;
        this.engine.setState('arMode', mode);
    }
    
    getPhotographedPieces() {
        return this.photographedPieces;
    }
    
    resetPhotographedPieces() {
        this.photographedPieces.clear();
        this.updatePhotoCounter();
    }
    
    // Obter tradução
    getTranslation(key, language = null) {
        return AppConfig.getTranslation(key, language);
    }
    
    // Verificar se um recurso está habilitado
    isFeatureEnabled(feature) {
        return AppConfig.isFeatureEnabled(feature);
    }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.appMain = new AppMain();
});

// Exportar para uso global
window.AppMain = AppMain;