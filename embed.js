/**
 * embed.js – Tek satır entegrasyon scripti
 * 
 * Kullanım:
 * <script src="https://cdn.example.com/embed.js" data-container="tryon-container"></script>
 * <div id="tryon-container"></div>
 */

(function () {
    "use strict";

    // Widget script yolunu bul
    var baseUrl = (function () {
        var scripts = document.getElementsByTagName("script");
        for (var i = scripts.length - 1; i >= 0; i--) {
            if (scripts[i].src && scripts[i].src.indexOf("embed.js") !== -1) {
                return scripts[i].src.replace(/embed\.js.*$/, "");
            }
        }
        return "./";
    })();

    // Widget script'ini yükle
    var widgetScript = document.createElement("script");
    widgetScript.src = baseUrl + "js/widget.js";

    // Orijinal script'in data attribute'larını kopyala
    var currentScript = document.currentScript || (function () {
        var scripts = document.getElementsByTagName("script");
        return scripts[scripts.length - 1];
    })();

    if (currentScript) {
        var attrs = currentScript.attributes;
        for (var i = 0; i < attrs.length; i++) {
            if (attrs[i].name.indexOf("data-") === 0) {
                widgetScript.setAttribute(attrs[i].name, attrs[i].value);
            }
        }
    }

    document.head.appendChild(widgetScript);
})();
