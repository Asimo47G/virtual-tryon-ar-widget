/**
 * modelLoader.js – 3D Model & PNG Overlay Yükleyici
 * GLB/GLTF ve şeffaf PNG desteği
 */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

export class ModelLoader {
    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.textureLoader = new THREE.TextureLoader();
        this.cache = new Map(); // model cache
    }

    /**
     * Ürün meta verisine göre model yükler
     * @param {object} product - { id, name, modelUrl, type, format }
     * @returns {Promise<THREE.Object3D>}
     */
    async load(product) {
        const cacheKey = product.id || product.modelUrl;

        // Cache kontrolü
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey).clone();
        }

        let model;

        if (product.format === "png" || product.modelUrl.endsWith(".png")) {
            model = await this._loadPNG(product);
        } else {
            model = await this._loadGLB(product);
        }

        // Meta verisini model'e ekle
        model.userData.productMeta = {
            type: product.type || "glasses",
            offsetY: product.offsetY || 0,
            offsetZ: product.offsetZ || 0,
            scaleFactor: product.scaleFactor || 1.0,
        };

        this.cache.set(cacheKey, model);
        return model.clone();
    }

    /**
     * GLB/GLTF model yükler
     */
    async _loadGLB(product) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                product.modelUrl,
                (gltf) => {
                    const model = gltf.scene;

                    // Materialları optimize et
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = false;
                            child.receiveShadow = false;

                            if (child.material) {
                                child.material.envMapIntensity = 0.5;
                                // Şeffaf materyaller
                                if (child.material.transparent) {
                                    child.material.depthWrite = false;
                                }
                            }
                        }
                    });

                    // Modeli merkeze al
                    const box = new THREE.Box3().setFromObject(model);
                    const center = box.getCenter(new THREE.Vector3());
                    model.position.sub(center);

                    // Gruplayarak döndür
                    const group = new THREE.Group();
                    group.add(model);

                    console.log(`[ModelLoader] GLB loaded: ${product.name}`);
                    resolve(group);
                },
                undefined,
                (error) => {
                    console.error(`[ModelLoader] GLB load error: ${product.name}`, error);
                    reject(error);
                }
            );
        });
    }

    /**
     * Şeffaf PNG'yi 2.5D plane olarak yükler
     */
    async _loadPNG(product) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                product.modelUrl,
                (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;

                    const aspect = texture.image.width / texture.image.height;
                    const geometry = new THREE.PlaneGeometry(aspect, 1);
                    const material = new THREE.MeshBasicMaterial({
                        map: texture,
                        transparent: true,
                        side: THREE.DoubleSide,
                        depthWrite: false,
                    });

                    const mesh = new THREE.Mesh(geometry, material);
                    const group = new THREE.Group();
                    group.add(mesh);

                    console.log(`[ModelLoader] PNG loaded: ${product.name}`);
                    resolve(group);
                },
                undefined,
                (error) => {
                    console.error(`[ModelLoader] PNG load error: ${product.name}`, error);
                    reject(error);
                }
            );
        });
    }

    /**
     * Birden fazla ürünü ön-yükler (cache warmer)
     * @param {Array} products
     */
    async preloadAll(products) {
        const promises = products.map((p) =>
            this.load(p).catch((err) => {
                console.warn(`[ModelLoader] Preload failed for ${p.name}:`, err);
                return null;
            })
        );
        await Promise.all(promises);
        console.log(`[ModelLoader] Preloaded ${products.length} models.`);
    }

    /**
     * Cache'i temizler
     */
    clearCache() {
        this.cache.forEach((model) => {
            model.traverse((child) => {
                if (child.isMesh) {
                    child.geometry?.dispose();
                    child.material?.dispose();
                }
            });
        });
        this.cache.clear();
    }
}
