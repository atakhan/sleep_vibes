// Главный файл приложения
class App {
    // Константы для анимаций
    static FADE_IN_DURATION = 4000; // миллисекунды (4 секунды)
    
    constructor() {
        this.currentScreen = 'start-sleep-screen';
        this.temperature = 50;
        this.currentSound = 1;
        this.currentAnimation = 1;
        this.stillAwakeCount = 0;
        this.stillAwakeTimerInterval = null;
        
        // Инициализируем список звуков
        this.maxSoundId = SoundSources.getAllSounds().length;
        
        // Менеджер предпросмотра
        this.previewManager = new PreviewManager();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showScreen('start-sleep-screen');
        this.updateBackground();
    }

    setupEventListeners() {
        // StartSleepScreen
        document.getElementById('start-sleep-btn').addEventListener('click', () => {
            this.startSleep();
        });

        document.getElementById('temperature-slider').addEventListener('input', (e) => {
            this.temperature = parseInt(e.target.value);
            document.getElementById('temperature-value').textContent = this.temperature;
            this.updateBackground();
            // Обновляем предпросмотр при изменении температуры
            if (this.currentScreen === 'start-sleep-screen') {
                this.previewManager.update(this.temperature, this.currentSound, this.currentAnimation);
            }
        });

        document.getElementById('sound-prev').addEventListener('click', () => {
            this.currentSound = Math.max(1, this.currentSound - 1);
            this.updateSoundDisplay();
        });

        document.getElementById('sound-next').addEventListener('click', () => {
            this.currentSound = this.currentSound >= this.maxSoundId ? 1 : this.currentSound + 1;
            this.updateSoundDisplay();
        });

        document.getElementById('animation-prev').addEventListener('click', () => {
            this.currentAnimation = Math.max(1, this.currentAnimation - 1);
            this.updateAnimationDisplay();
        });

        document.getElementById('animation-next').addEventListener('click', () => {
            this.currentAnimation = this.currentAnimation + 1;
            this.updateAnimationDisplay();
        });

        // StillAwakeScreen
        document.getElementById('still-awake-btn').addEventListener('click', () => {
            this.handleStillAwake();
        });

        // SessionScreen -> StillAwakeScreen
        document.getElementById('session-to-still-awake-btn').addEventListener('click', () => {
            this.handleStillAwake();
        });
    }

    updateSoundDisplay() {
        // TODO: Заглушка - данные должны приходить с сервера
        const soundName = SoundSources.getSoundName(this.currentSound);
        document.getElementById('current-sound').textContent = soundName;
        // Обновляем предпросмотр при изменении звука
        if (this.currentScreen === 'start-sleep-screen') {
            this.previewManager.update(this.temperature, this.currentSound, this.currentAnimation);
        }
    }

    updateAnimationDisplay() {
        // TODO: Заглушка - данные должны приходить с сервера
        const animationName = this.getAnimationName(this.currentAnimation);
        document.getElementById('current-animation').textContent = animationName;
        // Обновляем предпросмотр при изменении анимации
        if (this.currentScreen === 'start-sleep-screen') {
            this.previewManager.update(this.temperature, this.currentSound, this.currentAnimation);
        }
    }

    getAnimationName(animationType) {
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

    updateBackground() {
        // Температура от 0 (холодные) до 100 (теплые)
        // Холодные: синие, голубые, фиолетовые (hue ~200-270)
        // Теплые: красные, оранжевые, желтые (hue ~0-60)
        // Темная тема: низкая яркость (lightness)
        
        const temp = this.temperature / 100; // 0.0 - 1.0
        
        // Интерполяция между холодными и теплыми оттенками
        // Холодные: от синего (240) к фиолетовому (270)
        // Теплые: от красного (0/360) к оранжевому (30)
        
        // Для холодных: hue от 240 до 270
        // Для теплых: hue от 0 до 30
        // Переход через промежуточные цвета
        
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
        const saturation = 50 + (temp * 20); // 50-70%
        // Яркость: 8-20% (темные цвета)
        const lightness1 = 8 + (temp * 12); // 8-20%
        const lightness2 = 5 + (temp * 15); // 5-20%
        
        const color1 = `hsl(${hue1}, ${saturation}%, ${lightness1}%)`;
        const color2 = `hsl(${hue2}, ${saturation}%, ${lightness2}%)`;
        
        document.body.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
            screen.style.opacity = '0'; // Сбрасываем opacity для fade in
        });
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            
            // Fade in для still-awake-screen
            if (screenId === 'still-awake-screen') {
                const fadeInDuration = App.FADE_IN_DURATION / 1000; // в секундах
                
                // Начинаем с черного экрана (opacity 0)
                targetScreen.style.opacity = '0';
                targetScreen.style.transition = `opacity ${fadeInDuration}s ease-in`;
                
                // Находим кнопку "Я не уснул" и скрываем её
                const stillAwakeBtn = document.getElementById('still-awake-btn');
                if (stillAwakeBtn) {
                    stillAwakeBtn.style.opacity = '0';
                    stillAwakeBtn.style.transition = `opacity ${fadeInDuration}s ease-in`;
                }
                
                // Плавно появляемся экран и кнопка
                setTimeout(() => {
                    targetScreen.style.opacity = '1';
                    
                    // Плавно появляемся кнопка с небольшой задержкой для синхронизации
                    if (stillAwakeBtn) {
                        requestAnimationFrame(() => {
                            stillAwakeBtn.style.opacity = '1';
                        });
                    }
                }, 10);
            } else {
                // Для других экранов просто показываем
                targetScreen.style.opacity = '1';
                targetScreen.style.transition = '';
                
                // Сбрасываем opacity кнопки, если она была скрыта
                const stillAwakeBtn = document.getElementById('still-awake-btn');
                if (stillAwakeBtn) {
                    stillAwakeBtn.style.opacity = '1';
                    stillAwakeBtn.style.transition = '';
                }
                
                // Восстанавливаем фон и запускаем предпросмотр для start-sleep-screen
                if (screenId === 'start-sleep-screen') {
                    this.updateBackground();
                    // Запускаем предпросмотр анимации и звуков
                    this.previewManager.start(this.temperature, this.currentSound, this.currentAnimation);
                } else {
                    // Останавливаем предпросмотр при переходе на другой экран
                    this.previewManager.stop();
                }
            }
        }
        
        this.currentScreen = screenId;
    }

    startSleep() {
        // TODO: Отправка данных на сервер
        // fetch('/api/start-sleep', {
        //     method: 'POST',
        //     body: JSON.stringify({
        //         temperature: this.temperature,
        //         sound: this.currentSound,
        //         animation: this.currentAnimation,
        //         try_count: this.stillAwakeCount
        //     })
        // });

        // Останавливаем предпросмотр перед переходом на сессию
        this.previewManager.stop();

        this.showScreen('session-screen');
        // Небольшая задержка для гарантии, что экран активирован в DOM
        setTimeout(() => {
            SessionScreen.start(this.temperature, this.currentSound, this.currentAnimation, this.stillAwakeCount);
        }, 50);
    }

    handleStillAwake() {
        this.stillAwakeCount++;
        
        // Завершаем сессию с флагом is_still_awake
        if (SessionScreen.session) {
            SessionScreen.session.end(true);
            
            // TODO: Отправка данных на сервер
            // fetch('/api/still-awake', {
            //     method: 'POST',
            //     body: JSON.stringify(SessionScreen.session.getSessionData())
            // });
        }

        SessionScreen.stop();
        
        // Восстанавливаем фон перед переходом
        this.updateBackground();
        
        // Переходим на страницу start sleep
        this.showScreen('start-sleep-screen');
    }
    
    startStillAwakeTimer() {
        // Очищаем предыдущий таймер, если он был
        if (this.stillAwakeTimerInterval) {
            clearInterval(this.stillAwakeTimerInterval);
        }
        
        let timeLeft = 15;
        const timerElement = document.getElementById('still-awake-timer');
        if (timerElement) {
            timerElement.textContent = timeLeft;
        }
        
        this.stillAwakeTimerInterval = setInterval(() => {
            timeLeft--;
            if (timerElement) {
                timerElement.textContent = timeLeft;
            }
            
            if (timeLeft <= 0) {
                clearInterval(this.stillAwakeTimerInterval);
                this.stillAwakeTimerInterval = null;
                this.showScreen('start-sleep-screen');
            }
        }, 1000);
    }

}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
    // Делаем app доступным глобально для SessionScreen
    window.app = app;
});

