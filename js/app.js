/**
 * app.js – Ana Uygulama
 * Virtual Try-On widget'ının tüm bileşenlerini birleştirir
 */

import { FaceTracker } from "./faceTracker.js";
import { SceneManager } from "./sceneManager.js";
import { ModelLoader } from "./modelLoader.js";

// ─── Base URL Yardımcısı ───
// import.meta.url, bu dosyanın tam URL'sini verir (ör. https://…/js/app.js)
// Bir üst dizine çıkarak proje kökünü buluyoruz → GitHub Pages alt-yollarında doğru çalışır.
function getBaseUrl() {
    const scriptUrl = new URL(import.meta.url);
    // /js/app.js → / (kök) veya /virtual-tryon-ar-widget/js/app.js → /virtual-tryon-ar-widget/
    const path = scriptUrl.pathname.substring(
        0,
        scriptUrl.pathname.lastIndexOf("/js/") + 1
    );
    return `${scriptUrl.origin}${path}`;
}

const BASE_URL = getBaseUrl();

function assetUrl(relativePath) {
    return `${BASE_URL}${relativePath}`;
}

// ─── Demo Ürün Kataloğu ───
const DEMO_PRODUCTS = [
    {
        id: "glasses-aviator",
        name: "Aviator Classic",
        type: "glasses",
        format: "png",
        modelUrl: assetUrl("assets/models/glasses_aviator.png"),
        thumbnail: assetUrl("assets/models/glasses_aviator.png"),
        scaleFactor: 1.6,
        offsetY: 0.05,
        offsetZ: 0,
    },
    {
        id: "glasses-round",
        name: "Round Retro",
        type: "glasses",
        format: "png",
        modelUrl: assetUrl("assets/models/glasses_round.png"),
        thumbnail: assetUrl("assets/models/glasses_round.png"),
        scaleFactor: 1.4,
        offsetY: 0.05,
        offsetZ: 0,
    },
    {
        id: "glasses-cat",
        name: "Cat Eye",
        type: "glasses",
        format: "png",
        modelUrl: assetUrl("assets/models/glasses_cat.png"),
        thumbnail: assetUrl("assets/models/glasses_cat.png"),
        scaleFactor: 1.5,
        offsetY: 0.04,
        offsetZ: 0,
    },
    {
        id: "glasses-sport",
        name: "Sport Shield",
        type: "glasses",
        format: "png",
        modelUrl: assetUrl("assets/models/glasses_sport.png"),
        thumbnail: assetUrl("assets/models/glasses_sport.png"),
        scaleFactor: 1.7,
        offsetY: 0.03,
        offsetZ: 0,
    },
    {
        id: "glasses-wayf",
        name: "Wayfarer",
        type: "glasses",
        format: "png",
        modelUrl: assetUrl("assets/models/glasses_wayfarer.png"),
        thumbnail: assetUrl("assets/models/glasses_wayfarer.png"),
        scaleFactor: 1.5,
        offsetY: 0.05,
        offsetZ: 0,
    },
    {
        id: "sun-gradient",
        name: "Gradient Sun",
        type: "glasses",
        format: "png",
        modelUrl: assetUrl("assets/models/sun_gradient.png"),
        thumbnail: assetUrl("assets/models/sun_gradient.png"),
        scaleFactor: 1.6,
        offsetY: 0.04,
        offsetZ: 0,
    },
];

class VirtualTryOnApp {
    constructor() {
        this.faceTracker = new FaceTracker();
        this.sceneManager = null;
        this.modelLoader = new ModelLoader();
        this.products = DEMO_PRODUCTS;
        this.activeProduct = null;
        this.isRunning = false;
        this.fpsCounter = { frames: 0, lastTime: performance.now(), fps: 0 };

        // DOM elements
        this.videoEl = null;
        this.canvasEl = null;
        this.statusEl = null;
        this.productListEl = null;
        this.captureBtn = null;
        this.startBtn = null;
        this.fpsEl = null;
    }

    async init() {
        this._cacheDOMElements();
        this._showStatus("loading", "AI motoru hazırlanıyor…");

        try {
            // MediaPipe Face Landmarker'ı yükle
            console.log("[App] MediaPipe Face Landmarker yükleniyor…");
            await this.faceTracker.init();
            console.log("[App] MediaPipe başarıyla yüklendi.");

            // Ürün listesini oluştur
            this._renderProductList();

            // Event listeners
            this._bindEvents();

            this._showStatus("ready", "Kameranızı açmak için butona tıklayın");
        } catch (err) {
            console.error("[App] Init error:", err);
            const detail = err?.message || String(err);
            this._showStatus(
                "error",
                `Yükleme hatası: ${detail}. Lütfen sayfayı yenileyin.`
            );
        }
    }

    _cacheDOMElements() {
        this.videoEl = document.getElementById("cam-video");
        this.canvasEl = document.getElementById("render-canvas");
        this.statusEl = document.getElementById("status-message");
        this.productListEl = document.getElementById("product-list");
        this.captureBtn = document.getElementById("btn-capture");
        this.startBtn = document.getElementById("btn-start");
        this.fpsEl = document.getElementById("fps-counter");
        this.loaderEl = document.getElementById("loader-overlay");
        this.noFaceEl = document.getElementById("no-face-warning");
    }

    _bindEvents() {
        this.startBtn.addEventListener("click", () => this._toggleCamera());
        this.captureBtn.addEventListener("click", () => this._capturePhoto());

        // Ürün listesindeki tıklamaları delegasyon ile yakala
        this.productListEl.addEventListener("click", (e) => {
            const card = e.target.closest(".product-card");
            if (card) {
                const productId = card.dataset.productId;
                this._selectProduct(productId);
            }
        });
    }

    async _toggleCamera() {
        if (this.isRunning) {
            this._stopCamera();
        } else {
            await this._startCamera();
        }
    }

    async _startCamera() {
        try {
            this._showStatus("loading", "Kamera açılıyor...");

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });

            this.videoEl.srcObject = stream;
            await this.videoEl.play();

            // Three.js sahneyi başlat
            this.sceneManager = new SceneManager(this.canvasEl, this.videoEl);
            this.sceneManager.init();

            this.isRunning = true;
            this.startBtn.innerHTML = '<span class="btn-icon">⏹</span> Kamerayı Kapat';
            this.startBtn.classList.add("active");
            this.captureBtn.disabled = false;

            this._hideStatus();
            this._loop();
        } catch (err) {
            console.error("[App] Camera error:", err);
            this._showStatus("error", "Kamera erişimi reddedildi veya kullanılamıyor.");
        }
    }

    _stopCamera() {
        this.isRunning = false;

        if (this.videoEl.srcObject) {
            this.videoEl.srcObject.getTracks().forEach((t) => t.stop());
            this.videoEl.srcObject = null;
        }

        if (this.sceneManager) {
            this.sceneManager.destroy();
            this.sceneManager = null;
        }

        this.startBtn.innerHTML = '<span class="btn-icon">📷</span> Kamerayı Aç';
        this.startBtn.classList.remove("active");
        this.captureBtn.disabled = true;

        this._showStatus("ready", "Kameranızı açmak için butona tıklayın");
    }

    /**
     * Ana render döngüsü
     */
    _loop() {
        if (!this.isRunning) return;

        // Yüz algılama
        this.faceTracker.detect(this.videoEl);

        if (this.faceTracker.hasFace()) {
            this.noFaceEl?.classList.remove("visible");

            if (this.sceneManager && this.sceneManager.currentModel) {
                const keyPoints = this.faceTracker.getKeyPoints();
                const rotation = this.faceTracker.getHeadRotation();
                const meta = this.sceneManager.currentModel.userData.productMeta || {};
                this.sceneManager.updateModelTransform(keyPoints, rotation, meta);
            }
        } else {
            this.noFaceEl?.classList.add("visible");
        }

        // Render
        if (this.sceneManager) {
            this.sceneManager.render();
        }

        // FPS sayacı
        this._updateFPS();

        requestAnimationFrame(() => this._loop());
    }

    /**
     * Ürün seçimi
     */
    async _selectProduct(productId) {
        const product = this.products.find((p) => p.id === productId);
        if (!product) return;

        // UI güncelle
        document.querySelectorAll(".product-card").forEach((c) => c.classList.remove("selected"));
        document.querySelector(`[data-product-id="${productId}"]`)?.classList.add("selected");

        this.activeProduct = product;

        if (!this.sceneManager) return;

        try {
            const model = await this.modelLoader.load(product);
            model.userData.productMeta = {
                type: product.type,
                offsetY: product.offsetY || 0,
                offsetZ: product.offsetZ || 0,
                scaleFactor: product.scaleFactor || 1.0,
            };
            this.sceneManager.setModel(model);
        } catch (err) {
            console.error("[App] Model load error:", err);
        }
    }

    /**
     * Fotoğraf çekme
     */
    _capturePhoto() {
        if (!this.isRunning) return;

        // Video + 3D overlay'i tek canvas'a birleştir
        const compositeCanvas = document.createElement("canvas");
        compositeCanvas.width = this.videoEl.videoWidth;
        compositeCanvas.height = this.videoEl.videoHeight;
        const ctx = compositeCanvas.getContext("2d");

        // 1. Video karesini çiz (aynalı)
        ctx.save();
        ctx.translate(compositeCanvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(this.videoEl, 0, 0);
        ctx.restore();

        // 2. 3D render katmanını üstüne çiz
        if (this.sceneManager) {
            ctx.drawImage(
                this.canvasEl,
                0,
                0,
                compositeCanvas.width,
                compositeCanvas.height
            );
        }

        // İndir
        const link = document.createElement("a");
        link.download = `tryon-${Date.now()}.png`;
        link.href = compositeCanvas.toDataURL("image/png");
        link.click();

        // Flash animasyonu
        this._flashEffect();
    }

    _flashEffect() {
        const flash = document.getElementById("flash-overlay");
        if (flash) {
            flash.classList.add("active");
            setTimeout(() => flash.classList.remove("active"), 300);
        }
    }

    /**
     * Ürün listesi UI oluşturma
     */
    _renderProductList() {
        this.productListEl.innerHTML = this.products
            .map(
                (p) => `
            <div class="product-card" data-product-id="${p.id}" title="${p.name}">
                <div class="product-thumb">
                    <img src="${p.thumbnail}" alt="${p.name}" onerror="this.style.display='none'" />
                    <div class="product-thumb-fallback">${this._getTypeIcon(p.type)}</div>
                </div>
                <span class="product-name">${p.name}</span>
            </div>
        `
            )
            .join("");
    }

    _getTypeIcon(type) {
        switch (type) {
            case "glasses": return "👓";
            case "hat": return "🎩";
            case "earring": return "💎";
            default: return "✨";
        }
    }

    // ─── Status & FPS ───

    _showStatus(type, message) {
        if (!this.statusEl) return;
        this.statusEl.className = `status-message ${type}`;
        this.statusEl.querySelector(".status-text").textContent = message;
        this.statusEl.classList.add("visible");
        if (this.loaderEl) {
            this.loaderEl.classList.toggle("visible", type === "loading");
        }
    }

    _hideStatus() {
        if (this.statusEl) this.statusEl.classList.remove("visible");
        if (this.loaderEl) this.loaderEl.classList.remove("visible");
    }

    _updateFPS() {
        this.fpsCounter.frames++;
        const now = performance.now();
        const delta = now - this.fpsCounter.lastTime;
        if (delta >= 1000) {
            this.fpsCounter.fps = Math.round((this.fpsCounter.frames * 1000) / delta);
            this.fpsCounter.frames = 0;
            this.fpsCounter.lastTime = now;
            if (this.fpsEl) this.fpsEl.textContent = `${this.fpsCounter.fps} FPS`;
        }
    }

    destroy() {
        this._stopCamera();
        this.faceTracker.destroy();
        this.modelLoader.clearCache();
    }
}

// ─── Başlat ───
document.addEventListener("DOMContentLoaded", () => {
    const app = new VirtualTryOnApp();
    app.init();

    // Global erişim (debug)
    window.__tryOnApp = app;
});
