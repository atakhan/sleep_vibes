// Управление фоновым звуком (эмбиентом)
class AmbientPlayer {
    // Константы для процедурного звука
    static BUFFER_SIZE = 4096;
    static PROGRESS_UPDATE_INTERVAL = 100; // Обновляем прогресс каждые N сэмплов
    static AMBIENT_VOLUME_FACTOR = 0.3;
    static PROGRESS_FADE_FACTOR = 0.5;
    static FADE_IN_DURATION = 1.0; // секунды
    static VOLUME_RAMP_TIME = 0.1; // секунды
    
    // Константы для расчета громкости URL ambient
    static URL_VOLUME_MIN = 0.1;
    static URL_VOLUME_MAX = 0.2;
    static URL_VOLUME_MULTIPLIER = 0.5;
    
    // Fallback звук (белый шум)
    static FALLBACK_SOUND_ID = 1;

    constructor(audioManager) {
        this.audioManager = audioManager;
        this.scriptProcessor = null;
        this.ambientGainNode = null;
        this.urlAmbientGainNode = null;
        this.currentSourceNode = null;
        this.audioBuffer = null;
        this.audioElement = null;
        this._session = null;
    }

    start(soundId, temperature) {
        const sound = SoundSources.getSound(soundId);
        
        if (!sound) {
            console.error('Звук не найден:', soundId);
            return;
        }

        if (sound.type === 'procedural') {
            this.playProcedural(soundId, temperature);
        } else if (sound.type === 'url') {
            this.playUrl(sound.url, temperature);
        }
    }

    playProcedural(soundId, temperature) {
        try {
            const context = this.audioManager.getContext();
            if (!context) {
                this.audioManager.init();
                return;
            }
            
            const audioData = SoundGenerator.generate(soundId, temperature);
            
            if (!audioData) {
                console.error('Не удалось сгенерировать звук');
                return;
            }

            const bufferSize = AmbientPlayer.BUFFER_SIZE;
            this.scriptProcessor = context.createScriptProcessor(bufferSize, 0, 1);
            this.ambientGainNode = context.createGain();

            let bufferIndex = 0;
            
            this.scriptProcessor.onaudioprocess = (e) => {
                const output = e.outputBuffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    let sample = this._generateSample(audioData.type, bufferIndex, output);
                    
                    // Обновляем прогресс периодически
                    if (i % AmbientPlayer.PROGRESS_UPDATE_INTERVAL === 0 && this._session) {
                        this._session.updateProgress();
                    }
                    const currentProgress = this._session ? this._session.progress : 0;
                    const ambientVolume = audioData.volume * AmbientPlayer.AMBIENT_VOLUME_FACTOR * 
                        (1 - currentProgress * AmbientPlayer.PROGRESS_FADE_FACTOR);
                    output[i] = sample * ambientVolume;
                    bufferIndex = (bufferIndex + 1) % bufferSize;
                }
            };

            this.ambientGainNode.gain.value = 0;
            this.ambientGainNode.gain.setValueAtTime(0, context.currentTime);
            this.ambientGainNode.gain.linearRampToValueAtTime(
                audioData.volume * 0.5, 
                context.currentTime + AmbientPlayer.FADE_IN_DURATION
            );

            this.scriptProcessor.connect(this.ambientGainNode);
            this.ambientGainNode.connect(context.destination);
        } catch (error) {
            console.error('Ошибка воспроизведения процедурного эмбиента:', error);
        }
    }

    setSession(session) {
        this._session = session;
    }

    _generateSample(type, bufferIndex, output) {
        switch (type) {
            case 'whiteNoise':
                return Math.random() * 2 - 1;
            case 'pinkNoise':
                const white = Math.random() * 2 - 1;
                return white * 0.5 + (Math.random() * 2 - 1) * 0.3;
            case 'brownNoise':
                const white2 = Math.random() * 2 - 1;
                const lastSample = bufferIndex > 0 ? output[bufferIndex - 1] : 0;
                return lastSample * 0.98 + white2 * 0.02;
            default:
                return Math.random() * 2 - 1;
        }
    }

    playUrl(url, temperature) {
        try {
            const context = this.audioManager.getContext();
            if (!context) {
                this.audioManager.init();
                return;
            }
            
            const volume = (AmbientPlayer.URL_VOLUME_MIN + 
                (temperature / 100) * (AmbientPlayer.URL_VOLUME_MAX - AmbientPlayer.URL_VOLUME_MIN)) * 
                AmbientPlayer.URL_VOLUME_MULTIPLIER;
            
            // Если буфер уже загружен, сразу начинаем воспроизведение
            if (this.audioBuffer) {
                this.startSeamlessLoop(this.audioBuffer, volume);
                return;
            }
            
            // Загружаем аудиофайл в буфер
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => context.decodeAudioData(arrayBuffer))
                .then(buffer => {
                    this.audioBuffer = buffer;
                    console.log('Аудиофайл успешно загружен:', url);
                    this.startSeamlessLoop(buffer, volume);
                })
                .catch(error => {
                    console.error('Ошибка загрузки аудиофайла:', url, error);
                    console.warn('Переключение на процедурный белый шум из-за ошибки загрузки файла');
                    this.playProcedural(AmbientPlayer.FALLBACK_SOUND_ID, temperature);
                });
        } catch (error) {
            console.error('Ошибка загрузки эмбиента:', error);
            this.playProcedural(AmbientPlayer.FALLBACK_SOUND_ID, temperature);
        }
    }
    
    startSeamlessLoop(buffer, volume) {
        const context = this.audioManager.getContext();
        if (!context || !buffer) return;
        
        // Создаем gain node для управления громкостью
        if (!this.urlAmbientGainNode) {
            this.urlAmbientGainNode = context.createGain();
            this.urlAmbientGainNode.connect(context.destination);
        }
        
        // Функция для запуска нового экземпляра буфера
        const playBuffer = () => {
            const source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(this.urlAmbientGainNode);
            
            source.onended = () => {
                playBuffer();
            };
            
            source.start(0);
            this.currentSourceNode = source;
        };
        
        // Устанавливаем начальную громкость на 0
        this.urlAmbientGainNode.gain.setValueAtTime(0, context.currentTime);
        
        // Запускаем первый экземпляр
        playBuffer();
        
        // Плавное увеличение громкости (fade-in)
        this.urlAmbientGainNode.gain.linearRampToValueAtTime(
            volume,
            context.currentTime + AmbientPlayer.FADE_IN_DURATION
        );
    }
    
    updateVolume(session) {
        if (!this.urlAmbientGainNode || !session) return;
        
        session.updateProgress();
        const progress = session.progress;
        
        // Базовая громкость
        const baseVolume = (AmbientPlayer.URL_VOLUME_MIN + 
            (session.temperature / 100) * (AmbientPlayer.URL_VOLUME_MAX - AmbientPlayer.URL_VOLUME_MIN)) * 
            AmbientPlayer.URL_VOLUME_MULTIPLIER;
        
        // Уменьшаем громкость по мере прогресса
        const currentVolume = baseVolume * AmbientPlayer.AMBIENT_VOLUME_FACTOR * 
            (1 - progress * AmbientPlayer.PROGRESS_FADE_FACTOR);
        
        // Плавно изменяем громкость
        const context = this.audioManager.getContext();
        if (context) {
            this.urlAmbientGainNode.gain.linearRampToValueAtTime(
                currentVolume,
                context.currentTime + AmbientPlayer.VOLUME_RAMP_TIME
            );
        }
    }

    stop() {
        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
            this.scriptProcessor = null;
        }
        
        if (this.ambientGainNode) {
            this.ambientGainNode.disconnect();
            this.ambientGainNode = null;
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
        
        if (this.urlAmbientGainNode) {
            this.urlAmbientGainNode.disconnect();
            this.urlAmbientGainNode = null;
        }

        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.audioElement = null;
        }
        
        this.audioBuffer = null;
    }
}

