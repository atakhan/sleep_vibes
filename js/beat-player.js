// Управление ритмичными ударами
class BeatPlayer {
    // Константы для расчета громкости
    static BASE_BEAT_VOLUME = 0.3;
    static PROGRESS_FADE_FACTOR = 0.7;
    static TEMP_MIN_FACTOR = 0.05;
    static TEMP_MAX_FACTOR = 1.0;
    
    // Константы для фильтрации
    static LOWPASS_MIN_FREQ = 500;
    static LOWPASS_MAX_FREQ = 20000;
    static LOWPASS_Q = 1.0;
    
    // Константы для fade эффектов
    static FADE_IN_TIME = 0.01; // 10мс
    static FADE_OUT_TIME = 0.05; // 50мс
    
    // Константы для oscillator fallback
    static OSCILLATOR_DURATION = 0.1;
    static OSCILLATOR_FADE_IN = 0.01;
    static PROCEDURAL_BASE_FREQ = 150;
    static PROCEDURAL_FREQ_MULT = 2;
    static DEFAULT_FREQ = 300;
    
    // Пути к файлам звуков пульса
    static BEAT_SOUND_PATHS = {
        1: 'sounds/timpano.wav',  // Пульсирующий шар
        2: 'sounds/swing.wav',    // Частицы
        3: 'sounds/timpano.wav'   // По умолчанию
    };

    constructor(audioManager) {
        this.audioManager = audioManager;
        this.beatBuffers = {}; // Кэш буферов для разных анимаций
        this.beatIntervalId = null;
        this.currentSourceNode = null;
        this.currentGainNode = null;
        this.currentAnimationType = 1;
    }

    async loadBeatSound(animationType = 1) {
        this.currentAnimationType = animationType;
        
        // Если буфер для этой анимации уже загружен, возвращаем его
        if (this.beatBuffers[animationType]) {
            return Promise.resolve();
        }

        const context = this.audioManager.getContext();
        if (!context) {
            return Promise.reject(new Error('Audio context not initialized'));
        }

        const soundPath = BeatPlayer.BEAT_SOUND_PATHS[animationType] || BeatPlayer.BEAT_SOUND_PATHS[1];

        return fetch(soundPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.arrayBuffer();
            })
            .then(arrayBuffer => context.decodeAudioData(arrayBuffer))
            .then(buffer => {
                this.beatBuffers[animationType] = buffer;
                console.log(`Звук пульса для анимации ${animationType} (${soundPath}) успешно загружен`);
            })
            .catch(error => {
                console.error('Ошибка загрузки звука пульса:', error);
                this.beatBuffers[animationType] = null;
            });
    }

    playBeat(session) {
        const context = this.audioManager.getContext();
        if (!context || !session) return;

        try {
            session.updateProgress();
            const now = context.currentTime;
            
            // Базовая громкость с учетом прогресса сессии
            const baseBeatVolume = BeatPlayer.BASE_BEAT_VOLUME * 
                (1 - session.progress * BeatPlayer.PROGRESS_FADE_FACTOR);
            
            // Приглушенность в зависимости от температуры
            const temperature = session.temperature;
            const temperatureFactor = BeatPlayer.TEMP_MIN_FACTOR + 
                (temperature / 100) * (BeatPlayer.TEMP_MAX_FACTOR - BeatPlayer.TEMP_MIN_FACTOR);
            const beatVolume = baseBeatVolume * temperatureFactor;
            
            const beatBuffer = this.beatBuffers[this.currentAnimationType];
            if (beatBuffer) {
                this._playBeatFromBuffer(context, now, beatVolume, temperature, beatBuffer);
            } else {
                this._playBeatFromOscillator(context, now, beatVolume, session);
            }
        } catch (error) {
            console.error('Ошибка воспроизведения удара:', error);
        }
    }

    _playBeatFromBuffer(context, now, volume, temperature, beatBuffer) {
        const source = context.createBufferSource();
        const gainNode = context.createGain();
        
        source.buffer = beatBuffer;
        
        // Low-pass фильтр для приглушения при низкой температуре
        const lowPassFilter = context.createBiquadFilter();
        lowPassFilter.type = 'lowpass';
        const cutoffFreq = BeatPlayer.LOWPASS_MIN_FREQ + 
            (temperature / 100) * (BeatPlayer.LOWPASS_MAX_FREQ - BeatPlayer.LOWPASS_MIN_FREQ);
        lowPassFilter.frequency.value = cutoffFreq;
        lowPassFilter.Q.value = BeatPlayer.LOWPASS_Q;
        
        source.connect(lowPassFilter);
        lowPassFilter.connect(gainNode);
        gainNode.connect(context.destination);
        
        // Плавное нарастание и затухание удара
        const fadeInTime = BeatPlayer.FADE_IN_TIME;
        const fadeOutTime = BeatPlayer.FADE_OUT_TIME;
        const duration = beatBuffer.duration;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + fadeInTime);
        gainNode.gain.linearRampToValueAtTime(volume, now + duration - fadeOutTime);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);
        
        source.start(now);
        source.stop(now + duration);
        
        this.currentSourceNode = source;
        this.currentGainNode = gainNode;
    }

    _playBeatFromOscillator(context, now, volume, session) {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        const sound = SoundSources.getSound(session.soundId);
        const frequency = sound && sound.type === 'procedural' 
            ? BeatPlayer.PROCEDURAL_BASE_FREQ + (session.temperature * BeatPlayer.PROCEDURAL_FREQ_MULT)
            : BeatPlayer.DEFAULT_FREQ;
        const duration = BeatPlayer.OSCILLATOR_DURATION;
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(volume, now + BeatPlayer.OSCILLATOR_FADE_IN);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.start(now);
        oscillator.stop(now + duration);
        
        this.currentSourceNode = oscillator;
        this.currentGainNode = gainNode;
    }

    scheduleNextBeat(session, onBeat) {
        if (!session) return;
        
        session.updateProgress();
        const interval = session.getCurrentBeatInterval();
        
        this.beatIntervalId = setTimeout(() => {
            if (onBeat) onBeat();
            this.scheduleNextBeat(session, onBeat);
        }, interval);
    }

    start(session, onBeat) {
        if (onBeat) onBeat();
        this.scheduleNextBeat(session, onBeat);
    }

    stop() {
        if (this.beatIntervalId) {
            clearTimeout(this.beatIntervalId);
            this.beatIntervalId = null;
        }
        
        if (this.currentSourceNode) {
            try {
                this.currentSourceNode.stop();
                this.currentSourceNode.disconnect();
            } catch (e) {
                // Игнорируем ошибки при остановке уже остановленного узла
            }
            this.currentSourceNode = null;
        }
        
        if (this.currentGainNode) {
            this.currentGainNode.disconnect();
            this.currentGainNode = null;
        }
    }
}

