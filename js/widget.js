/**
 * widget.js – Embeddable Widget Wrapper
 * Tek <script> tag'ı ile herhangi bir siteye eklenir
 */

(function () {
    "use strict";

    const WIDGET_VERSION = "1.0.0";
    const WIDGET_BASE_URL = getBaseUrl();

    function getBaseUrl() {
        const scripts = document.getElementsByTagName("script");
        for (let i = scripts.length - 1; i >= 0; i--) {
            if (scripts[i].src && scripts[i].src.includes("widget.js")) {
                return scripts[i].src.replace(/widget\.js.*$/, "");
            }
        }
        return "./";
    }

    class TryOnWidget {
        constructor(config = {}) {
            this.config = {
                containerId: config.containerId || null,
                products: config.products || [],
                theme: config.theme || "dark",
                locale: config.locale || "tr",
                width: config.width || "100%",
                height: config.height || "600px",
                baseUrl: config.baseUrl || WIDGET_BASE_URL,
                ...config,
            };

            this.container = null;
            this.iframe = null;
        }

        /**
         * Widget'ı başlatır
         */
        mount(targetElement) {
            const target =
                targetElement ||
                (this.config.containerId
                    ? document.getElementById(this.config.containerId)
                    : null);

            if (!target) {
                console.error("[TryOn Widget] Target element not found.");
                return;
            }

            this.container = target;

            // iframe oluştur
            this.iframe = document.createElement("iframe");
            this.iframe.src = this.config.baseUrl + "index.html";
            this.iframe.style.width = this.config.width;
            this.iframe.style.height = this.config.height;
            this.iframe.style.border = "none";
            this.iframe.style.borderRadius = "16px";
            this.iframe.style.overflow = "hidden";
            this.iframe.allow = "camera; microphone";
            this.iframe.title = "Virtual Try-On";
            this.iframe.loading = "lazy";

            target.appendChild(this.iframe);

            // iframe yüklenince ürün listesini ilet
            this.iframe.addEventListener("load", () => {
                this._sendConfig();
            });

            console.log(`[TryOn Widget v${WIDGET_VERSION}] Mounted.`);
        }

        /**
         * Widget'a konfigürasyon gönderir
         */
        _sendConfig() {
            if (!this.iframe || !this.iframe.contentWindow) return;

            this.iframe.contentWindow.postMessage(
                {
                    type: "TRYON_CONFIG",
                    payload: {
                        products: this.config.products,
                        theme: this.config.theme,
                        locale: this.config.locale,
                    },
                },
                "*"
            );
        }

        /**
         * Widget'ı kaldırır
         */
        unmount() {
            if (this.iframe && this.container) {
                this.container.removeChild(this.iframe);
                this.iframe = null;
            }
        }
    }

    // ─── Auto-init: data attribute'lardan ───
    function autoInit() {
        const script = document.currentScript || (function () {
            const scripts = document.getElementsByTagName("script");
            return scripts[scripts.length - 1];
        })();

        if (!script) return;

        const containerId = script.getAttribute("data-container");
        const productsAttr = script.getAttribute("data-products");

        if (containerId) {
            let products = [];
            try {
                products = productsAttr ? JSON.parse(productsAttr) : [];
            } catch (e) {
                console.warn("[TryOn Widget] Invalid data-products JSON.");
            }

            // DOM hazır olunca mount et
            const init = () => {
                const widget = new TryOnWidget({
                    containerId,
                    products,
                });
                widget.mount();
            };

            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", init);
            } else {
                init();
            }
        }
    }

    // Global erişim
    window.TryOnWidget = TryOnWidget;

    // Auto-init
    autoInit();
})();
