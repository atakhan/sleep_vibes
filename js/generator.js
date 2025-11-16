// Процедурная генерация анимаций и звуков
class AnimationGenerator {
    static generate(type, temperature) {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.position = 'relative';
        container.style.overflow = 'hidden';

        // Базовые параметры на основе температуры
        const intensity = temperature / 100;
        const speed = 0.5 + intensity * 1.5;
        const colorHue = (temperature * 3.6) % 360; // 0-360 градусов

        switch (type) {
            case 1:
                return this.generateWaves(container, colorHue, speed, intensity);
            case 2:
                return this.generateParticles(container, colorHue, speed, intensity);
            case 3:
                return this.generateGradient(container, colorHue, speed, intensity);
            default:
                return this.generateWaves(container, colorHue, speed, intensity);
        }
    }

    static generateWaves(container, hue, speed, intensity) {
        const waveCount = 3 + Math.floor(intensity * 5);
        
        for (let i = 0; i < waveCount; i++) {
            const wave = document.createElement('div');
            wave.style.position = 'absolute';
            wave.style.width = '200%';
            wave.style.height = '100px';
            wave.style.background = `linear-gradient(90deg, 
                hsla(${hue + i * 30}, 70%, 50%, ${0.3 + intensity * 0.3}), 
                hsla(${hue + i * 30 + 60}, 70%, 50%, ${0.2 + intensity * 0.2}))`;
            wave.style.borderRadius = '50%';
            wave.style.top = `${20 + i * 15}%`;
            wave.style.left = '-50%';
            wave.style.animation = `wave ${2 + speed * 2}s ease-in-out infinite`;
            wave.style.animationDelay = `${i * 0.3}s`;
            
            container.appendChild(wave);
        }

        // Добавляем CSS анимацию
        if (!document.getElementById('wave-animation-style')) {
            const style = document.createElement('style');
            style.id = 'wave-animation-style';
            style.textContent = `
                @keyframes wave {
                    0%, 100% { transform: translateX(0) scaleY(1); }
                    50% { transform: translateX(25%) scaleY(1.2); }
                }
            `;
            document.head.appendChild(style);
        }

        return { element: container };
    }

    static generateParticles(container, hue, speed, intensity) {
        const particleCount = 20 + Math.floor(intensity * 50);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            const size = 5 + Math.random() * 15;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const delay = Math.random() * 2;
            
            particle.style.position = 'absolute';
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.background = `hsla(${hue + i * 10}, 70%, 60%, ${0.6 + intensity * 0.4})`;
            particle.style.borderRadius = '50%';
            particle.style.left = `${x}%`;
            particle.style.top = `${y}%`;
            particle.style.animation = `float ${3 + speed * 2}s ease-in-out infinite`;
            particle.style.animationDelay = `${delay}s`;
            
            container.appendChild(particle);
        }

        if (!document.getElementById('float-animation-style')) {
            const style = document.createElement('style');
            style.id = 'float-animation-style';
            style.textContent = `
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
                    25% { transform: translate(20px, -20px) scale(1.2); opacity: 1; }
                    50% { transform: translate(-10px, -40px) scale(0.8); opacity: 0.8; }
                    75% { transform: translate(-20px, -20px) scale(1.1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        return { element: container };
    }

    static generateGradient(container, hue, speed, intensity) {
        container.style.background = `radial-gradient(circle, 
            hsla(${hue}, 70%, 40%, ${0.8 + intensity * 0.2}), 
            hsla(${hue + 60}, 70%, 20%, ${0.6 + intensity * 0.4}))`;
        container.style.animation = `pulse ${2 + speed * 2}s ease-in-out infinite`;

        if (!document.getElementById('pulse-animation-style')) {
            const style = document.createElement('style');
            style.id = 'pulse-animation-style';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { filter: brightness(1) hue-rotate(0deg); }
                    50% { filter: brightness(1.2) hue-rotate(30deg); }
                }
            `;
            document.head.appendChild(style);
        }

        return { element: container };
    }
}

class SoundGenerator {
    static generate(soundId, temperature) {
        const sound = SoundSources.getSound(soundId);
        
        if (!sound || sound.type !== 'procedural') {
            return null; // Не процедурный звук, будет воспроизводиться через URL
        }

        const volume = 0.1 + (temperature / 100) * 0.2; // 0.1-0.3
        const intensity = temperature / 100;

        switch (sound.generator) {
            case 'whiteNoise':
                return {
                    type: 'whiteNoise',
                    volume: volume,
                    intensity: intensity
                };
            case 'pinkNoise':
                return {
                    type: 'pinkNoise',
                    volume: volume,
                    intensity: intensity
                };
            case 'brownNoise':
                return {
                    type: 'brownNoise',
                    volume: volume,
                    intensity: intensity
                };
            default:
                return {
                    type: 'whiteNoise',
                    volume: volume,
                    intensity: intensity
                };
        }
    }

    // Генерация белого шума
    static generateWhiteNoise(bufferSize, sampleRate) {
        const buffer = new Float32Array(bufferSize);
        for (let i = 0; i < bufferSize; i++) {
            buffer[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // Генерация розового шума (фильтрация белого шума)
    static generatePinkNoise(bufferSize, sampleRate) {
        const buffer = new Float32Array(bufferSize);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            buffer[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            buffer[i] *= 0.11;
            b6 = white * 0.115926;
        }
        return buffer;
    }

    // Генерация коричневого шума (более низкие частоты)
    static generateBrownNoise(bufferSize, sampleRate) {
        const buffer = new Float32Array(bufferSize);
        let lastOut = 0;
        
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            buffer[i] = lastOut * 3.5;
        }
        return buffer;
    }
}

