// ===============================================
// Config: Refined Light Theme
// ===============================================
const CONFIG = {
    colors: [0x6366F1, 0xEC4899, 0x8B5CF6, 0x3B82F6],
    bgColor: 0xFFFFFF
};

// ===============================================
// 2. Logic & Animations
// ===============================================
function initLogic() {
    // Scroll Blur Effect
    const blurOverlay = document.getElementById('blur-overlay');
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        // Max opacity 0.9 at 600px scroll
        const alpha = Math.min(scrolled / 600, 0.9);
        if (blurOverlay) {
            blurOverlay.style.opacity = alpha;
        }
    });

    // Anime.js Stagger
    anime.timeline({ loop: false })
        .add({
            targets: '.hero-content > *',
            translateY: [30, 0],
            opacity: [0, 1],
            easing: "easeOutExpo",
            duration: 1200,
            delay: (el, i) => 200 + 100 * i
        });
}

// ===============================================
// 3. Three.js: Phone + Currencies
// ===============================================
class MainScene {
    constructor() {
        this.canvas = document.getElementById('webgl-canvas');
        if (!this.canvas) return;

        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.z = 10;

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.objects = [];
        this.mouse = new THREE.Vector2();

        this.initLights();
        this.createPhone();
        this.createCurrencies();

        this.addEvents();
        this.animate();
        this.updateLayout();
    }

    initLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.9);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);
    }

    createPhone() {
        // Simple Phone Model (Box with Textures)
        const w = 3.6, h = 7.2, d = 0.35;
        const geometry = new THREE.BoxGeometry(w, h, d);

        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x1E293B,
            roughness: 0.1,
            metalness: 0.8
        });

        // Create Screen Material using a CanvasTexture (Placeholder UI)
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        // Simple Gradient UI
        const grd = ctx.createLinearGradient(0, 0, 0, 1024);
        grd.addColorStop(0, '#6366F1');
        grd.addColorStop(1, '#8B5CF6');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 512, 1024);
        // Header
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(40, 60, 432, 100);
        ctx.fillRect(40, 200, 432, 300); // Chart placeholder
        ctx.fillRect(40, 540, 432, 60);  // Row
        ctx.fillRect(40, 620, 432, 60);  // Row

        const screenTex = new THREE.CanvasTexture(canvas);
        const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });

        // Materials Array: [Right, Left, Top, Bottom, Front, Back]
        const materials = [
            frameMat, frameMat, frameMat, frameMat,
            screenMat, // Front (Screen)
            frameMat   // Back
        ];

        this.phone = new THREE.Mesh(geometry, materials);
        this.scene.add(this.phone);

        // Notch
        const notch = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.5, 0.2, 4, 8),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        notch.rotation.z = Math.PI / 2;
        notch.position.set(0, h / 2 - 0.3, d / 2 + 0.01);
        this.phone.add(notch);

        // Initial Position
        this.phone.position.set(3.5, 0, 0); // Right side
        this.phone.rotation.y = -0.3;
    }

    createCurrencies() {
        // Helper to create texture from text
        const createSymbolTexture = (symbol, color) => {
            const canvas = document.createElement('canvas');
            canvas.width = 128; canvas.height = 128;
            const ctx = canvas.getContext('2d');

            // Background Circle
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(64, 64, 60, 0, Math.PI * 2);
            ctx.fill();

            // Text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 80px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(symbol, 64, 68);

            return new THREE.CanvasTexture(canvas);
        };

        const symbols = [
            { char: '$', color: '#10B981' }, // Green
            { char: '€', color: '#3B82F6' }, // Blue
            { char: '£', color: '#F59E0B' }, // Orange
            { char: 'Dz', color: '#EC4899' } // Pink
        ];

        const geometry = new THREE.CircleGeometry(0.6, 32);

        for (let i = 0; i < 12; i++) {
            const sym = symbols[i % symbols.length];
            const tex = createSymbolTexture(sym.char, sym.color);
            const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: false });

            const mesh = new THREE.Mesh(geometry, mat);

            // Scatter
            mesh.position.set(
                (Math.random() - 0.5) * 12,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 5
            );

            mesh.userData = {
                floatSpeed: 0.005 + Math.random() * 0.01,
                yOffset: mesh.position.y,
                phase: Math.random() * Math.PI * 2
            };

            this.objects.push(mesh);
            this.scene.add(mesh);
        }
    }

    addEvents() {
        window.addEventListener('resize', this.updateLayout.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
    }

    updateLayout() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        if (this.phone) {
            // Responsive Phone Position
            if (window.innerWidth > 1024) {
                this.phone.position.set(3.5, 0, 0);
                this.phone.visible = true;
            } else {
                this.phone.visible = false; // Hide on mobile if crowded
            }
        }
    }

    onMouseMove(e) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        const time = Date.now() * 0.001;
        const scroll = window.scrollY;

        // Phone Animation
        if (this.phone && this.phone.visible) {
            // Gentle Float
            this.phone.position.y = Math.sin(time) * 0.1;
            // Scroll Reaction (Rotate)
            this.phone.rotation.y = -0.3 + (scroll * 0.0005);
            // Mouse Look
            this.phone.rotation.x = this.mouse.y * 0.05;
        }

        // Currency Animation
        this.objects.forEach((mesh) => {
            // Float
            mesh.position.y = mesh.userData.yOffset + Math.sin(time + mesh.userData.phase) * 0.5;
            // Look at camera always (Billboard effect)
            mesh.lookAt(this.camera.position);
        });

        this.renderer.render(this.scene, this.camera);
    }
}

// Init
window.addEventListener('load', () => {
    initLogic();
    new MainScene();
    console.log("Refined Light Theme Loaded ✨");
});
