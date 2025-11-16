// Управление экранами
class SessionScreen {
    // Константы для обновления UI
    static UPDATE_INTERVAL = 1000; // миллисекунды
    
    // Константы для завершения сессии
    static FADE_OUT_DELAY = 1000; // миллисекунды
    static FADE_OUT_DURATION = 4000; // миллисекунды
    static TOTAL_FADE_OUT_TIME = 5000; // миллисекунды
    static BLACK_BACKGROUND = '#000';
    
    static session = null;
    static updateIntervalId = null;
    
    // Компоненты
    static audioManager = null;
    static beatPlayer = null;
    static ambientPlayer = null;
    static animationController = null;

    static start(temperature, soundId, animationType, tryCount = 0) {
        // Останавливаем предыдущую сессию, если она была (только если компоненты существуют)
        if (this.updateIntervalId || this.beatPlayer || this.ambientPlayer || this.animationController) {
            this.stop();
        }
        
        // Создаем новую сессию
        this.session = new Session(temperature, soundId, animationType, tryCount);
        
        // Устанавливаем фон на основе температуры (соответствует фону на start-sleep-screen)
        // Прогресс = 0, так как сессия только началась
        this.updateBackground(temperature, 0);
        
        // Инициализируем компоненты
        this.audioManager = new AudioManager();
        this.audioManager.init();
        
        this.beatPlayer = new BeatPlayer(this.audioManager);
        this.ambientPlayer = new AmbientPlayer(this.audioManager);
        this.animationController = new AnimationController();
        
        // Скрываем кнопку "Все еще не сплю" в начале сессии
        this._hideStillAwakeButton();
        
        // Очищаем контейнер анимации перед созданием новой
        const container = document.getElementById('animation-container');
        if (container) {
            container.innerHTML = '';
        }
        
        // Генерируем анимацию
        this.animationController.create(animationType, temperature);
        
        // Загружаем звук пульса и запускаем сессию
        this.beatPlayer.loadBeatSound(animationType).then(() => {
            // Запускаем фоновый эмбиент
            this.ambientPlayer.start(soundId, temperature);
            this.ambientPlayer.setSession(this.session);
            
            // Запускаем ритмичный звук и анимацию
            this.beatPlayer.start(this.session, () => {
                this.beatPlayer.playBeat(this.session);
                this.animationController.triggerBeat();
            });
        }).catch(() => {
            // Даже если загрузка не удалась, продолжаем с fallback
            this.ambientPlayer.start(soundId, temperature);
            this.ambientPlayer.setSession(this.session);
            
            this.beatPlayer.start(this.session, () => {
                this.beatPlayer.playBeat(this.session);
                this.animationController.triggerBeat();
            });
        });
        
        // Обновляем информацию о сессии сразу и затем каждую секунду
        requestAnimationFrame(() => {
            this.updateSessionInfo();
        });
        
        this.updateIntervalId = setInterval(() => {
            if (!this.session) return;
            
            this.session.updateProgress();
            this.updateSessionInfo();
            
            // Обновляем громкость URL ambient, если он воспроизводится
            this.ambientPlayer.updateVolume(this.session);
            
            // Автоматически завершаем сессию, если время истекло
            if (this.session.isFinished()) {
                this.handleSessionEnd();
            }
        }, SessionScreen.UPDATE_INTERVAL);
    }

    static stop() {
        // Останавливаем все интервалы
        if (this.updateIntervalId) {
            clearInterval(this.updateIntervalId);
            this.updateIntervalId = null;
        }
        
        // Останавливаем компоненты
        if (this.beatPlayer) {
            this.beatPlayer.stop();
            this.beatPlayer = null;
        }
        
        if (this.ambientPlayer) {
            this.ambientPlayer.stop();
            this.ambientPlayer = null;
        }
        
        if (this.audioManager) {
            this.audioManager.close();
            this.audioManager = null;
        }
        
        // Очищаем анимацию
        if (this.animationController) {
            // Останавливаем все активные анимации
            this.animationController.stop();
            // Очищаем контейнер анимации
            const container = document.getElementById('animation-container');
            if (container) {
                container.innerHTML = '';
            }
            this.animationController = null;
        }
        
        // Завершаем сессию
        if (this.session) {
            this.session.end();
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
        
        // Обновляем фон с учетом прогресса сессии (постепенное затемнение)
        this.updateBackground(this.session.temperature, this.session.progress);
        
        try {
            tempEl.textContent = this.session.temperature;
            soundEl.textContent = SoundSources.getSoundName(this.session.soundId);
            animEl.textContent = SessionScreen.getAnimationName(this.session.animationType);
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
        
        // Сразу останавливаем ритмичную сессию
        if (this.beatPlayer) {
            this.beatPlayer.stop();
        }
        
        // Делаем последний пульс
        if (this.beatPlayer && this.session) {
            this.beatPlayer.playBeat(this.session);
        }
        if (this.animationController) {
            this.animationController.triggerBeat();
        }
        
        // Останавливаем анимацию пульсации шара
        if (this.animationController) {
            this.animationController.stopPulsation();
        }
        
        // Запускаем специальную конечную анимацию - плавное угасание всех визуальных элементов
        if (this.animationController) {
            this.animationController.startFadeOut();
        }
        
        // Начинаем fade out экрана
        const sessionScreen = document.getElementById('session-screen');
        if (sessionScreen) {
            // Устанавливаем черный фон для плавного перехода
            document.body.style.background = SessionScreen.BLACK_BACKGROUND;
            // Задержка, чтобы элементы начали угасать первыми
            setTimeout(() => {
                sessionScreen.style.transition = `opacity ${SessionScreen.FADE_OUT_DURATION / 1000}s ease-out`;
                sessionScreen.style.opacity = '0';
            }, SessionScreen.FADE_OUT_DELAY);
        }
        
        // Останавливаем все звуки и анимацию через задержку
        // (чтобы последний пульс и fade out успели завершиться)
        setTimeout(() => {
            this.stop();
            
            // Завершаем сессию
            if (this.session) {
                this.session.end(false); // false = не нажал "все еще не сплю"
            }
            
            // Переходим на страницу Still Awake после fade out
            if (window.app) {
                window.app.showScreen('still-awake-screen');
            }
        }, SessionScreen.TOTAL_FADE_OUT_TIME);
        
        console.log('Сессия завершена автоматически');
    }

    static _hideStillAwakeButton() {
        const stillAwakeBtn = document.getElementById('session-to-still-awake-btn');
        if (stillAwakeBtn) {
            stillAwakeBtn.style.display = 'none';
        }
    }

    static getAnimationName(animationType) {
        switch (animationType) {
            case 1:
                return 'Пульсирующий шар';
            case 2:
                return 'Частицы';
            case 3:
                return `Анимация ${animationType}`;
            default:
                return `Анимация ${animationType}`;
        }
    }

    static updateBackground(temperature, progress = 0) {
        // Температура от 0 (холодные) до 100 (теплые)
        // Холодные: синие, голубые, фиолетовые (hue ~200-270)
        // Теплые: красные, оранжевые, желтые (hue ~0-60)
        // Темная тема: низкая яркость (lightness)
        // progress: 0.0 (начало) - 1.0 (конец, черный фон)
        // Использует ту же логику, что и App.updateBackground(), но с постепенным затемнением
        
        const temp = temperature / 100; // 0.0 - 1.0
        
        // Интерполяция между холодными и теплыми оттенками
        // Холодные: от синего (240) к фиолетовому (270)
        // Теплые: от красного (0/360) к оранжевому (30)
        
        let hue1, hue2;
        
        if (temp <= 0.5) {
            // От холодных к нейтральным (синий -> фиолетовый -> пурпурный)
            const coldProgress = temp * 2; // 0.0 - 1.0
            hue1 = 240 - (coldProgress * 60); // 240 -> 180 (синий -> голубой)
            hue2 = 270 - (coldProgress * 60); // 270 -> 210 (фиолетовый -> синий)
        } else {
            // От нейтральных к теплым (пурпурный -> красный -> оранжевый)
            const warmProgress = (temp - 0.5) * 2; // 0.0 - 1.0
            hue1 = 180 - (warmProgress * 180); // 180 -> 0 (голубой -> красный)
            hue2 = 210 - (warmProgress * 180); // 210 -> 30 (синий -> оранжевый)
        }
        
        // Темная тема: низкая яркость, умеренная насыщенность
        // Насыщенность: 50-70% (достаточно для различимости, но не слишком ярко)
        const baseSaturation = 50 + (temp * 20); // 50-70%
        // Яркость: 8-20% (темные цвета)
        const baseLightness1 = 8 + (temp * 12); // 8-20%
        const baseLightness2 = 5 + (temp * 15); // 5-20%
        
        // Интерполируем к черному на основе прогресса
        // progress = 0: исходные цвета, progress = 1: черный
        const saturation = baseSaturation * (1 - progress);
        const lightness1 = baseLightness1 * (1 - progress);
        const lightness2 = baseLightness2 * (1 - progress);
        
        // Если прогресс близок к 1, используем черный цвет
        if (progress >= 0.99) {
            document.body.style.background = '#000';
        } else {
            const color1 = `hsl(${hue1}, ${saturation}%, ${lightness1}%)`;
            const color2 = `hsl(${hue2}, ${saturation}%, ${lightness2}%)`;
            document.body.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
        }
    }
}
