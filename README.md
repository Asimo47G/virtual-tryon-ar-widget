# 👓 Virtual Try-On – B2B AR Widget

**E-ticaret siteleri için tarayıcı tabanlı, gerçek zamanlı Artırılmış Gerçeklik (AR) aksesuar deneme widget'ı.**

Müşterileriniz kameralarını açarak gözlük, güneş gözlüğü, şapka ve küpe gibi aksesuarları gerçek zamanlı olarak yüzlerinde deneyebilirler. Tek satır kodla sitenize ekleyin, müşteri deneyiminizi dönüştürün.

---

## 🎯 B2B Avantajları

| Avantaj | Açıklama |
|---------|----------|
| 📈 **Dönüşüm Oranı Artışı** | Müşteriler denedikleri ürünü satın alma olasılığı %60 daha yüksek |
| 📉 **İade Oranı Düşüşü** | Ürünü önceden gören müşteriler %30 daha az iade yapıyor |
| ⚡ **Kolay Entegrasyon** | Tek satır kodla herhangi bir web sitesine eklenebilir |
| 🏋️ **Hafif (Lightweight)** | Sunucu tarafında işleme yok — tüm hesaplama tarayıcıda |
| 🔒 **Gizlilik Dostu** | Kamera verisi sunucuya gönderilmez, tamamen istemci tarafında |
| 📱 **Çoklu Cihaz** | Masaüstü ve mobil tarayıcılarda çalışır |

---

## 🛠️ Teknoloji Stack

- **Yüz Takibi:** [Google MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) – 468 adet 3D yüz noktası
- **3D Render:** [Three.js](https://threejs.org/) – WebGL tabanlı gerçek zamanlı render
- **Model Desteği:** GLB/GLTF (3D) ve şeffaf PNG (2.5D)
- **Bağımlılık:** Yalnızca CDN — npm, build veya sunucu gerekmez

---

## 🚀 Hızlı Başlangıç

### 1. Repo'yu Klonlayın

```bash
git clone https://github.com/YOUR_USERNAME/virtual-tryon.git
cd virtual-tryon
```

### 2. Yerel Sunucu Başlatın

Proje tamamen statik dosyalardan oluşur. Herhangi bir HTTP sunucusu kullanabilirsiniz:

```bash
# Python ile
python -m http.server 8000

# Node.js ile
npx serve .

# VS Code ile
# Live Server eklentisi kurulu ise "Go Live" butonuna tıklayın
```

### 3. Tarayıcıda Açın

```
http://localhost:8000
```

> ⚠️ **Not:** Kamera erişimi HTTPS veya `localhost` gerektirir. `file://` protokolü ile çalışmaz.

---

## 📦 Proje Yapısı

```
virtual-tryon/
├── index.html              ← Demo / ana sayfa
├── embed.js                ← Tek satır embed script
├── css/
│   └── style.css           ← Premium dark-mode tema
├── js/
│   ├── app.js              ← Ana uygulama (init, UI, render döngüsü)
│   ├── faceTracker.js      ← MediaPipe yüz takibi sarmalayıcı
│   ├── sceneManager.js     ← Three.js sahne ve koordinat dönüşüm
│   ├── modelLoader.js      ← GLB/GLTF ve PNG model yükleme
│   └── widget.js           ← iframe widget wrapper
├── assets/
│   └── models/             ← Örnek gözlük PNG'leri
├── .gitignore
└── README.md
```

---

## 🔌 E-Ticaret Sitenize Entegrasyon

### Yöntem 1: Tek Satır Embed (Önerilen)

Aşağıdaki kodu sitenizin istediğiniz sayfasına ekleyin:

```html
<!-- Virtual Try-On Widget -->
<div id="tryon-container"></div>
<script
  src="https://YOUR_CDN_URL/embed.js"
  data-container="tryon-container"
  data-products='[
    {"id":"g1","name":"Aviator","modelUrl":"glasses.png","type":"glasses","format":"png","scaleFactor":1.6}
  ]'>
</script>
```

### Yöntem 2: Programatik API

```html
<div id="tryon-widget"></div>
<script src="https://YOUR_CDN_URL/js/widget.js"></script>
<script>
  const widget = new TryOnWidget({
    containerId: 'tryon-widget',
    width: '100%',
    height: '700px',
    theme: 'dark',
    products: [
      {
        id: 'aviator-001',
        name: 'Aviator Classic',
        modelUrl: 'https://your-cdn.com/models/aviator.png',
        type: 'glasses',
        format: 'png',
        scaleFactor: 1.6
      }
    ]
  });
  widget.mount();
</script>
```

---

## 🎨 Ürün Ekleme Rehberi

### PNG Modelleri (2.5D — Önerilen Başlangıç)

1. Gözlüğün **şeffaf arka planlı, düz bakış açısından** PNG fotoğrafını hazırlayın
2. Boyut önerisi: **800×400 piksel** (yatay format)
3. Ürün objesine ekleyin:

```json
{
  "id": "glasses-001",
  "name": "Model Adı",
  "modelUrl": "assets/models/glasses.png",
  "type": "glasses",
  "format": "png",
  "scaleFactor": 1.5,
  "offsetY": 0.05
}
```

### 3D Modeller (GLB/GLTF)

1. Blender veya benzeri bir araçla GLB formatında dışa aktarın
2. Modelin **merkezi burun köprüsüne** denk gelmeli
3. Dosya boyutunu **2MB altında** tutun (Draco sıkıştırma önerilir)

```json
{
  "id": "glasses-3d",
  "name": "Premium 3D",
  "modelUrl": "assets/models/glasses.glb",
  "type": "glasses",
  "format": "glb",
  "scaleFactor": 1.0
}
```

### Desteklenen Aksesuar Tipleri

| Tip | `type` Değeri | Yerleşim |
|-----|--------------|----------|
| Gözlük / Güneş Gözlüğü | `glasses` | Burun köprüsü + göz hizası |
| Şapka / Bere | `hat` | Alın üstü |
| Küpe (Sol) | `earring_left` | Sol kulak altı |
| Küpe (Sağ) | `earring_right` | Sağ kulak altı |

---

## ⚙️ Yapılandırma Parametreleri

| Parametre | Tür | Varsayılan | Açıklama |
|-----------|------|-----------|----------|
| `scaleFactor` | number | `1.0` | Modelin büyüklük çarpanı |
| `offsetY` | number | `0` | Dikey konum ofseti (– yukarı, + aşağı) |
| `offsetZ` | number | `0` | Derinlik ofseti (kameraya yakınlık) |
| `type` | string | `"glasses"` | Aksesuar tipi |
| `format` | string | otomatik | `"png"` veya `"glb"` |

---

## 🌐 Tarayıcı Desteği

| Tarayıcı | Destek |
|----------|--------|
| Chrome 80+ | ✅ Tam |
| Edge 80+ | ✅ Tam |
| Firefox 78+ | ✅ Tam |
| Safari 14.1+ | ✅ Tam |
| iOS Safari 14.5+ | ✅ Tam |
| Android Chrome | ✅ Tam |

---

## 📄 Lisans

MIT License — Ticari ve kişisel kullanıma açıktır.

---

## 🤝 Katkıda Bulunma

1. Bu repo'yu **Fork** edin
2. Yeni bir **Branch** oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Değişikliklerinizi **Commit** edin (`git commit -m 'Yeni özellik eklendi'`)
4. Branch'inizi **Push** edin (`git push origin feature/yeni-ozellik`)
5. **Pull Request** açın

---

<p align="center">
  <strong>Virtual Try-On</strong> ile müşteri deneyiminizi geleceğe taşıyın 🚀
</p>
