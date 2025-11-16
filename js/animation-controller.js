// Управление анимацией
class AnimationController {
    // Константы для анимации
    static BEAT_PULSE_DURATION = 200; // миллисекунды
    static FADE_OUT_DURATION = '4s';
    static FADE_OUT_EASING = 'ease-out';

    constructor() {
        this.animationElement = null;
        this.pulseAnimationId = null; // ID для requestAnimationFrame пульсации
    }

    create(animationType, temperature) {
        const container = document.getElementById('animation-container');
        if (!container) {
            console.error('Контейнер анимации не найден');
            return;
        }
        
        // Полностью очищаем контейнер и сбрасываем состояние
        container.innerHTML = '';
        
        // Очищаем данные частиц из предыдущей анимации
        if (container._particlesData) {
            delete container._particlesData;
        }
        
        this.animationElement = null;
        
        // Генерируем новую анимацию
        const animation = AnimationGenerator.generate(animationType, temperature);
        this.animationElement = animation.element;
        container.appendChild(this.animationElement);
        
        return this.animationElement;
    }

    triggerBeat() {
        if (!this.animationElement) return;
        
        // Ищем окружность внутри контейнера (для анимации 1 - пульсирующий шар)
        const circle = this.animationElement.querySelector('#pulsing-circle');
        
        if (circle) {
            // Анимация 1: пульсирующий шар
            circle.classList.add('beat-pulse');
            setTimeout(() => {
                if (circle) {
                    circle.classList.remove('beat-pulse');
                }
            }, AnimationController.BEAT_PULSE_DURATION);
        } else {
            // Анимация 2: частицы - пульсация от центра
            this._triggerParticlesBeat();
        }
    }

    _triggerParticlesBeat() {
        if (!this.animationElement || !this.animationElement._particlesData) return;
        
        // Отменяем предыдущую анимацию пульсации, если она активна
        if (this.pulseAnimationId !== null) {
            cancelAnimationFrame(this.pulseAnimationId);
            this.pulseAnimationId = null;
        }
        
        const particlesData = this.animationElement._particlesData;
        const pulseDistance = 30; // Расстояние пульсации в пикселях
        const pulseDuration = AnimationController.BEAT_PULSE_DURATION;
        const startTime = performance.now();
        
        const animatePulse = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / pulseDuration, 1);
            
            // Проверяем, что анимация все еще актуальна
            if (!this.animationElement || !this.animationElement._particlesData) {
                return;
            }
            
            particlesData.forEach(particleData => {
                const { element: wrapper, directionX, directionY } = particleData;
                
                if (!wrapper || !wrapper.parentElement) return; // Проверяем, что элемент еще в DOM
                
                // Вычисляем текущее смещение для пульсации
                let pulseOffsetX, pulseOffsetY, pulseScale;
                
                if (progress < 0.5) {
                    // Отдаление от центра (0 -> 0.5)
                    const phase = progress * 2; // 0 -> 1
                    const easePhase = 1 - Math.pow(1 - phase, 3);
                    pulseOffsetX = directionX * pulseDistance * easePhase;
                    pulseOffsetY = directionY * pulseDistance * easePhase;
                    pulseScale = 1 + (0.2 * easePhase);
                } else {
                    // Возврат к центру (0.5 -> 1)
                    const phase = (progress - 0.5) * 2; // 0 -> 1
                    const easePhase = 1 - Math.pow(1 - phase, 3);
                    pulseOffsetX = directionX * pulseDistance * (1 - easePhase);
                    pulseOffsetY = directionY * pulseDistance * (1 - easePhase);
                    pulseScale = 1 + (0.2 * (1 - easePhase));
                }
                
                // Применяем пульсацию к wrapper (не затрагивая float анимацию particle внутри)
                wrapper.style.transform = `translate(${pulseOffsetX}px, ${pulseOffsetY}px) scale(${pulseScale})`;
                wrapper.style.transition = 'transform 0.1s linear';
            });
            
            if (progress < 1) {
                this.pulseAnimationId = requestAnimationFrame(animatePulse);
            } else {
                // Завершаем анимацию, возвращаем wrapper к исходному состоянию
                particlesData.forEach(particleData => {
                    const { element: wrapper } = particleData;
                    if (wrapper && wrapper.parentElement) {
                        wrapper.style.transform = '';
                        wrapper.style.transition = '';
                    }
                });
                this.pulseAnimationId = null;
            }
        };
        
        this.pulseAnimationId = requestAnimationFrame(animatePulse);
    }
    
    stop() {
        // Отменяем активную анимацию пульсации
        if (this.pulseAnimationId !== null) {
            cancelAnimationFrame(this.pulseAnimationId);
            this.pulseAnimationId = null;
        }
        
        // Сбрасываем transform всех wrapper элементов частиц
        if (this.animationElement && this.animationElement._particlesData) {
            this.animationElement._particlesData.forEach(particleData => {
                const { element: wrapper } = particleData;
                if (wrapper) {
                    wrapper.style.transform = '';
                    wrapper.style.transition = '';
                }
            });
        }
    }

    stopPulsation() {
        const circle = this.animationElement 
            ? this.animationElement.querySelector('#pulsing-circle') 
            : null;
            
        if (circle) {
            circle.style.animation = 'none';
            circle.style.transform = 'translate(-50%, -50%) scale(1)';
        }
    }

    startFadeOut() {
        const animationContainer = document.getElementById('animation-container');
        const sessionInfo = document.getElementById('session-info');
        
        // Находим окружность (шар)
        const circle = this.animationElement 
            ? this.animationElement.querySelector('#pulsing-circle') 
            : null;
            
        const transition = `opacity ${AnimationController.FADE_OUT_DURATION} ${AnimationController.FADE_OUT_EASING}`;
        
        if (circle) {
            requestAnimationFrame(() => {
                circle.style.transition = transition;
                requestAnimationFrame(() => {
                    circle.style.opacity = '0';
                });
            });
        }
        
        // Угасание анимации
        if (animationContainer) {
            requestAnimationFrame(() => {
                animationContainer.style.transition = transition;
                requestAnimationFrame(() => {
                    animationContainer.style.opacity = '0';
                });
            });
        }
        
        // Угасание информации о сессии
        if (sessionInfo) {
            requestAnimationFrame(() => {
                sessionInfo.style.transition = transition;
                requestAnimationFrame(() => {
                    sessionInfo.style.opacity = '0';
                });
            });
        }
    }

    getElement() {
        return this.animationElement;
    }
}

