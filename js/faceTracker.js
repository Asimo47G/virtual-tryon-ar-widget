/**
 * faceTracker.js – MediaPipe Face Landmarker Wrapper
 * 468 adet 3D yüz noktası gerçek zamanlı takibi
 */

const MEDIAPIPE_WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const FACE_LANDMARKER_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export class FaceTracker {
    constructor() {
        this.faceLandmarker = null;
        this.isRunning = false;
        this.lastVideoTime = -1;
        this.results = null;
        this.onResults = null; // callback
    }

    async init() {
        const { FaceLandmarker, FilesetResolver } = await import(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest"
        );

        const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_CDN);

        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: FACE_LANDMARKER_MODEL,
                delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: true,
        });

        console.log("[FaceTracker] Initialized successfully.");
    }

    /**
     * Her video karesinde çağrılır.
     * @param {HTMLVideoElement} video
     * @returns {object|null} landmark sonuçları
     */
    detect(video) {
        if (!this.faceLandmarker || !video.videoWidth) return null;

        const now = performance.now();
        if (video.currentTime === this.lastVideoTime) return this.results;
        this.lastVideoTime = video.currentTime;

        this.results = this.faceLandmarker.detectForVideo(video, now);

        if (this.onResults) {
            this.onResults(this.results);
        }

        return this.results;
    }

    /**
     * Yüz algılandı mı?
     */
    hasFace() {
        return (
            this.results &&
            this.results.faceLandmarks &&
            this.results.faceLandmarks.length > 0
        );
    }

    /**
     * Kritik landmark noktalarını döndürür
     */
    getKeyPoints() {
        if (!this.hasFace()) return null;

        const lm = this.results.faceLandmarks[0];

        return {
            // Gözlük konumlandırma
            noseBridge: lm[168],       // Burun köprüsü üstü
            noseTip: lm[1],            // Burun ucu
            leftEyeOuter: lm[33],      // Sol göz dış köşe
            rightEyeOuter: lm[263],    // Sağ göz dış köşe
            leftEyeInner: lm[133],     // Sol göz iç köşe
            rightEyeInner: lm[362],    // Sağ göz iç köşe

            // Şapka konumlandırma
            forehead: lm[10],          // Alın
            leftTemple: lm[234],       // Sol şakak
            rightTemple: lm[454],      // Sağ şakak

            // Küpe konumlandırma
            leftEar: lm[234],          // Sol kulak
            rightEar: lm[454],         // Sağ kulak
            leftEarBottom: lm[132],    // Sol kulak altı
            rightEarBottom: lm[361],   // Sağ kulak altı

            // Rotasyon hesaplama
            chin: lm[152],             // Çene ucu
            leftCheek: lm[234],        // Sol yanak
            rightCheek: lm[454],       // Sağ yanak

            // Tüm landmark'lar (özel kullanım)
            all: lm,
        };
    }

    /**
     * Yüz dönüş matrisini döndürür (varsa)
     */
    getTransformMatrix() {
        if (
            !this.results ||
            !this.results.facialTransformationMatrixes ||
            this.results.facialTransformationMatrixes.length === 0
        )
            return null;

        return this.results.facialTransformationMatrixes[0].data;
    }

    /**
     * Baş rotasyonunu hesaplar (yaw, pitch, roll)
     */
    getHeadRotation() {
        const kp = this.getKeyPoints();
        if (!kp) return null;

        // Yaw (sağa-sola dönüş)
        const faceWidth = Math.abs(kp.leftEyeOuter.x - kp.rightEyeOuter.x);
        const leftDist = Math.abs(kp.noseBridge.x - kp.leftEyeOuter.x);
        const rightDist = Math.abs(kp.noseBridge.x - kp.rightEyeOuter.x);
        const yaw = Math.atan2(leftDist - rightDist, faceWidth) * 1.5;

        // Pitch (yukarı-aşağı)
        const foreheadToNose = kp.noseBridge.y - kp.forehead.y;
        const noseToChin = kp.chin.y - kp.noseBridge.y;
        const pitch = Math.atan2(foreheadToNose - noseToChin * 0.6, foreheadToNose + noseToChin) * 1.2;

        // Roll (yanal eğilme)
        const dy = kp.rightEyeOuter.y - kp.leftEyeOuter.y;
        const dx = kp.rightEyeOuter.x - kp.leftEyeOuter.x;
        const roll = Math.atan2(dy, dx);

        return { yaw, pitch, roll };
    }

    destroy() {
        if (this.faceLandmarker) {
            this.faceLandmarker.close();
            this.faceLandmarker = null;
        }
        this.isRunning = false;
    }
}
