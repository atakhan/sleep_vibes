// Класс для управления сессией засыпания
class Session {
    constructor(temperature, soundId, animationType, tryCount = 0) {
        this.startTime = Date.now();
        this.temperature = temperature;
        this.soundId = soundId;
        this.animationType = animationType;
        this.tryCount = tryCount;
        this.isStillAwake = false;
        this.endTime = null;
        
        // Длина сессии зависит от температуры
        // Чем меньше температура, тем длиннее сессия
        // Формула: базовое время * (1 - temperature/200)
        // При temp=0: 10 минут, при temp=100: 5 минут
        const baseDuration = 10 * 60 * 1000; // 10 минут в миллисекундах
        const minDuration = 5 * 60 * 1000; // 5 минут минимум
        const durationFactor = 1 - (temperature / 200);
        this.duration = Math.max(minDuration, baseDuration * durationFactor);
        
        // Базовый ритм: 65 ударов в минуту
        this.baseBPM = 65;
        this.currentBPM = this.baseBPM;
        
        // Интервал между ударами в миллисекундах
        this.beatInterval = (60 / this.baseBPM) * 1000;
        
        // Время последнего удара
        this.lastBeatTime = 0;
        
        // Прогресс сессии (0.0 - 1.0)
        this.progress = 0;
    }
    
    // Получить текущий BPM с учетом угасания
    getCurrentBPM() {
        // Используем экспоненциальную функцию для плавного угасания
        // BPM угасает от 65 до 40 BPM за время сессии
        const minBPM = 40;
        const bpmRange = this.baseBPM - minBPM;
        
        // Экспоненциальное угасание: более быстрое в начале, медленное в конце
        const decayFactor = Math.pow(this.progress, 0.7); // 0.7 дает плавную кривую
        return this.baseBPM - (bpmRange * decayFactor);
    }
    
    // Получить текущий интервал между ударами
    getCurrentBeatInterval() {
        const currentBPM = this.getCurrentBPM();
        return (60 / currentBPM) * 1000;
    }
    
    // Обновить прогресс сессии
    updateProgress() {
        const elapsed = Date.now() - this.startTime;
        this.progress = Math.min(1.0, elapsed / this.duration);
    }
    
    // Проверить, закончилась ли сессия
    isFinished() {
        return this.progress >= 1.0;
    }
    
    // Получить оставшееся время в секундах
    getRemainingTime() {
        const elapsed = Date.now() - this.startTime;
        const remaining = this.duration - elapsed;
        return Math.max(0, Math.floor(remaining / 1000));
    }
    
    // Завершить сессию
    end(isStillAwake = false) {
        this.endTime = Date.now();
        this.isStillAwake = isStillAwake;
    }
    
    // Получить длительность сессии в секундах
    getDurationSeconds() {
        return Math.floor(this.duration / 1000);
    }
    
    // Получить данные сессии для отправки на сервер
    getSessionData() {
        return {
            startTime: this.startTime,
            endTime: this.endTime || Date.now(),
            temperature: this.temperature,
            sound: this.soundId,
            animation: this.animationType,
            is_still_awake: this.isStillAwake,
            try_count: this.tryCount,
            duration: this.endTime ? (this.endTime - this.startTime) : (Date.now() - this.startTime)
        };
    }
}

