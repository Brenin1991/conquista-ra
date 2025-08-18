/**
 * SoundManager - Sistema de gerenciamento de áudio
 * Carrega sons do JSON e permite tocar facilmente
 */
class SoundManager {
    constructor() {
        this.sounds = new Map();
        this.audioContext = null;
        this.isInitialized = false;
        this.volume = 0.7; // Volume padrão
        this.isMuted = false;
        this.currentSource = null;
        this.currentPlayingSound = null;
    }

    /**
     * Inicializa o SoundManager
     */
    async initialize() {
        try {
            // Carrega o arquivo JSON de sons
            const response = await fetch('assets/data/sonds.json');
            const soundData = await response.json();
            
            // Prepara o contexto de áudio
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Carrega todos os sons
            await this.loadSounds(soundData.sounds);
            
            this.isInitialized = true;
            console.log('SoundManager inicializado com sucesso');
            
        } catch (error) {
            console.error('Erro ao inicializar SoundManager:', error);
        }
    }

    /**
     * Carrega todos os sons do JSON
     */
    async loadSounds(soundsArray) {
        const loadPromises = soundsArray.map(async (soundInfo) => {
            try {
                const audioBuffer = await this.loadAudioFile(soundInfo.sound);
                this.sounds.set(soundInfo.id, {
                    buffer: audioBuffer,
                    path: soundInfo.sound
                });
                console.log(`Som carregado: ${soundInfo.id}`);
            } catch (error) {
                console.warn(`Aviso: Não foi possível carregar o som ${soundInfo.id} (${soundInfo.sound})`);
                // Não falha completamente se um som não carregar
            }
        });

        await Promise.allSettled(loadPromises);
    }

    /**
     * Carrega um arquivo de áudio
     */
    async loadAudioFile(url) {
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            return await this.audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            throw new Error(`Falha ao carregar ${url}: ${error.message}`);
        }
    }

    /**
     * Toca um som pelo ID
     */
    async playSound(soundId) {
        console.log(`🔊 Iniciando playSound para: ${soundId}`);
        
        if (!this.isInitialized) {
            console.warn('SoundManager não foi inicializado');
            return;
        }

        if (this.isMuted) {
            console.log('🔇 SoundManager está mutado');
            return;
        }

        const sound = this.sounds.get(soundId);
        if (!sound) {
            console.warn(`Som não encontrado: ${soundId}`);
            console.log('Sons disponíveis:', this.getAvailableSounds());
            return;
        }

        try {
            console.log(`🔊 Contexto de áudio estado: ${this.audioContext.state}`);
            
            // Garantir que o contexto de áudio está ativo
            if (this.audioContext.state === 'suspended') {
                console.log('🔊 Resumindo contexto de áudio...');
                await this.audioContext.resume();
            }

            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = sound.buffer;
            gainNode.gain.value = this.volume;
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Armazenar referência para poder parar depois
            this.currentSource = source;
            
            console.log(`🔊 Iniciando reprodução de: ${soundId}`);
            source.start(0);
            
            console.log(`✅ Som iniciado: ${soundId}`);
            
        } catch (error) {
            console.error(`❌ Erro ao tocar som ${soundId}:`, error);
        }
    }

    /**
     * Toca um som com controle de play/stop
     */
    async playSoundWithControl(soundId) {
        console.log(`🎵 Tentando tocar som: ${soundId}`);
        console.log(`🎵 Som atual tocando: ${this.currentPlayingSound}`);
        
        // Se o mesmo som já está tocando, para
        if (this.currentPlayingSound === soundId) {
            console.log(`🎵 Parando som atual: ${soundId}`);
            this.stopCurrentSound();
            return;
        }

        // Para qualquer som que esteja tocando
        this.stopCurrentSound();

        // Toca o novo som
        console.log(`🎵 Tocando novo som: ${soundId}`);
        await this.playSound(soundId);
        this.currentPlayingSound = soundId;
        console.log(`🎵 Som definido como atual: ${this.currentPlayingSound}`);
    }

    /**
     * Para o som atual
     */
    stopCurrentSound() {
        if (this.currentSource) {
            try {
                this.currentSource.stop();
                this.currentSource.disconnect();
            } catch (error) {
                // Ignora erros ao parar som
            }
            this.currentSource = null;
        }
        this.currentPlayingSound = null;
        console.log('Som parado');
    }

    /**
     * Toca som de narração (método específico para narrações)
     */
    async playNarration(soundId) {
        await this.playSound(soundId);
    }

    /**
     * Define o volume (0.0 a 1.0)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Muta/desmuta o áudio
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        console.log(`Áudio ${this.isMuted ? 'mutado' : 'desmutado'}`);
    }

    /**
     * Muta o áudio
     */
    mute() {
        this.isMuted = true;
    }

    /**
     * Desmuta o áudio
     */
    unmute() {
        this.isMuted = false;
    }

    /**
     * Retorna a lista de sons disponíveis
     */
    getAvailableSounds() {
        return Array.from(this.sounds.keys());
    }

    /**
     * Verifica se um som existe
     */
    hasSound(soundId) {
        return this.sounds.has(soundId);
    }

    /**
     * Reseta o contexto de áudio (útil para dispositivos móveis)
     */
    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /**
     * Força a ativação do áudio através de interação do usuário
     * Necessário para dispositivos móveis
     */
    async forceAudioActivation() {
        if (!this.audioContext) {
            return;
        }

        try {
            // Criar um som silencioso para ativar o contexto
            const silentBuffer = this.audioContext.createBuffer(1, 1, 22050);
            const source = this.audioContext.createBufferSource();
            source.buffer = silentBuffer;
            source.connect(this.audioContext.destination);
            source.start(0);
            source.stop(0.001);
            
            console.log('Áudio ativado com sucesso');
        } catch (error) {
            console.error('Erro ao ativar áudio:', error);
        }
    }

    /**
     * Verifica se o áudio está funcionando
     */
    isAudioWorking() {
        return this.audioContext && this.audioContext.state === 'running';
    }
}

// Instância global do SoundManager
window.SoundManager = new SoundManager();
