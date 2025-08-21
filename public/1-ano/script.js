document.addEventListener("DOMContentLoaded", function () {
    // Inicializar viewportUnitsBuggyfill para corrigir vh/vw em dispositivos móveis
    viewportUnitsBuggyfill.init({
        refreshDebounceWait: 250,
        hacks: viewportUnitsBuggyfill.hacks
    });
    
    // Prevenir zoom de pinça
    preventPinchZoom();
    
    // Mostrar overlay de carregamento
    showLoadingOverlay();

    initializeSoundManager();
    
    // Inicializar aplicação
    initializeApp();
});

async function initializeSoundManager() {
    try {
        await window.SoundManager.initialize();
        console.log('SoundManager inicializado com sucesso');
        
        // Ativar áudio em qualquer clique
        document.addEventListener('click', async () => {
            await window.SoundManager.forceAudioActivation();
        });
        
        document.addEventListener('touchstart', async () => {
            await window.SoundManager.forceAudioActivation();
        });
      
    } catch (error) {
        console.error('Erro ao inicializar SoundManager:', error);
    }
}

// Função para mostrar overlay de carregamento
function showLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg,rgb(255, 255, 255) 0%,rgb(255, 255, 255) 100%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        color: white;
        font-family: Arial, sans-serif;
    `;
    
    // Spinner como imagem
    const spinner = document.createElement('img');
    spinner.src = 'assets/textures/feedbacks/load-icon.png';
    spinner.style.cssText = `
        width: 80px;
        height: 80px;
        margin-bottom: 20px;
        animation: spin 1s linear infinite;
    `;
    
    // Fallback se a imagem não carregar
    spinner.onerror = () => {
        spinner.style.display = 'none';
    };
    
    // Imagem de loading
    const loadingImage = document.createElement('img');
    loadingImage.src = 'assets/textures/feedbacks/load.png';
    loadingImage.style.cssText = `
        width: 200px;
        height: auto;
        margin-bottom: 10px;
    `;
    
    // Fallback se a imagem não carregar
    loadingImage.onerror = () => {
        loadingImage.style.display = 'none';
    };
    
    // Progress como texto - REMOVIDO
    // const progress = document.createElement('div');
    // progress.id = 'loading-progress';
    // progress.textContent = 'Carregando...';
    // progress.style.cssText = `
    //     color: #333;
    //     font-size: 16px;
    //     font-weight: bold;
    //     margin-top: 10px;
    //     text-align: center;
    // `;
    
    overlay.appendChild(spinner);
    //overlay.appendChild(loadingImage);
    // overlay.appendChild(progress); // REMOVIDO
    document.body.appendChild(overlay);
    
    // Adicionar CSS para animação
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Função para atualizar progresso do carregamento
function updateLoadingProgress(message) {
    // Removido para deixar apenas a animação rodando
    // const progress = document.getElementById('loading-progress');
    // if (progress) {
    //     progress.textContent = message;
    // }
}

// Função para esconder overlay de carregamento
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 500);
    }
}

// Função para inicializar a aplicação
async function initializeApp() {
    try {
        updateLoadingProgress('Verificando A-Frame...');
        
        // Aguardar A-Frame estar pronto
        await waitForAFrame();
        
        updateLoadingProgress('Aguardando cena carregar...');
        await waitForScene();
        
        updateLoadingProgress('Inicializando câmera...');
        await initWebcam();
        
        updateLoadingProgress('Integrando sistemas...');
        setTimeout(() => {
            if (window.screenManager) {
                integrateWithScreenManager();
            } else {
                console.log('⚠️ Aguardando ScreenManager...');
                setTimeout(() => {
                    if (window.screenManager) {
                        integrateWithScreenManager();
                    } else {
                        console.error('❌ ScreenManager não encontrado após timeout');
                    }
                }, 1000);
            }
        }, 500);
        
        updateLoadingProgress('Finalizando...');
        setTimeout(() => {
            hideLoadingOverlay();
        }, 1000);
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        updateLoadingProgress('Erro na inicialização. Recarregando...');
        setTimeout(() => {
            location.reload();
        }, 3000);
    }
}

// Função para aguardar A-Frame estar pronto
function waitForAFrame() {
    return new Promise((resolve) => {
        if (window.AFRAME) {
            resolve();
        } else {
            const checkAFrame = () => {
                if (window.AFRAME) {
                    resolve();
                } else {
                    setTimeout(checkAFrame, 100);
                }
            };
            checkAFrame();
        }
    });
}

// Função para aguardar cena A-Frame estar pronta
function waitForScene() {
    return new Promise((resolve) => {
        const scene = document.querySelector('a-scene');
        if (scene && scene.hasLoaded) {
            resolve();
        } else {
            const checkScene = () => {
                const scene = document.querySelector('a-scene');
                if (scene && scene.hasLoaded) {
                    resolve();
                } else {
                    setTimeout(checkScene, 100);
                }
            };
            checkScene();
        }
    });
}

// Função para prevenir zoom de pinça
function preventPinchZoom() {
    let lastTouchEnd = 0;
    
    document.addEventListener('touchstart', function (event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false });
    
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
    
    document.addEventListener('gesturestart', function (event) {
        event.preventDefault();
    }, { passive: false });
    
    document.addEventListener('gesturechange', function (event) {
        event.preventDefault();
    }, { passive: false });
    
    document.addEventListener('gestureend', function (event) {
        event.preventDefault();
    }, { passive: false });
    
    document.addEventListener('wheel', function (event) {
        if (event.ctrlKey) {
            event.preventDefault();
        }
    }, { passive: false });
    
    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey && (event.key === '+' || event.key === '-' || event.key === '=')) {
            event.preventDefault();
        }
    }, { passive: false });
    
    // Recarregar viewportUnitsBuggyfill quando a orientação mudar
    window.addEventListener('orientationchange', function() {
        setTimeout(function() {
            viewportUnitsBuggyfill.refresh();
        }, 500);
    });
    
    window.addEventListener('resize', function() {
        viewportUnitsBuggyfill.refresh();
    });
}

// Variáveis globais simplificadas
let isARMode = true;
let currentStream = null;

// Componente billboard para orientar objetos sempre para a câmera
AFRAME.registerComponent('billboard', {
    init: function() {
        this.camera = document.querySelector('[camera]');
    },
    tick: function() {
        if (this.camera) {
            const cameraPosition = this.camera.getAttribute('position');
            this.el.object3D.lookAt(cameraPosition);
        }
    }
});

// Inicializar webcam
async function initWebcam() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Navegador não suporta acesso à câmera');
        }
        
        const video = document.getElementById('webcam');
        
        if (!video) {
            throw new Error('Elemento de vídeo não encontrado!');
        }
        
        updateLoadingProgress('Solicitando permissão da câmera...');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        video.srcObject = stream;
        currentStream = stream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = function() {
                console.log('📷 Webcam inicializada com sucesso!');
                resolve();
            };
        });
        
    } catch (error) {
        console.error('Erro ao acessar webcam:', error);
        
        try {
            updateLoadingProgress('Tentando câmera frontal...');
            const video = document.getElementById('webcam');
            if (video) {
                const frontStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'user'
                    } 
                });
                video.srcObject = frontStream;
                currentStream = frontStream;
                
                return new Promise((resolve) => {
                    video.onloadedmetadata = function() {
                        console.log('📷 Câmera frontal inicializada!');
                        resolve();
                    };
                });
            }
        } catch (frontError) {
            console.error('Erro com câmera frontal também:', frontError);
            
            const scene = document.querySelector('a-scene');
            if (scene) {
                scene.setAttribute('background', 'color: #001133');
            }
            
            // Continuar mesmo sem câmera
            resolve();
        }
    }
}

// Função para alternar entre modo AR e HDRI
function toggleMode() {
    const video = document.getElementById('webcam');
    const sky = document.querySelector('a-sky');
    const scene = document.querySelector('a-scene');
    const button = document.getElementById('toggleMode');
    
    if (isARMode) {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
        if (video) {
            video.srcObject = null;
            video.style.display = 'none';
        }
        
        if (sky) {
            sky.setAttribute('visible', 'true');
        }
        if (scene) {
            scene.setAttribute('background', '');
        }
        
        button.textContent = 'Modo AR';
        isARMode = false;
        
    } else {
        if (sky) {
            sky.setAttribute('visible', 'false');
        }
        if (scene) {
            scene.setAttribute('background', 'transparent: true');
        }
        
        if (video) {
            video.style.display = 'block';
        }
        initWebcam();
        
        button.textContent = 'Modo HDRI';
        isARMode = true;
    }
}

// Função para integrar com o sistema de gerenciamento de telas
function integrateWithScreenManager() {
    try {
        // Integração com o sistema modular de telas
        if (window.screenManager) {
            console.log('🔗 Integrando com ScreenManager');
        } else {
            console.log('⚠️ ScreenManager não disponível ainda');
        }
    } catch (error) {
        console.error('❌ Erro na integração com ScreenManager:', error);
    }
}

// Função para ativar o efeito de flash
function triggerCameraFlash() {
    const flashElement = document.getElementById('camera-flash');
    if (flashElement) {
        flashElement.classList.add('active');
        
        setTimeout(() => {
            flashElement.classList.remove('active');
        }, 300);
        
        playCameraSound();
        vibrateDevice();
    }
}

// Função para tocar som de câmera
function playCameraSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        // Som não disponível
    }
}

// Função para vibrar dispositivo
function vibrateDevice() {
    if (navigator.vibrate) {
        navigator.vibrate(100);
    }
}

// Exportar funções globais para uso pelos módulos
window.triggerCameraFlash = triggerCameraFlash;
window.playCameraSound = playCameraSound;
window.vibrateDevice = vibrateDevice;
window.initWebcam = initWebcam;
window.toggleMode = toggleMode; 