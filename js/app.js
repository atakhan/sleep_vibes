// Главный файл приложения
class App {
    constructor() {
        this.currentScreen = 'start-sleep-screen';
        this.temperature = 50;
        this.currentSound = 1;
        this.currentAnimation = 1;
        this.stillAwakeCount = 0;
        
        // Инициализируем список звуков
        this.maxSoundId = SoundSources.getAllSounds().length;
        
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

        // TryAgainScreen
        document.getElementById('try-again-btn').addEventListener('click', () => {
            this.tryAgain();
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
    }

    updateAnimationDisplay() {
        // TODO: Заглушка - данные должны приходить с сервера
        document.getElementById('current-animation').textContent = `Анимация ${this.currentAnimation}`;
    }

    updateBackground() {
        // Температура от 0 (холодные) до 100 (теплые)
        // Холодные: синие, голубые, фиолетовые (hue ~200-270)
        // Теплые: красные, оранжевые, желтые (hue ~0-60)
        
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
        
        // Насыщенность и яркость для более плавного перехода
        const saturation = 60 + (temp * 20); // 60-80%
        const lightness1 = 40 + (temp * 10); // 40-50%
        const lightness2 = 30 + (temp * 15); // 30-45%
        
        const color1 = `hsl(${hue1}, ${saturation}%, ${lightness1}%)`;
        const color2 = `hsl(${hue2}, ${saturation}%, ${lightness2}%)`;
        
        document.body.style.background = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
        
        // Автоматически запускаем таймер при показе TryAgainScreen
        if (screenId === 'try-again-screen') {
            this.startTimer();
        }
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
        this.showScreen('try-again-screen');
    }

    tryAgain() {
        this.showScreen('start-sleep-screen');
    }

    startTimer() {
        // Очищаем предыдущий таймер, если он был
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        let timeLeft = 20;
        const timerElement = document.getElementById('timer');
        timerElement.textContent = timeLeft;

        this.timerInterval = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                this.showScreen('start-sleep-screen');
            }
        }, 1000);
    }
}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});

