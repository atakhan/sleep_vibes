// Управление аудио контекстом
class AudioManager {
    constructor() {
        this.audioContext = null;
    }

    init() {
        if (this.audioContext) {
            return this.audioContext;
        }
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            return this.audioContext;
        } catch (error) {
            console.error('Ошибка создания аудио контекста:', error);
            return null;
        }
    }

    getContext() {
        if (!this.audioContext) {
            this.init();
        }
        return this.audioContext;
    }

    close() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    isInitialized() {
        return this.audioContext !== null;
    }
}

