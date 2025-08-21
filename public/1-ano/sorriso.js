class FaceDetectionAR {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.isModelLoaded = false;
        this.detectionActive = false;
        
        // A-Frame elements
        this.faceCube = null;
        this.expressionText = null;
        this.emotionSpheres = {};
        
        // Face detection data
        this.currentExpression = 'neutral';
        this.faceDetected = false;
        
        // Hand detection data
        this.hands = null;
        this.camera = null;
        this.handsDetected = [];
        this.leftHandGesture = '';
        this.rightHandGesture = '';
        this.handElements = {};
        
        this.init();
    }

    async init() {
        try {
            await this.setupCamera();
            await this.loadModels();
            await this.setupHandDetection();
            this.setupCanvas();
            this.setupAFrameElements();
            this.startDetection();
            this.startHandDetection();
            console.log('Face Detection AR iniciado com sucesso!');
        } catch (error) {
            console.error('Erro ao inicializar:', error);
            this.showError('Erro ao acessar câmera ou carregar modelos');
        }
    }

    async setupCamera() {
        this.video = document.getElementById('video');
        
        console.log('Solicitando acesso à câmera...');
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        });
        
        this.video.srcObject = stream;
        console.log('Stream da câmera configurado');
        
        return new Promise((resolve) => {
            this.video.onloadedmetadata = () => {
                console.log(`Vídeo carregado: ${this.video.videoWidth}x${this.video.videoHeight}`);
                console.log(`Elemento vídeo visível: ${this.video.style.display !== 'none'}`);
                console.log(`Vídeo playing: ${!this.video.paused}`);
                this.video.play(); // Garantir que o vídeo está reproduzindo
                
                // Atualizar status da câmera
                const status = document.getElementById('camera-status');
                if (status) {
                    status.textContent = '📹 Câmera ativa';
                    status.style.background = 'rgba(0, 128, 0, 0.8)';
                }
                
                resolve();
            };
        });
    }

    async loadModels() {
        // URL correta para os modelos da face-api.js
        const MODEL_URL = '/models';
        
        console.log('Carregando modelos de IA...');
        
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
            ]);
            
            this.isModelLoaded = true;
            console.log('Modelos carregados com sucesso!');
        } catch (error) {
            console.error('Erro ao carregar modelos:', error);
            // Fallback para CDN alternativo
            const FALLBACK_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
            console.log('Tentando URL alternativa para modelos...');
            
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(FALLBACK_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(FALLBACK_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(FALLBACK_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(FALLBACK_URL)
            ]);
            
            this.isModelLoaded = true;
            console.log('Modelos carregados com sucesso via URL alternativa!');
        }
    }

    setupCanvas() {
        this.canvas = document.getElementById('overlay');
        this.ctx = this.canvas.getContext('2d');
        
        // Use viewport dimensions for better overlay
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        console.log(`Canvas configurado: ${this.canvas.width}x${this.canvas.height}`);
        console.log(`Video dimensões: ${this.video.videoWidth}x${this.video.videoHeight}`);
        
        // Debug: verificar visibilidade do vídeo
        const videoStyle = window.getComputedStyle(this.video);
        console.log(`Vídeo computed styles:`, {
            display: videoStyle.display,
            visibility: videoStyle.visibility,
            opacity: videoStyle.opacity,
            zIndex: videoStyle.zIndex,
            position: videoStyle.position
        });
    }

    async setupHandDetection() {
        console.log('Configurando detecção de mãos...');
        
        if (typeof Hands !== 'undefined' && typeof Camera !== 'undefined') {
            this.hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });

            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.6,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults(this.onHandsResults.bind(this));
            
            // Setup MediaPipe Camera
            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    if (this.hands && this.video.videoWidth > 0) {
                        await this.hands.send({imageData: this.video});
                    }
                },
                width: 1280,
                height: 720
            });
            
            console.log('MediaPipe Hands configurado com sucesso!');
        } else {
            console.warn('MediaPipe Hands ou Camera não está disponível');
            console.log('Hands available:', typeof Hands !== 'undefined');
            console.log('Camera available:', typeof Camera !== 'undefined');
        }
    }

    setupAFrameElements() {
        // Wait for A-Frame to load
        setTimeout(() => {
            this.faceCube = document.getElementById('face-cube');
            this.expressionText = document.getElementById('expression-text');
            
            this.emotionSpheres = {
                happy: document.getElementById('happy-sphere'),
                sad: document.getElementById('sad-sphere'),
                angry: document.getElementById('angry-sphere'),
                surprised: document.getElementById('surprised-sphere')
            };

            // Hand elements
            this.handElements = {
                leftHandCube: document.getElementById('left-hand-cube'),
                rightHandCube: document.getElementById('right-hand-cube'),
                leftHandText: document.getElementById('left-hand-text'),
                rightHandText: document.getElementById('right-hand-text'),
                peaceSphere: document.getElementById('peace-sphere'),
                fistSphere: document.getElementById('fist-sphere'),
                openHandSphere: document.getElementById('open-hand-sphere')
            };
        }, 1000);
    }

    async detectFaces() {
        if (!this.isModelLoaded) {
            console.log('Modelos ainda não carregados');
            return;
        }
        
        if (!this.video.videoWidth) {
            console.log('Vídeo ainda não tem dimensões válidas');
            return;
        }

        try {
            const detections = await faceapi
                .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceExpressions();

            // Clear previous drawings
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            if (detections.length > 0) {
                console.log(`${detections.length} rosto(s) detectado(s)`);
                this.faceDetected = true;
                this.processFaceDetections(detections);
            } else {
                this.faceDetected = false;
                this.updateARElements();
                this.drawStatusInfo();
            }
        } catch (error) {
            console.error('Erro na detecção:', error);
        }
    }

    startHandDetection() {
        if (this.camera) {
            console.log('Iniciando câmera MediaPipe para detecção de mãos...');
            this.camera.start();
        } else {
            console.warn('Camera MediaPipe não configurada');
        }
    }

    onHandsResults(results) {
        // Debug: verificar se o callback está sendo chamado
        console.log('onHandsResults chamado, landmarks:', results.multiHandLandmarks?.length || 0);
        
        this.handsDetected = results.multiHandLandmarks || [];
        
        if (this.handsDetected.length > 0) {
            console.log(`${this.handsDetected.length} mão(s) detectada(s)`);
            this.processHandDetections(results);
        } else {
            this.leftHandGesture = '';
            this.rightHandGesture = '';
            this.hideAllHandElements();
        }
        
        this.updateHandElements();
    }

    processHandDetections(results) {
        const handedness = results.multiHandedness || [];
        
        for (let i = 0; i < this.handsDetected.length; i++) {
            const landmarks = this.handsDetected[i];
            const isRightHand = handedness[i] && handedness[i].label === 'Right';
            
            // Draw hand landmarks
            this.drawHandLandmarks(landmarks, isRightHand);
            
            // Recognize gesture
            const gesture = this.recognizeGesture(landmarks);
            
            if (isRightHand) {
                this.rightHandGesture = gesture;
            } else {
                this.leftHandGesture = gesture;
            }
        }
    }

    drawHandLandmarks(landmarks, isRightHand) {
        const scaleX = this.canvas.width / this.video.videoWidth;
        const scaleY = this.canvas.height / this.video.videoHeight;
        
        // Draw landmarks
        this.ctx.fillStyle = isRightHand ? '#FF6B6B' : '#4ECDC4';
        
        landmarks.forEach((landmark, index) => {
            const x = landmark.x * this.canvas.width;
            const y = landmark.y * this.canvas.height;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Draw connections for finger tips
            if ([4, 8, 12, 16, 20].includes(index)) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, 8, 0, 2 * Math.PI);
                this.ctx.strokeStyle = isRightHand ? '#FF6B6B' : '#4ECDC4';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
        });
        
        // Draw hand box
        const wrist = landmarks[0];
        const middleFinger = landmarks[12];
        const boxX = wrist.x * this.canvas.width - 50;
        const boxY = wrist.y * this.canvas.height - 50;
        const boxWidth = Math.abs((middleFinger.x - wrist.x) * this.canvas.width) + 100;
        const boxHeight = Math.abs((middleFinger.y - wrist.y) * this.canvas.height) + 100;
        
        this.ctx.strokeStyle = isRightHand ? '#FF6B6B' : '#4ECDC4';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    }

    recognizeGesture(landmarks) {
        // Simple gesture recognition based on finger positions
        const fingerTips = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
        const fingerPIP = [3, 6, 10, 14, 18]; // PIP joints (more reliable)
        
        let extendedFingers = 0;
        let fingerStates = [];
        
        // Check which fingers are extended (using PIP joints for better accuracy)
        for (let i = 1; i < fingerTips.length; i++) { // Skip thumb for now
            const tip = landmarks[fingerTips[i]];
            const pip = landmarks[fingerPIP[i]];
            
            const isExtended = tip.y < pip.y - 0.02; // Small threshold for noise
            if (isExtended) {
                extendedFingers++;
                fingerStates.push(i);
            }
        }
        
        // Check thumb separately (horizontal movement)
        const thumbTip = landmarks[4];
        const thumbCMC = landmarks[1];
        const thumbExtended = Math.abs(thumbTip.x - thumbCMC.x) > 0.08;
        
        console.log('Gesture debug:', {
            extendedFingers,
            thumbExtended,
            fingerStates
        });
        
        // Recognize gestures
        if (extendedFingers === 0 && !thumbExtended) {
            return '✊'; // Fist
        } else if (extendedFingers === 0 && thumbExtended) {
            return '👍'; // Thumbs up
        } else if (extendedFingers === 2 && fingerStates.includes(1) && fingerStates.includes(2)) {
            return '✌️'; // Peace sign (index + middle)
        } else if (extendedFingers >= 4 || (extendedFingers >= 3 && thumbExtended)) {
            return '✋'; // Open hand
        } else if (extendedFingers === 1) {
            return '👆'; // Pointing
        }
        
        return '🤚'; // Other gesture
    }

    updateHandElements() {
        if (!this.handElements.leftHandCube) return;

        // Update left hand
        if (this.leftHandGesture) {
            this.handElements.leftHandCube.setAttribute('visible', 'true');
            this.handElements.leftHandText.setAttribute('value', `Esquerda: ${this.leftHandGesture}`);
            this.handElements.leftHandCube.setAttribute('animation', 
                'property: rotation; to: 0 405 0; loop: true; dur: 2000');
        } else {
            this.handElements.leftHandCube.setAttribute('visible', 'false');
            this.handElements.leftHandText.setAttribute('value', '');
        }

        // Update right hand
        if (this.rightHandGesture) {
            this.handElements.rightHandCube.setAttribute('visible', 'true');
            this.handElements.rightHandText.setAttribute('value', `Direita: ${this.rightHandGesture}`);
            this.handElements.rightHandCube.setAttribute('animation', 
                'property: rotation; to: 0 405 0; loop: true; dur: 2000');
        } else {
            this.handElements.rightHandCube.setAttribute('visible', 'false');
            this.handElements.rightHandText.setAttribute('value', '');
        }

        // Update gesture spheres
        this.hideAllGestureSpheres();
        
        const currentGestures = [this.leftHandGesture, this.rightHandGesture];
        
        if (currentGestures.includes('✌️')) {
            this.handElements.peaceSphere.setAttribute('visible', 'true');
            this.handElements.peaceSphere.setAttribute('animation', 
                'property: scale; to: 1.5 1.5 1.5; loop: true; dir: alternate; dur: 1000');
        }
        
        if (currentGestures.includes('✊')) {
            this.handElements.fistSphere.setAttribute('visible', 'true');
            this.handElements.fistSphere.setAttribute('animation', 
                'property: scale; to: 1.5 1.5 1.5; loop: true; dir: alternate; dur: 1000');
        }
        
        if (currentGestures.includes('✋')) {
            this.handElements.openHandSphere.setAttribute('visible', 'true');
            this.handElements.openHandSphere.setAttribute('animation', 
                'property: scale; to: 1.5 1.5 1.5; loop: true; dir: alternate; dur: 1000');
        }
    }

    hideAllHandElements() {
        if (!this.handElements.leftHandCube) return;
        
        this.handElements.leftHandCube.setAttribute('visible', 'false');
        this.handElements.rightHandCube.setAttribute('visible', 'false');
        this.handElements.leftHandText.setAttribute('value', '');
        this.handElements.rightHandText.setAttribute('value', '');
        
        this.hideAllGestureSpheres();
    }

    hideAllGestureSpheres() {
        if (!this.handElements.peaceSphere) return;
        
        ['peaceSphere', 'fistSphere', 'openHandSphere'].forEach(sphere => {
            this.handElements[sphere].setAttribute('visible', 'false');
            this.handElements[sphere].removeAttribute('animation');
        });
    }

    processFaceDetections(detections) {
        const detection = detections[0]; // Use first face detected
        
        // Draw face detection box
        this.drawFaceBox(detection.detection.box);
        
        // Draw landmarks
        this.drawLandmarks(detection.landmarks);
        
        // Process expressions
        this.processExpressions(detection.expressions);
        
        // Update AR elements
        this.updateARElements();
    }

    drawFaceBox(box) {
        const { x, y, width, height } = box;
        
        // Scale coordinates to match canvas dimensions
        const scaleX = this.canvas.width / this.video.videoWidth;
        const scaleY = this.canvas.height / this.video.videoHeight;
        
        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        const scaledWidth = width * scaleX;
        const scaledHeight = height * scaleY;
        
        this.ctx.strokeStyle = '#FF6B6B';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
    }

    drawLandmarks(landmarks) {
        this.ctx.fillStyle = '#4ECDC4';
        
        // Scale coordinates to match canvas dimensions
        const scaleX = this.canvas.width / this.video.videoWidth;
        const scaleY = this.canvas.height / this.video.videoHeight;
        
        landmarks.positions.forEach(point => {
            const scaledX = point.x * scaleX;
            const scaledY = point.y * scaleY;
            
            this.ctx.beginPath();
            this.ctx.arc(scaledX, scaledY, 3, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }

    processExpressions(expressions) {
        // Find dominant expression
        let maxConfidence = 0;
        let dominantExpression = 'neutral';
        
        Object.entries(expressions).forEach(([expression, confidence]) => {
            if (confidence > maxConfidence) {
                maxConfidence = confidence;
                dominantExpression = expression;
            }
        });
        
        // Only update if confidence is high enough
        if (maxConfidence > 0.5) {
            this.currentExpression = dominantExpression;
        }
        
        // Draw expression info
        this.drawExpressionInfo(expressions);
    }

    drawExpressionInfo(expressions) {
        const panelWidth = 260;
        const panelHeight = this.handsDetected.length > 0 ? 220 : 160;
        
        // Semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(10, 10, panelWidth, panelHeight);
        
        // Border
        this.ctx.strokeStyle = '#4ECDC4';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(10, 10, panelWidth, panelHeight);
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText('Detecções:', 15, 35);
        
        // Face expressions
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillStyle = '#4ECDC4';
        this.ctx.fillText('👤 Expressões Faciais:', 15, 55);
        
        this.ctx.font = '12px Arial';
        let y = 70;
        Object.entries(expressions).forEach(([expression, confidence]) => {
            const percentage = (confidence * 100).toFixed(1);
            const color = confidence > 0.5 ? '#4ECDC4' : '#FFFFFF';
            this.ctx.fillStyle = color;
            this.ctx.fillText(`  ${expression}: ${percentage}%`, 15, y);
            y += 15;
        });
        
        // Hand gestures
        if (this.handsDetected.length > 0) {
            y += 10;
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillStyle = '#FFD93D';
            this.ctx.fillText('🤚 Gestos das Mãos:', 15, y);
            y += 15;
            
            this.ctx.font = '12px Arial';
            if (this.leftHandGesture) {
                this.ctx.fillStyle = '#4ECDC4';
                this.ctx.fillText(`  Esquerda: ${this.leftHandGesture}`, 15, y);
                y += 15;
            }
            if (this.rightHandGesture) {
                this.ctx.fillStyle = '#FF6B6B';
                this.ctx.fillText(`  Direita: ${this.rightHandGesture}`, 15, y);
                y += 15;
            }
        }
    }

    drawStatusInfo() {
        const panelWidth = 320;
        const panelHeight = 140;
        
        // Semi-transparent background
        this.ctx.fillStyle = 'rgba(255, 107, 107, 0.9)';
        this.ctx.fillRect(10, 10, panelWidth, panelHeight);
        
        // Border
        this.ctx.strokeStyle = '#FF6B6B';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(10, 10, panelWidth, panelHeight);
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.fillText('🔍 Procurando rosto e mãos...', 20, 35);
        
        this.ctx.font = '14px Arial';
        this.ctx.fillText('• Posicione seu rosto na frente da câmera', 20, 55);
        this.ctx.fillText('• Mostre suas mãos para detecção de gestos', 20, 75);
        this.ctx.fillText('• Garanta boa iluminação', 20, 95);
        this.ctx.fillText('• Fique a cerca de 50cm da tela', 20, 115);
    }

    updateARElements() {
        if (!this.faceCube || !this.expressionText) return;

        if (this.faceDetected) {
            // Show face cube
            this.faceCube.setAttribute('visible', 'true');
            
            // Update expression text
            this.expressionText.setAttribute('value', `Expressão: ${this.currentExpression}`);
            
            // Update emotion spheres
            this.updateEmotionSpheres();
            
            // Change cube color based on expression
            this.updateCubeColor();
        } else {
            // Hide face cube
            this.faceCube.setAttribute('visible', 'false');
            this.expressionText.setAttribute('value', 'Nenhum rosto detectado');
            this.hideAllEmotionSpheres();
        }
    }

    updateEmotionSpheres() {
        // Hide all spheres first
        this.hideAllEmotionSpheres();
        
        // Show sphere for current emotion
        const emotionMap = {
            'happy': 'happy',
            'sad': 'sad',
            'angry': 'angry',
            'surprised': 'surprised'
        };
        
        if (emotionMap[this.currentExpression] && this.emotionSpheres[emotionMap[this.currentExpression]]) {
            this.emotionSpheres[emotionMap[this.currentExpression]].setAttribute('visible', 'true');
            
            // Add pulsing animation
            this.emotionSpheres[emotionMap[this.currentExpression]].setAttribute('animation', 
                'property: scale; to: 1.5 1.5 1.5; loop: true; dir: alternate; dur: 1000');
        }
    }

    hideAllEmotionSpheres() {
        Object.values(this.emotionSpheres).forEach(sphere => {
            if (sphere) {
                sphere.setAttribute('visible', 'false');
                sphere.removeAttribute('animation');
            }
        });
    }

    updateCubeColor() {
        const colorMap = {
            'happy': '#FFD93D',
            'sad': '#6BCF7F', 
            'angry': '#FF6B6B',
            'surprised': '#4ECDC4',
            'neutral': '#A8A8A8'
        };
        
        const color = colorMap[this.currentExpression] || '#A8A8A8';
        this.faceCube.setAttribute('color', color);
    }

    startDetection() {
        this.detectionActive = true;
        this.detectLoop();
    }

    detectLoop() {
        if (this.detectionActive) {
            this.detectFaces().then(() => {
                requestAnimationFrame(() => this.detectLoop());
            });
        }
    }

    showError(message) {
        if (this.expressionText) {
            this.expressionText.setAttribute('value', `Erro: ${message}`);
        }
        
        // Atualizar status com erro
        const status = document.getElementById('camera-status');
        if (status) {
            status.textContent = `❌ ${message}`;
            status.style.background = 'rgba(255, 0, 0, 0.8)';
        }
        
        console.error(message);
    }

    stop() {
        this.detectionActive = false;
        
        // Stop hand detection camera
        if (this.camera) {
            this.camera.stop();
        }
        
        // Stop video stream
        if (this.video && this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.faceDetectionAR = new FaceDetectionAR();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.faceDetectionAR) {
        window.faceDetectionAR.stop();
    }
}); 