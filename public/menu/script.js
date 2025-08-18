document.addEventListener('DOMContentLoaded', function() {
    // Adicionar efeitos de clique nos links do menu
    const menuLinks = document.querySelectorAll('.menu-link');
    
    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Adicionar classe de loading
            this.classList.add('loading');
            
            // Criar efeito de ripple
            createRippleEffect(e, this);
            
            // Simular delay para mostrar o efeito de loading
            setTimeout(() => {
                // Remover classe de loading antes de navegar
                this.classList.remove('loading');
            }, 500);
        });
        
        // Adicionar efeito de hover com som
        link.addEventListener('mouseenter', function() {
            playHoverSound();
        });
    });
    
    // Função para criar efeito de ripple
    function createRippleEffect(event, element) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }
    
    // Função para tocar som de hover (opcional)
    function playHoverSound() {
        // Criar um beep simples usando Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            // Silenciar erros de áudio
        }
    }
    
    // Adicionar animação de entrada para o container
    const container = document.querySelector('.container');
    container.style.opacity = '0';
    container.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
        container.style.transition = 'all 0.6s ease';
        container.style.opacity = '1';
        container.style.transform = 'scale(1)';
    }, 100);
    
    // Adicionar efeito de parallax no background
    document.addEventListener('mousemove', function(e) {
        const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
        const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
        
        document.body.style.backgroundPosition = `${moveX}px ${moveY}px`;
    });
    
    // Adicionar suporte para gestos de toque
    let touchStartY = 0;
    let touchEndY = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartY = e.changedTouches[0].screenY;
    });
    
    document.addEventListener('touchend', function(e) {
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartY - touchEndY;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe para cima - adicionar efeito visual
                addSwipeEffect('up');
            } else {
                // Swipe para baixo - adicionar efeito visual
                addSwipeEffect('down');
            }
        }
    }
    
    function addSwipeEffect(direction) {
        const menuItems = document.querySelectorAll('.menu-item');
        
        menuItems.forEach((item, index) => {
            setTimeout(() => {
                item.style.transform = direction === 'up' ? 'translateY(-10px)' : 'translateY(10px)';
                item.style.transition = 'transform 0.3s ease';
                
                setTimeout(() => {
                    item.style.transform = 'translateY(0)';
                }, 300);
            }, index * 100);
        });
    }
    
    // Adicionar feedback tátil (vibração) em dispositivos móveis
    if ('vibrate' in navigator) {
        menuLinks.forEach(link => {
            link.addEventListener('click', function() {
                navigator.vibrate(50);
            });
        });
    }
    
    // Adicionar suporte para teclado
    document.addEventListener('keydown', function(e) {
        const activeElement = document.activeElement;
        
        if (e.key === 'Enter' && activeElement.classList.contains('menu-link')) {
            activeElement.click();
        }
    });
    
    // Adicionar indicador de carregamento da página
    window.addEventListener('load', function() {
        const loader = document.createElement('div');
        loader.className = 'page-loader';
        loader.innerHTML = '<div class="loader-spinner"></div>';
        document.body.appendChild(loader);
        
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.remove();
            }, 300);
        }, 500);
    });
});

// Adicionar estilos CSS dinâmicos para efeitos adicionais
const additionalStyles = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .page-loader {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        transition: opacity 0.3s ease;
    }
    
    .loader-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    .menu-link:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
    }
    
    .menu-link:active {
        transform: scale(0.98);
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
