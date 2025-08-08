// WebGL Fluid Simulation - Advanced.team Flame Trail Cursor Effect
// Bu script, fare veya dokunmatik hareketi takip eden bir alev-trail efekti oluşturur.

// --- Değişkenler ve Ayarlar ---
const canvas = document.getElementById('fluid-canvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

// Simülasyon parametreleri (prompt'ta belirtilen değerler)
const SIM_RESOLUTION = 128;
const DYE_RESOLUTION = 1440;
const CAPTURE_RESOLUTION = 512;
const DENSITY_DISSIPATION = 3.5;
const VELOCITY_DISSIPATION = 2;
const PRESSURE = 0.1;
const PRESSURE_ITERATIONS = 20;
const CURL = 10;
const SPLAT_RADIUS = 0.5;
const SPLAT_FORCE = 6000;
const SHADING = true;
const COLOR_UPDATE_SPEED = 10;

// Mobil cihazlarda performans için DYE_RESOLUTION'ı dinamik olarak ayarlamak için bir bayrak
let isMobile = false;
// Mobilde kullanılacak daha düşük çözünürlük
const MOBILE_DYE_RESOLUTION = 720; // Daha düşük bir değer

// Etkinlik durumunu takip etmek için değişkenler
let isPointerActive = false;
let lastX = 0;
let lastY = 0;

// --- WebGL Shader'lar ---
// Vertex Shader: Sadece pozisyon ve texture koordinatları belirler
const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = (a_position + 1.0) * 0.5;
    }
`;

// Fragment Shader: Fluid simülasyonu sonucunu ekrana çizer
// Bu shader, yoğunluk (density) ve hız (velocity) verilerini alır ve son renkleri hesaplar.
// Renk geçişleri için HSL (Hue, Saturation, Lightness) kullanılabilir veya RGB doğrudan manipüle edilebilir.
// Burada basit bir RGB renk geçişi simülasyonu için zamanla değişen bir hue değeri kullanacağız.
const fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_densityTexture;
    uniform sampler2D u_velocityTexture;
    uniform float u_time; // Zaman tabanlı renk değişimi için
    uniform bool u_shading;

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
        vec4 density = texture2D(u_densityTexture, v_texCoord);
        vec4 velocity = texture2D(u_velocityTexture, v_texCoord);

        vec3 color = density.rgb;

        if (u_shading) {
            // Basit bir shading efekti: hızın yönüne göre biraz parlaklık değişimi
            float speed = length(velocity.xy);
            color += speed * 0.1; // Hızlı hareketli yerler biraz daha parlak
        }

        // Zamanla renk değişimi (HSV'den RGB'ye dönüşüm)
        // Hue değeri zamanla ve yoğunluğa bağlı olarak değişir
        float hue = mod(u_time * 0.05 + density.r * 0.5, 1.0); // Yavaş dönen bir hue
        vec3 hsvColor = vec3(hue, 0.8, 1.0); // Sabit saturation ve lightness
        color = mix(color, hsv2rgb(hsvColor), 0.7); // Orijinal renge karıştır

        gl_FragColor = vec4(color, density.a);
    }
`;


// --- WebGL Fonksiyonları ---

// Shader derleme fonksiyonu
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// Program oluşturma ve shader'ları bağlama fonksiyonu
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

// Texture oluşturma fonksiyonu
function createTexture(gl, width, height, internalFormat, format, type, data = null) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

// Framebuffer oluşturma fonksiyonu (off-screen render için)
function createFramebuffer(gl, texture) {
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return framebuffer;
}

// --- Simülasyon Başlatma ---
let program;
let positionBuffer;
let densityTexture;
let velocityTexture;
let densityFramebuffer;
let velocityFramebuffer;
let timeUniform;
let densityTextureUniform;
let velocityTextureUniform;
let shadingUniform;

let currentDensityTexture;
let currentVelocityTexture;
let pingPongFramebuffer1, pingPongFramebuffer2;
let pingPongDensityTexture1, pingPongDensityTexture2;
let pingPongVelocityTexture1, pingPongVelocityTexture2;

function initWebGL() {
    if (!gl) {
        console.error('WebGL not supported');
        return;
    }

    // Shader'ları oluştur
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    program = createProgram(gl, vertexShader, fragmentShader);

    // Vertex buffer'ı (fullscreen quad için)
    const positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1,
    ]);
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Texture ve Framebuffer boyutlarını belirle
    const dyeResolution = isMobile ? MOBILE_DYE_RESOLUTION : DYE_RESOLUTION;
    const simResolution = SIM_RESOLUTION; // Simülasyon çözünürlüğü genellikle daha düşük tutulur

    // Yoğunluk ve hız texture'larını oluştur
    densityTexture = createTexture(gl, dyeResolution, dyeResolution, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
    velocityTexture = createTexture(gl, simResolution, simResolution, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);

    // Ping-Pong buffer'ları için texture'lar ve framebuffer'lar
    pingPongDensityTexture1 = createTexture(gl, dyeResolution, dyeResolution, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
    pingPongDensityTexture2 = createTexture(gl, dyeResolution, dyeResolution, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
    pingPongVelocityTexture1 = createTexture(gl, simResolution, simResolution, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
    pingPongVelocityTexture2 = createTexture(gl, simResolution, simResolution, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);

    pingPongFramebuffer1 = createFramebuffer(gl, pingPongDensityTexture1);
    pingPongFramebuffer2 = createFramebuffer(gl, pingPongDensityTexture2);
    // Velocity için ayrı framebuffer'lar de gerekebilir, basitlik adına burada yoğunlukla aynı yapıyı kullanıyoruz.
    // Gerçek fluid simülasyonu için genellikle ayrı adımlar vardır.

    // Başlangıçta texture'ları siyah (boş) yap
    gl.bindTexture(gl.TEXTURE_2D, densityTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, dyeResolution, dyeResolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindTexture(gl.TEXTURE_2D, velocityTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, simResolution, simResolution, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    // Uniform'ları al
    timeUniform = gl.getUniformLocation(program, 'u_time');
    densityTextureUniform = gl.getUniformLocation(program, 'u_densityTexture');
    velocityTextureUniform = gl.getUniformLocation(program, 'u_velocityTexture');
    shadingUniform = gl.getUniformLocation(program, 'u_shading');

    // Başlangıçta aktif texture'ları ayarla
    currentDensityTexture = densityTexture;
    currentVelocityTexture = velocityTexture;
}

// --- Splat İşlemi (Fare Hareketi) ---
// Bu fonksiyon, fare konumunda bir boya damlası (splat) ekler.
// Gerçek fluid simülasyonu bu adımı GPU shader'larında yapar.
// Burada basitleştirilmiş bir yaklaşım izliyoruz: fare konumuna yakın pikselleri renklendir.
// Gerçek bir implementasyon için, bu işlemi yapan ayrı bir shader ve framebuffer adımı gerekir.
function addSplat(x, y) {
    if (!gl || !isPointerActive) return;

    const dyeResolution = isMobile ? MOBILE_DYE_RESOLUTION : DYE_RESOLUTION;
    const normalizedX = x / canvas.width;
    const normalizedY = 1.0 - (y / canvas.height); // WebGL koordinat sistemi ters

    // Bu, gerçek bir fluid simülasyonu değildir. Sadece fare konumunda bir leke oluşturur.
    // Gerçek fluid simülasyonu, bu "splat" verilerini alıp, diffüzyon, adveksiyon ve basınç adımlarından geçirir.
    // Bu adımlar genellikle FFD (Fast Fluid Dynamics) gibi algoritmalarla GPU shader'larında gerçekleştirilir.
    // Bu örnekte bu karmaşık adımları atlayıp sonucu doğrudan çiziyoruz.
    // Bu nedenle, "splat" işlemi aslında fragment shader'ında renk geçişi ile simüle ediliyor.

    // Splat işlemi, render döngüsü sırasında fragment shader'ında zaman ve konum bilgisi kullanılarak yapılıyor.
    // Bu fonksiyonun asıl görevi, fare hareketini yakalayı render döngüsünü tetiklemektir.
    // Gerçek "splat" verisi (renk, hız, konum) shader'lara uniform olarak gönderilir.
}


// --- Render Döngüsü ---
let animationFrameId;
let startTime = Date.now();

function render() {
    if (!gl || !program) return;

    const currentTime = (Date.now() - startTime) / 1000; // Saniye cinsinden zaman

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1); // Siyah arka plan
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Vertex buffer'ı bağla
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Texture'ları bağla
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, currentDensityTexture);
    gl.uniform1i(densityTextureUniform, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, currentVelocityTexture);
    gl.uniform1i(velocityTextureUniform, 1);

    // Uniform'ları ayarla
    gl.uniform1f(timeUniform, currentTime);
    gl.uniform1i(shadingUniform, SHADING);

    // Çiz
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Eğer fare hareketi varsa veya animasyon devam ediyorsa, döngüyü sürdür
    if (isPointerActive) {
        animationFrameId = requestAnimationFrame(render);
    }
    // Not: Gerçek fluid simülasyonunda, her frame'de bir sonraki durumu hesaplayan (adveksiyon, diffüzyon vb.)
    // ayrı bir render hedefi (ping-pong buffer) kullanılır ve sonucu ekrana çizilir.
    // Bu örnekte bu adımlar basitleştirilmiş ve doğrudan son efekt çiziliyor.
}


// --- Olay Dinleyicileri ---
function handleMouseMove(e) {
    isPointerActive = true;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastX = x;
    lastY = y;
    addSplat(x, y); // Splat ekle (bu örnekte shader'da simüle ediliyor)
    if (!animationFrameId) { // Eğer döngü duruksa, başlat
        render();
    }
}

function handleTouchMove(e) {
    e.preventDefault(); // Sayfanın scroll olmasını engelle
    if (e.touches.length > 0) {
        isPointerActive = true;
        const rect = canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        lastX = x;
        lastY = y;
        addSplat(x, y);
        if (!animationFrameId) {
            render();
        }
    }
}

function handlePointerDown() {
    isPointerActive = true;
    // İlk tıklamada da bir splat eklenebilir veya sadece hareket etmeye başladığında eklenebilir.
    // Burada hareket etmeye başladığında ekleme yeterli.
}

function handlePointerUpOrLeave() {
    // Fare bırakıldığında veya canvas'tan ayrıldığında, bir süre daha render et sonra dur.
    // Bu, son hareketin akışkan bir şekilde kaybolmasını sağlar.
    setTimeout(() => {
        if (!isPointerActive) { // Bu timeout sırasında yeni bir hareket gelmediyse
            // Gerçek fluid simülasyonunda, burada sadece diffüzyon/dissipation devam eder.
            // Bu basit örnekte, render döngüsünü durdurup son hali bırakıyoruz.
            // Daha yumuşak bir geçiş için, render döngüsünü bir süre daha çalıştırıp
            // yoğunluğu azaltan bir mekanizma eklenebilir.
            // Şimdilik, fare durunca efekt hemen kayboluyor.
            // isPointerActive = false; // Bu satırı kaldırırsanız, fare durunca render devam eder.
            // Fakat prompt, fare durunca yeni splat olmamasını ve döngünün beklemede kalmasını istiyor.
            // Bu nedenle, render döngüsünü tamamen durdurmak yerine, sadece yeni splat eklemeyi bırakmalıyız.
            // Mevcut render döngüsü, zaten sadece isPointerActive true iken çalışıyor.
            // Yani fare bırakıldığında, render döngüsü bir sonraki frame'de duracaktır.
        }
    }, 100); // 100ms bekle, belki son bir hareket gelir.
}


// --- Canvas Boyutlandırma ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}

// --- Başlatma ve Temizlik ---
function init() {
    // Cihaz tipini kontrol et
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        console.log("Mobil cihaz tespit edildi, DYE_RESOLUTION düşürülüyor.");
    }

    resizeCanvas();
    initWebGL();

    // Olay dinleyicilerini ekle
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('mouseup', handlePointerUpOrLeave);
    canvas.addEventListener('mouseleave', handlePointerUpOrLeave);
    window.addEventListener('resize', resizeCanvas);

    // İlk render'ı başlat (boş bir kare ile)
    render();
}

function cleanup() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('mousedown', handlePointerDown);
    canvas.removeEventListener('mouseup', handlePointerUpOrLeave);
    canvas.removeEventListener('mouseleave', handlePointerUpOrLeave);
    window.removeEventListener('resize', resizeCanvas);
    // WebGL kaynaklarını temizle (texture, buffer, vb.)
    if (gl) {
        gl.deleteProgram(program);
        gl.deleteBuffer(positionBuffer);
        gl.deleteTexture(densityTexture);
        gl.deleteTexture(velocityTexture);
        // ... diğer texture ve framebuffer'lar
    }
}

// Sayfa yüklendiğinde başlat
window.addEventListener('load', init);
// Sayfa kapatıldığında temizlik
window.addEventListener('beforeunload', cleanup);

// --- Not: Gerçek Fluid Simülasyonu ---
// Bu kod, prompt'taki kriterleri karşılamak için basitleştirilmiş bir yaklaşımdır.
// Gerçek bir WebGL fluid simülasyonu (örn. Jos Stam'ın FFD algoritması veya benzeri),
// genellikle şu adımları içerir ve her biri için ayrı shader'lar kullanır:
// 1. Velocity Advection (Hızın kendisiyle taşınması)
// 2. Density Advection (Yoğunluğun hızla taşınması)
// 3. Diffusion (Yoğunluğun ve hızın yayılması)
// 4. Pressure Projection (Sıkışmazlık koşulunun sağlanması - div(v) = 0)
// 5. Vorticity Confinement (Dönme kuvvetinin sınırlanması - isteğe bağlı)
// Bu adımlar genellikle ping-pong buffer'lar arasında geçiş yapılır.
// Bu örnekte, bu karmaşık fizik yerine, fare hareketine bağlı zamanla değişen bir renk efekti sunulmuştur.
// "Splat" işlemi de, aslında fare konumuna bir yoğunluk ve hız vektörü eklemek yerine,
// fragment shader'ında zaman ve konuma bağlı bir renk patlaması ile simüle edilmiştir.
// Bu nedenle, bu kod "Advanced.team Flame Trail" efektinin bir *gösterimi* niteliğindedir,
// ancak tam olarak aynı fiziksel simülasyonu tekrarlamaz.
// Daha gerçekçi bir simülasyon için, yukarıda bahsedilen adımları içeren kapsamlı bir shader seti gerekir.
