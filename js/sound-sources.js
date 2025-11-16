// Источники звуков для приложения
class SoundSources {
    // Конфигурация звуков
    static sounds = [
        {
            id: 1,
            name: 'Белый шум',
            type: 'procedural',
            generator: 'whiteNoise'
        },
        {
            id: 2,
            name: 'Розовый шум',
            type: 'procedural',
            generator: 'pinkNoise'
        },
        {
            id: 3,
            name: 'Коричневый шум',
            type: 'procedural',
            generator: 'brownNoise'
        },
        {
            id: 4,
            name: 'Фонтан',
            type: 'url',
            url: 'sounds/fountain.wav'
        }
    ];

    // Получить звук по ID
    static getSound(id) {
        return this.sounds.find(sound => sound.id === id) || this.sounds[0];
    }

    // Получить все звуки
    static getAllSounds() {
        return this.sounds;
    }

    // Получить имя звука по ID
    static getSoundName(id) {
        const sound = this.getSound(id);
        return sound ? sound.name : 'Неизвестный звук';
    }

    // Проверить, является ли звук процедурным
    static isProcedural(id) {
        const sound = this.getSound(id);
        return sound && sound.type === 'procedural';
    }

    // Получить URL звука (если это не процедурный)
    static getSoundUrl(id) {
        const sound = this.getSound(id);
        return sound && sound.type === 'url' ? sound.url : null;
    }
}

