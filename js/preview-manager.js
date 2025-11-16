// Управление предпросмотром анимации и звуков на экране start sleep
class PreviewManager {
    constructor() {
        this.audioManager = null;
        this.ambientPlayer = null;
        this.animationController = null;
        this.isActive = false;
    }

    start(temperature, soundId, animationType) {
        if (this.isActive) {
            this.stop();
        }

        this.isActive = true;

        // Инициализируем аудио менеджер
        this.audioManager = new AudioManager();
        this.audioManager.init();

        // Создаем компоненты
        this.ambientPlayer = new AmbientPlayer(this.audioManager);
        this.animationController = new AnimationController();

        // Создаем анимацию
        const container = document.getElementById('start-sleep-animation-container');
        if (container) {
            container.innerHTML = '';
            const animation = AnimationGenerator.generate(animationType, temperature);
            if (!this.animationController) {
                this.animationController = new AnimationController();
            }
            this.animationController.animationElement = animation.element;
            container.appendChild(animation.element);
        }

        // Запускаем фоновый звук
        this.ambientPlayer.start(soundId, temperature);
    }

    update(temperature, soundId, animationType) {
        if (!this.isActive) {
            this.start(temperature, soundId, animationType);
            return;
        }

        // Обновляем анимацию
        const container = document.getElementById('start-sleep-animation-container');
        if (container) {
            container.innerHTML = '';
            const animation = AnimationGenerator.generate(animationType, temperature);
            if (this.animationController) {
                this.animationController.animationElement = animation.element;
            } else {
                this.animationController = new AnimationController();
                this.animationController.animationElement = animation.element;
            }
            container.appendChild(animation.element);
        }

        // Обновляем звук
        if (this.ambientPlayer) {
            this.ambientPlayer.stop();
        }
        if (this.audioManager) {
            this.ambientPlayer = new AmbientPlayer(this.audioManager);
            this.ambientPlayer.start(soundId, temperature);
        }
    }

    stop() {
        if (this.ambientPlayer) {
            this.ambientPlayer.stop();
            this.ambientPlayer = null;
        }

        if (this.audioManager) {
            this.audioManager.close();
            this.audioManager = null;
        }

        // Очищаем анимацию
        const container = document.getElementById('start-sleep-animation-container');
        if (container) {
            container.innerHTML = '';
        }

        if (this.animationController) {
            this.animationController = null;
        }

        this.isActive = false;
    }
}

