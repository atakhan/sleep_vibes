// Управление экранами
class SessionScreen {
    static session = null;
    static animationId = null;
    static audioContext = null;
    static gainNode = null;
    static audioElement = null;
    static scriptProcessor = null;
    static ambientGainNode = null;
    static beatOscillator = null;
    static beatGainNode = null;
    static animationElement = null;
    static beatIntervalId = null;
    static updateIntervalId = null;

    static start(temperature, soundId, animationType, tryCount = 0) {
        // Создаем новую сессию
        this.session = new Session(temperature, soundId, animationType, tryCount);
        
        const container = document.getElementById('animation-container');
        container.innerHTML = '';
        
        // Скрываем кнопку "Все еще не сплю" в начале сессии
        const stillAwakeBtn = document.getElementById('session-to-still-awake-btn');
        if (stillAwakeBtn) {
            stillAwakeBtn.style.display = 'none';
        }
        
        // Генерируем анимацию
        const animation = AnimationGenerator.generate(animationType, temperature);
        this.animationElement = animation.element;
        container.appendChild(this.animationElement);
        
        // Инициализируем аудио контекст
        this.initAudioContext();
        
        // Запускаем фоновый эмбиент (тихий, непрерывный)
        this.startAmbientSound(temperature);
        
        // Запускаем ритмичный звук и анимацию (основной ритм)
        this.startRhythmicSession();
        
        // Обновляем информацию о сессии сразу и затем каждую секунду
        // Используем requestAnimationFrame для гарантии, что DOM готов
        requestAnimationFrame(() => {
            this.updateSessionInfo();
        });
        
        this.updateIntervalId = setInterval(() => {
            if (!this.session) return;
            this.session.updateProgress();
            this.updateSessionInfo();
            
            // Автоматически завершаем сессию, если время истекло
            if (this.session.isFinished()) {
                this.handleSessionEnd();
            }
        }, 1000);
    }

    static stop() {
        // Останавливаем все интервалы
        if (this.updateIntervalId) {
            clearInterval(this.updateIntervalId);
            this.updateIntervalId = null;
        }
        
        if (this.beatIntervalId) {
            clearTimeout(this.beatIntervalId);
            this.beatIntervalId = null;
        }
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Останавливаем ритмичный звук
        if (this.beatOscillator) {
            this.beatOscillator.stop();
            this.beatOscillator = null;
        }
        
        if (this.beatGainNode) {
            this.beatGainNode.disconnect();
            this.beatGainNode = null;
        }
        
        // Останавливаем процедурный звук
        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
            this.scriptProcessor = null;
        }
        
        if (this.ambientGainNode) {
            this.ambientGainNode.disconnect();
            this.ambientGainNode = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        // Останавливаем аудио элемент
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.audioElement = null;
        }
        
        // Завершаем сессию
        if (this.session) {
            this.session.end();
        }
    }

    static initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.error('Ошибка создания аудио контекста:', error);
        }
    }

    static startRhythmicSession() {
        if (!this.audioContext) {
            this.initAudioContext();
        }
        
        // Запускаем первый удар с синхронизированной анимацией
        this.playBeat();
        this.triggerAnimation();
        
        // Запускаем цикл ударов
        this.scheduleNextBeat();
    }

    static scheduleNextBeat() {
        if (!this.session) return;
        
        // Обновляем прогресс перед расчетом интервала для учета угасания ритма
        this.session.updateProgress();
        const interval = this.session.getCurrentBeatInterval();
        
        this.beatIntervalId = setTimeout(() => {
            this.playBeat();
            this.triggerAnimation();
            this.scheduleNextBeat();
        }, interval);
    }

    static playBeat() {
        if (!this.audioContext || !this.session) return;
        
        try {
            // Создаем короткий звук для удара
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Настройки удара в зависимости от типа звука
            const sound = SoundSources.getSound(this.session.soundId);
            let frequency = 200;
            let duration = 0.1; // Длительность удара
            
            if (sound && sound.type === 'procedural') {
                // Для процедурных звуков используем низкую частоту
                frequency = 150 + (this.session.temperature * 2);
            } else {
                // Для URL звуков используем более высокую частоту
                frequency = 300;
            }
            
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            
            // Плавное нарастание и затухание удара
            // Громкость удара также угасает по мере прогресса сессии
            this.session.updateProgress();
            const now = this.audioContext.currentTime;
            const beatVolume = 0.3 * (1 - this.session.progress * 0.7);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(beatVolume, now + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, now + duration);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start(now);
            oscillator.stop(now + duration);
            
            this.beatOscillator = oscillator;
            this.beatGainNode = gainNode;
        } catch (error) {
            console.error('Ошибка воспроизведения удара:', error);
        }
    }

    static triggerAnimation() {
        if (!this.animationElement) return;
        
        // Добавляем класс для анимации удара
        this.animationElement.classList.add('beat-pulse');
        setTimeout(() => {
            if (this.animationElement) {
                this.animationElement.classList.remove('beat-pulse');
            }
        }, 200);
    }

    static startAmbientSound(temperature) {
        const sound = SoundSources.getSound(this.session.soundId);
        
        if (!sound) {
            console.error('Звук не найден:', this.session.soundId);
            return;
        }

        if (sound.type === 'procedural') {
            this.playProceduralAmbient(this.session.soundId, temperature);
        } else if (sound.type === 'url') {
            this.playUrlAmbient(sound.url, temperature);
        }
    }

    static playProceduralAmbient(soundId, temperature) {
        try {
            if (!this.audioContext) {
                this.initAudioContext();
            }
            
            const audioData = SoundGenerator.generate(soundId, temperature);
            
            if (!audioData) {
                console.error('Не удалось сгенерировать звук');
                return;
            }

            const bufferSize = 4096;
            this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 0, 1);
            this.ambientGainNode = this.audioContext.createGain();

            let bufferIndex = 0;
            this.scriptProcessor.onaudioprocess = (e) => {
                const output = e.outputBuffer.getChannelData(0);
                
                for (let i = 0; i < bufferSize; i++) {
                    let sample;
                    switch (audioData.type) {
                        case 'whiteNoise':
                            sample = Math.random() * 2 - 1;
                            break;
                        case 'pinkNoise':
                            const white = Math.random() * 2 - 1;
                            sample = white * 0.5 + (Math.random() * 2 - 1) * 0.3;
                            break;
                        case 'brownNoise':
                            const white2 = Math.random() * 2 - 1;
                            const lastSample = bufferIndex > 0 ? output[bufferIndex - 1] : 0;
                            sample = lastSample * 0.98 + white2 * 0.02;
                            break;
                        default:
                            sample = Math.random() * 2 - 1;
                    }
                    
                    // Уменьшаем громкость эмбиента по мере прогресса сессии
                    // Эмбиент должен быть тихим фоновым звуком
                    // Обновляем прогресс периодически (не каждый сэмпл для производительности)
                    if (i % 100 === 0 && this.session) {
                        this.session.updateProgress();
                    }
                    const currentProgress = this.session ? this.session.progress : 0;
                    const ambientVolume = audioData.volume * 0.3 * (1 - currentProgress * 0.5);
                    output[i] = sample * ambientVolume;
                    bufferIndex = (bufferIndex + 1) % bufferSize;
                }
            };

            this.ambientGainNode.gain.value = 0;
            this.ambientGainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            this.ambientGainNode.gain.linearRampToValueAtTime(audioData.volume * 0.5, this.audioContext.currentTime + 1);

            this.scriptProcessor.connect(this.ambientGainNode);
            this.ambientGainNode.connect(this.audioContext.destination);
        } catch (error) {
            console.error('Ошибка воспроизведения процедурного эмбиента:', error);
        }
    }

    static playUrlAmbient(url, temperature) {
        try {
            const volume = (0.1 + (temperature / 100) * 0.2) * 0.5; // Эмбиент тише
            
            this.audioElement = document.getElementById('audio-player');
            if (!this.audioElement) {
                this.audioElement = new Audio();
                this.audioElement.loop = true;
            }

            this.audioElement.src = url;
            this.audioElement.volume = volume;
            
            this.audioElement.volume = 0;
            this.audioElement.play().then(() => {
                const fadeIn = setInterval(() => {
                    if (this.audioElement.volume < volume) {
                        this.audioElement.volume = Math.min(this.audioElement.volume + 0.01, volume);
                    } else {
                        clearInterval(fadeIn);
                    }
                }, 50);
            }).catch(error => {
                console.error('Ошибка воспроизведения URL эмбиента:', error);
            });
        } catch (error) {
            console.error('Ошибка загрузки эмбиента:', error);
        }
    }

    static updateSessionInfo() {
        if (!this.session) {
            console.warn('SessionScreen.updateSessionInfo: сессия не создана');
            return;
        }
        
        // Проверяем, что экран активен
        const sessionScreen = document.getElementById('session-screen');
        if (!sessionScreen || !sessionScreen.classList.contains('active')) {
            console.warn('SessionScreen.updateSessionInfo: экран сессии не активен');
            return;
        }
        
        const tempEl = document.getElementById('session-temperature');
        const soundEl = document.getElementById('session-sound');
        const animEl = document.getElementById('session-animation');
        const tryEl = document.getElementById('session-try-count');
        const timeEl = document.getElementById('session-time');
        const bpmEl = document.getElementById('session-bpm');
        
        if (!tempEl || !soundEl || !animEl || !tryEl || !timeEl || !bpmEl) {
            console.warn('SessionScreen.updateSessionInfo: элементы session-info не найдены в DOM', {
                tempEl: !!tempEl,
                soundEl: !!soundEl,
                animEl: !!animEl,
                tryEl: !!tryEl,
                timeEl: !!timeEl,
                bpmEl: !!bpmEl
            });
            return;
        }
        
        this.session.updateProgress();
        
        try {
            tempEl.textContent = this.session.temperature;
            soundEl.textContent = SoundSources.getSoundName(this.session.soundId);
            animEl.textContent = `Анимация ${this.session.animationType}`;
            tryEl.textContent = this.session.tryCount;
            
            const remaining = this.session.getRemainingTime();
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            timeEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            const currentBPM = Math.round(this.session.getCurrentBPM());
            bpmEl.textContent = `${currentBPM} BPM`;
        } catch (error) {
            console.error('SessionScreen.updateSessionInfo: ошибка обновления данных', error);
        }
    }

    static handleSessionEnd() {
        // Сессия завершена автоматически
        // Останавливаем звуки и анимацию
        this.stop();
        
        // Завершаем сессию
        if (this.session) {
            this.session.end(false); // false = не нажал "все еще не сплю"
        }
        
        // Переходим на страницу Still Awake
        if (window.app) {
            window.app.showScreen('still-awake-screen');
            window.app.startStillAwakeTimer();
        }
        
        console.log('Сессия завершена автоматически');
    }
}
