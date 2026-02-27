/**
 * sceneManager.js – Three.js Sahne Yöneticisi
 * Video üzerine şeffaf 3D render katmanı
 */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export class SceneManager {
    constructor(canvas, videoElement) {
        this.canvas = canvas;
        this.video = videoElement;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.currentModel = null;
        this.debugMode = false;

        // Smoothing buffers
        this._posBuffer = [];
        this._rotBuffer = [];
        this._scaleBuffer = [];
        this.SMOOTH_FRAMES = 5;
    }

    init() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;

        // Scene
        this.scene = new THREE.Scene();

        // Camera – perspektif, video FOV'una uygun
        this.camera = new THREE.PerspectiveCamera(63, w / h, 0.1, 1000);
        this.camera.position.z = 5;

        // Renderer – şeffaf arka plan
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true,
        });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // Lighting – doğal yüz aydınlatması
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(0, 2, 5);
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-3, 0, 3);
        this.scene.add(fillLight);

        // Resize handler
        this._onResize = () => this.resize();
        window.addEventListener("resize", this._onResize);

        console.log("[SceneManager] Initialized.");
    }

    resize() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    /**
     * Modeli sahneye ekler
     * @param {THREE.Object3D} model
     */
    setModel(model) {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
        }
        this.currentModel = model;
        this.scene.add(model);
        // Buffer'ları temizle
        this._posBuffer = [];
        this._rotBuffer = [];
        this._scaleBuffer = [];
    }

    /**
     * Modeli sahneden kaldırır
     */
    clearModel() {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
            this.currentModel = null;
        }
    }

    /**
     * Normalize landmark koordinatlarını Three.js dünya koordinatlarına çevirir
     * @param {object} keyPoints - faceTracker.getKeyPoints()
     * @param {object} rotation - faceTracker.getHeadRotation()
     * @param {object} modelMeta - { type, offsetY, offsetZ, scaleFactor }
     */
    updateModelTransform(keyPoints, rotation, modelMeta = {}) {
        if (!this.currentModel || !keyPoints) return;

        const {
            type = "glasses",
            offsetY = 0,
            offsetZ = 0,
            scaleFactor = 1.0,
        } = modelMeta;

        const vw = this.video.videoWidth;
        const vh = this.video.videoHeight;

        let anchorPoint, scaleRef;

        switch (type) {
            case "hat":
                anchorPoint = keyPoints.forehead;
                scaleRef = this._distance(keyPoints.leftTemple, keyPoints.rightTemple) * scaleFactor;
                break;
            case "earring_left":
                anchorPoint = keyPoints.leftEarBottom;
                scaleRef = this._distance(keyPoints.leftEyeOuter, keyPoints.rightEyeOuter) * scaleFactor * 0.3;
                break;
            case "earring_right":
                anchorPoint = keyPoints.rightEarBottom;
                scaleRef = this._distance(keyPoints.leftEyeOuter, keyPoints.rightEyeOuter) * scaleFactor * 0.3;
                break;
            case "glasses":
            default:
                anchorPoint = keyPoints.noseBridge;
                scaleRef = this._distance(keyPoints.leftEyeOuter, keyPoints.rightEyeOuter) * scaleFactor;
                break;
        }

        // Normalize (0-1) → Three.js koordinat (-aspect...+aspect, -1...+1)
        const aspect = vw / vh;
        const x = -(anchorPoint.x - 0.5) * 2 * aspect * this.camera.position.z * Math.tan((this.camera.fov / 2) * Math.PI / 180);
        const y = -(anchorPoint.y - 0.5) * 2 * this.camera.position.z * Math.tan((this.camera.fov / 2) * Math.PI / 180);
        const z = (anchorPoint.z || 0) * -5 + offsetZ;

        // Scale: göz arası mesafe bazlı
        const scale = scaleRef * this.camera.position.z * 4 * scaleFactor;

        // Smoothing uygula
        const smoothedPos = this._smooth(this._posBuffer, { x, y: y + offsetY, z });
        const smoothedRot = rotation ? this._smooth(this._rotBuffer, rotation) : { yaw: 0, pitch: 0, roll: 0 };
        const smoothedScale = this._smoothScalar(this._scaleBuffer, scale);

        // Uygula
        this.currentModel.position.set(smoothedPos.x, smoothedPos.y, smoothedPos.z);

        if (rotation) {
            this.currentModel.rotation.set(
                smoothedRot.pitch,
                smoothedRot.yaw,
                smoothedRot.roll
            );
        }

        this.currentModel.scale.setScalar(smoothedScale);
    }

    /**
     * Render döngüsü
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Mevcut sahnenin ekran görüntüsünü alır
     * @returns {string} base64 data URL
     */
    captureFrame() {
        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL("image/png");
    }

    // ─── Yardımcı Fonksiyonlar ───

    _distance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = (p1.z || 0) - (p2.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    _smooth(buffer, value) {
        buffer.push({ ...value });
        if (buffer.length > this.SMOOTH_FRAMES) buffer.shift();
        const avg = {};
        for (const key of Object.keys(value)) {
            avg[key] = buffer.reduce((s, v) => s + v[key], 0) / buffer.length;
        }
        return avg;
    }

    _smoothScalar(buffer, value) {
        buffer.push(value);
        if (buffer.length > this.SMOOTH_FRAMES) buffer.shift();
        return buffer.reduce((s, v) => s + v, 0) / buffer.length;
    }

    destroy() {
        window.removeEventListener("resize", this._onResize);
        if (this.renderer) {
            this.renderer.dispose();
        }
        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }
}
