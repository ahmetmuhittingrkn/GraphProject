document.addEventListener('DOMContentLoaded', function() {
    // Yükleme ekranını göster
    const loadingElement = document.getElementById('loading');
    const loadingProgressElement = document.getElementById('loading-progress');
    
    // Canvas ve engine ayarları
    const canvas = document.getElementById('renderCanvas');
    const engine = new BABYLON.Engine(canvas, true);
    
    // Global değişkenler
    let scene, camera, light, ambientLight;
    let ground, walls = [];
    let selectedFurnitureType = null; // Seçilen mobilya tipi (sofa, chair, table, lamp)
    let selectedFurniture = null;     // Seçilen mobilya nesnesi (TransformNode)
    let highlightMesh = null;        // Seçili mobilyayı vurgulamak için mesh
    let placementMode = false;
    let furnitureModels = {};
    let totalAssets = 8; // Yüklenecek toplam varlık sayısı
    let loadedAssets = 0;
    let shadowGenerator;
    
    // Yükleme zaman aşımı kontrolü
    let loadingTimeout = setTimeout(() => {
        console.warn("Yükleme zaman aşımına uğradı, uygulama başlatılıyor.");
        loadingElement.style.display = 'none';
    }, 15000); // 15 saniye sonra zorunlu yükleme bitirme
    
    // Sahne oluşturma fonksiyonu
    const createScene = function() {
        // Yeni sahne oluştur
        const newScene = new BABYLON.Scene(engine);
        newScene.clearColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        
        // Kamera oluştur
        // Kamera oluştur (düzeltilmiş konum)
        // Kamera konumunu Minecraft tarzında ayarla
        // Kamera oluştur - Don't Starve tarzı izometrik
        // Alternatif kamera ayarı (daha fazla izometrik açı için)
        // Kamera oluştur - Don't Starve tarzı izometrik
        // Kamera oluştur - içeriden Don't Starve tarzı izometrik
        camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(-3, 4, -3), newScene); // Odanın içinde köşe pozisyonu
        camera.setTarget(new BABYLON.Vector3(1, 0, 1)); // Odanın merkezine yakın bir yer
        camera.attachControl(canvas, true);
        camera.speed = 0.2;
        camera.angularSensibility = 4000;
        
        // Yerçekimi ve çarpışma kontrolü
        camera.applyGravity = true;
        camera.ellipsoid = new BABYLON.Vector3(0.5, 0.9, 0.5);
        camera.checkCollisions = true;
        
        // Işık kaynakları
        light = new BABYLON.PointLight('mainLight', new BABYLON.Vector3(0, 3, 0), newScene);
        light.intensity = 1.0;
        light.diffuse = new BABYLON.Color3(1, 0.95, 0.85);
        light.specular = new BABYLON.Color3(1, 1, 1);
        
        ambientLight = new BABYLON.HemisphericLight('ambientLight', new BABYLON.Vector3(0, 1, 0), newScene);
        ambientLight.intensity = 0.5;
        ambientLight.diffuse = new BABYLON.Color3(0.8, 0.8, 0.8);
        
        // Zemin oluştur
        ground = BABYLON.MeshBuilder.CreateGround('ground', {width: 10, height: 10}, newScene);
        let groundMaterial = new BABYLON.StandardMaterial('groundMat', newScene);
        groundMaterial.diffuseTexture = new BABYLON.Texture('textures/floor.jpg', newScene, false, false, null, assetLoaded);
        groundMaterial.diffuseTexture.uScale = 4;
        groundMaterial.diffuseTexture.vScale = 4;
        groundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        ground.material = groundMaterial;
        ground.checkCollisions = true;
        ground.receiveShadows = true;
        
        // Işık ve gölge ayarları
        shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 32;
        
        return newScene;
    };
    
    function createWalls() {
    // İki taraflı duvar materyali oluştur
    let wallMaterial = new BABYLON.StandardMaterial('wallMat', scene);
    wallMaterial.diffuseTexture = new BABYLON.Texture('textures/wall.jpg', scene, false, false, null, assetLoaded);
    wallMaterial.diffuseTexture.uScale = 2;
    wallMaterial.diffuseTexture.vScale = 1;
    wallMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    wallMaterial.backFaceCulling = false; // Çift taraflı görüntüleme için
    
    // Duvarlar için boyutlar
    const roomWidth = 10; 
    const roomDepth = 10;
    const roomHeight = 5; // Yüksekliği 3'ten 5'e çıkardık
    
    // Duvarları mesh kullanarak oluşturalım (düzlemler yerine kutular)
    
    // Arka duvar
    let backWall = BABYLON.MeshBuilder.CreateBox('backWall', {
        width: roomWidth,
        height: roomHeight,
        depth: 0.1
    }, scene);
    backWall.position = new BABYLON.Vector3(0, roomHeight/2, roomDepth/2);
    backWall.material = wallMaterial;
    backWall.checkCollisions = true;
    walls.push(backWall);
    
    // Sol duvar
    let leftWall = BABYLON.MeshBuilder.CreateBox('leftWall', {
        width: 0.1,
        height: roomHeight,
        depth: roomDepth
    }, scene);
    leftWall.position = new BABYLON.Vector3(-roomWidth/2, roomHeight/2, 0);
    leftWall.material = wallMaterial;
    leftWall.checkCollisions = true;
    walls.push(leftWall);
    
    // Sağ duvar
    let rightWall = BABYLON.MeshBuilder.CreateBox('rightWall', {
        width: 0.1,
        height: roomHeight,
        depth: roomDepth
    }, scene);
    rightWall.position = new BABYLON.Vector3(roomWidth/2, roomHeight/2, 0);
    rightWall.material = wallMaterial;
    rightWall.checkCollisions = true;
    walls.push(rightWall);
    
    // Ön duvar (kapılı)
    // Önce sol taraf
    let frontWallLeft = BABYLON.MeshBuilder.CreateBox('frontWallLeft', {
        width: roomWidth/2 - 1, // Kapı genişliğinin yarısı kadar eksilttik
        height: roomHeight,
        depth: 0.1
    }, scene);
    frontWallLeft.position = new BABYLON.Vector3(-roomWidth/4 - 0.5, roomHeight/2, -roomDepth/2);
    frontWallLeft.material = wallMaterial;
    frontWallLeft.checkCollisions = true;
    walls.push(frontWallLeft);
    
    // Ön duvar sağ taraf
    let frontWallRight = BABYLON.MeshBuilder.CreateBox('frontWallRight', {
        width: roomWidth/2 - 1, // Kapı genişliğinin yarısı kadar eksilttik
        height: roomHeight,
        depth: 0.1
    }, scene);
    frontWallRight.position = new BABYLON.Vector3(roomWidth/4 + 0.5, roomHeight/2, -roomDepth/2);
    frontWallRight.material = wallMaterial;
    frontWallRight.checkCollisions = true;
    walls.push(frontWallRight);
    
    // Kapı üstü
    let doorTop = BABYLON.MeshBuilder.CreateBox('doorTop', {
        width: 2,
        height: roomHeight - 2.5, // Kapı yüksekliği
        depth: 0.1
    }, scene);
    doorTop.position = new BABYLON.Vector3(0, roomHeight - (roomHeight - 2.5)/2, -roomDepth/2);
    doorTop.material = wallMaterial;
    doorTop.checkCollisions = true;
    walls.push(doorTop);
    
    // Tavan
    let ceiling = BABYLON.MeshBuilder.CreateBox('ceiling', {
        width: roomWidth,
        height: 0.1,
        depth: roomDepth
    }, scene);
    ceiling.position = new BABYLON.Vector3(0, roomHeight, 0);
    
    let ceilingMaterial = new BABYLON.StandardMaterial('ceilingMat', scene);
    ceilingMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9); // Açık renk
    ceilingMaterial.backFaceCulling = false;
    ceiling.material = ceilingMaterial;
    walls.push(ceiling);
    
    let tvGroup = new BABYLON.TransformNode("tvGroup", scene);


    // Kapı eklemek için fonksiyon - createWalls() fonksiyonu içine ekleyin
function addDoor() {
    // Kapı grubu oluştur
    let doorGroup = new BABYLON.TransformNode("doorGroup", scene);
    
    // Kapı materyal
    let doorMaterial = new BABYLON.StandardMaterial("doorMaterial", scene);
    doorMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1); // Koyu ahşap rengi
    
    // Kapı kolu materyali
    let handleMaterial = new BABYLON.StandardMaterial("handleMaterial", scene);
    handleMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.1); // Altın/pirinç rengi
    
    // Kapı çerçevesi materyali
    let frameMaterial = new BABYLON.StandardMaterial("frameMaterial", scene);
    frameMaterial.diffuseColor = new BABYLON.Color3(0.35, 0.18, 0.08); // Koyu ahşap çerçeve
    
    // Ana kapı paneli
    let door = BABYLON.MeshBuilder.CreateBox("doorPanel", {
        width: 1.8,
        height: 2.4,
        depth: 0.08
    }, scene);
    door.parent = doorGroup;
    door.material = doorMaterial;
    
    // Kapı çerçevesi - üst kısım
    let topFrame = BABYLON.MeshBuilder.CreateBox("topFrame", {
        width: 2.2,
        height: 0.12,
        depth: 0.12
    }, scene);
    topFrame.parent = doorGroup;
    topFrame.position.y = 1.26; // Kapı yüksekliğinin yarısı + çerçeve kalınlığının yarısı
    topFrame.material = frameMaterial;
    
    // Sol çerçeve
    let leftFrame = BABYLON.MeshBuilder.CreateBox("leftFrame", {
        width: 0.12,
        height: 2.64, // Kapı yüksekliği + üst çerçeve yüksekliği
        depth: 0.12
    }, scene);
    leftFrame.parent = doorGroup;
    leftFrame.position.x = -1.04; // Kapı genişliğinin yarısı + çerçeve genişliğinin yarısı
    leftFrame.material = frameMaterial;
    
    // Sağ çerçeve
    let rightFrame = BABYLON.MeshBuilder.CreateBox("rightFrame", {
        width: 0.12,
        height: 2.64,
        depth: 0.12
    }, scene);
    rightFrame.parent = doorGroup;
    rightFrame.position.x = 1.04; // Kapı genişliğinin yarısı + çerçeve genişliğinin yarısı
    rightFrame.material = frameMaterial;
    
    // Kapı kolu
    let doorHandle = BABYLON.MeshBuilder.CreateCylinder("doorHandle", {
        height: 0.04,
        diameter: 0.08,
        tessellation: 16
    }, scene);
    doorHandle.parent = doorGroup;
    doorHandle.rotation.x = Math.PI/2;
    doorHandle.position = new BABYLON.Vector3(0.7, 0, 0.08); // Kapının sağ tarafına
    doorHandle.material = handleMaterial;
    
    // Kapı topuzu/kolu bağlantısı
    let handleConnector = BABYLON.MeshBuilder.CreateBox("handleConnector", {
        width: 0.04,
        height: 0.04,
        depth: 0.06
    }, scene);
    handleConnector.parent = doorGroup;
    handleConnector.position = new BABYLON.Vector3(0.7, 0, 0.04);
    handleConnector.material = handleMaterial;
    
    // Kapıyı konumlandır - giriş boşluğunun ortasında
    doorGroup.position = new BABYLON.Vector3(0, 1.2, -roomDepth/2 + 0.05); // Zemin seviyesinden biraz yukarı
    
    console.log("Giriş kapısı eklendi");
    
    return doorGroup;
}

// Kapıyı ekle
let door = addDoor();

function addOpenableWindow(position, width, height, frameDepth, sashDepth) {
    const halfW = width / 2;
    
    // Materyaller
    const frameMat = new BABYLON.StandardMaterial("frameMat", scene);
    frameMat.diffuseColor = new BABYLON.Color3(0.45, 0.28, 0.12);

    const glassMat = new BABYLON.StandardMaterial("glassMat", scene);
    glassMat.diffuseColor = new BABYLON.Color3(0.8, 0.9, 1);
    glassMat.alpha = 0.6; // Daha az şeffaf yaptık
    glassMat.backFaceCulling = false;

    const viewMat = new BABYLON.StandardMaterial("viewMat", scene);
    viewMat.diffuseTexture = new BABYLON.Texture("textures/window_view.jpg", scene);
    viewMat.backFaceCulling = false;

    // Grup
    const winGroup = new BABYLON.TransformNode("openableWindow", scene);
    winGroup.position = position;
    winGroup.rotation.y = Math.PI / 2;

    // Çerçeve
    const frame = BABYLON.MeshBuilder.CreateBox("winFrame", {
        width: width + 0.1,
        height: height + 0.1,
        depth: frameDepth
    }, scene);
    frame.parent = winGroup;
    frame.material = frameMat;
    frame.isPickable = false;

    // Sol kanat (CAM) - Daha öne çıkar, daha kalın
    const leftSash = BABYLON.MeshBuilder.CreateBox("leftSash", {
        width: halfW - 0.01,
        height: height - 0.02,
        depth: sashDepth + 0.03 // Daha kalın yap
    }, scene);
    leftSash.parent = winGroup;
    leftSash.material = glassMat;
    leftSash.position.x = -halfW / 2;
    leftSash.position.z = (frameDepth + sashDepth) / 2 + 0.1; // Çok daha öne çıkar
    
    // SOL KANAT: Sol kenarından dönmeli (negatif x tarafında pivot)
    leftSash.setPivotPoint(new BABYLON.Vector3(-halfW / 2, 0, 0));
    leftSash.isPickable = true;
    leftSash.isOpen = false;

    // Sağ kanat (CAM) - Daha öne çıkar, daha kalın
    const rightSash = BABYLON.MeshBuilder.CreateBox("rightSash", {
        width: halfW - 0.01,
        height: height - 0.02,
        depth: sashDepth + 0.03 // Daha kalın yap
    }, scene);
    rightSash.parent = winGroup;
    rightSash.material = glassMat;
    rightSash.position.x = halfW / 2;
    rightSash.position.z = (frameDepth + sashDepth) / 2 + 0.1; // Çok daha öne çıkar
    
    // SAĞ KANAT: Sağ kenarından dönmeli (pozitif x tarafında pivot)
    rightSash.setPivotPoint(new BABYLON.Vector3(halfW / 2, 0, 0));
    rightSash.isPickable = true;
    rightSash.isOpen = false;

    // Manzara (arka plan)
    const outsideView = BABYLON.MeshBuilder.CreatePlane("outsideView", {
        width: width,
        height: height
    }, scene);
    outsideView.parent = winGroup;
    outsideView.position.z = -frameDepth / 2 - 0.01;
    outsideView.material = viewMat;
    outsideView.isPickable = false;

    // Global referanslar oluştur (dışarıdan erişim için)
    window.leftSashRef = leftSash;
    window.rightSashRef = rightSash;

    // Animasyon fonksiyonu (global)
    window.toggleSash = function(sash, dir) {
        const from = sash.rotation.y;
        const to = sash.isOpen ? 0 : Math.PI / 2 * dir;
        sash.isOpen = !sash.isOpen;
        
        const anim = new BABYLON.Animation(
            sash.name + "Anim",
            "rotation.y",
            60, 
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        anim.setKeys([
            { frame: 0, value: from },
            { frame: 30, value: to } // Biraz daha yavaş animasyon
        ]);
        
        sash.animations = [anim];
        scene.beginAnimation(sash, 0, 30, false);
        
        console.log(sash.name + " açıldı/kapandı. Yeni durum:", sash.isOpen ? "Açık" : "Kapalı");
    };

    // Sol kanat ActionManager - İçe doğru açılır
    leftSash.actionManager = new BABYLON.ActionManager(scene);
    leftSash.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPickTrigger, function () {
            console.log("Sol kanat tıklandı!");
            toggleSash(leftSash, -1); // Sol kanat içe doğru açılır
        }
    ));

    // Sağ kanat ActionManager - İçe doğru açılır
    rightSash.actionManager = new BABYLON.ActionManager(scene);
    rightSash.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPickTrigger, function () {
            console.log("Sağ kanat tıklandı!");
            toggleSash(rightSash, 1); // Sağ kanat içe doğru açılır
        }
    ));

    // Hover efekti ekleyelim (isteğe bağlı)
    const highlightMat = new BABYLON.StandardMaterial("highlightMat", scene);
    highlightMat.diffuseColor = new BABYLON.Color3(1, 1, 0.8);
    highlightMat.alpha = 0.7;
    highlightMat.backFaceCulling = false;

    // Mouse hover efektleri
    leftSash.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPointerOverTrigger, function () {
            leftSash.material = highlightMat;
        }
    ));
    leftSash.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPointerOutTrigger, function () {
            leftSash.material = glassMat;
        }
    ));

    rightSash.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPointerOverTrigger, function () {
            rightSash.material = highlightMat;
        }
    ));
    rightSash.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPointerOutTrigger, function () {
            rightSash.material = glassMat;
        }
    ));

    console.log("Açılabilir pencere oluşturuldu!");
    console.log("Sol kanat:", leftSash.name, "pickable:", leftSash.isPickable);
    console.log("Sağ kanat:", rightSash.name, "pickable:", rightSash.isPickable);
    console.log("Global referanslar:", window.leftSashRef ? "✓" : "✗", window.rightSashRef ? "✓" : "✗");

    return winGroup;
}

// Pencereyi oluştururken:
addOpenableWindow(
    new BABYLON.Vector3(roomWidth/2 - 0.06, 1.7, 0),
    2.0,   // genişlik
    1.8,   // yükseklik
    0.1,   // çerçeve kalınlığı
    0.05   // kanat kalınlığı
);

// TV ekranı için materyal 
let tvScreenMaterial = new BABYLON.StandardMaterial("tvScreenMat", scene);
let tvTexture = new BABYLON.Texture("textures/tv.jpg", scene); // tv.jpg texture'ı
tvScreenMaterial.diffuseTexture = tvTexture;
tvScreenMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Hafif parlaklık

// TV çerçevesi için materyal
let tvFrameMaterial = new BABYLON.StandardMaterial("tvFrameMat", scene);
tvFrameMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Siyah

// TV çerçevesi (3D görünüm için)
let tvFrame = BABYLON.MeshBuilder.CreateBox("tvFrame", {
    width: 2.2,
    height: 1.5,
    depth: 0.1
}, scene);
tvFrame.parent = tvGroup;
tvFrame.material = tvFrameMaterial;

// TV ekranı (texture'lı kısım)
let tvScreen = BABYLON.MeshBuilder.CreatePlane("tvScreen", {
    width: 2,
    height: 1.3
}, scene);
tvScreen.parent = tvGroup;
tvScreen.position.z = 0.06; // Çerçevenin önüne
tvScreen.material = tvScreenMaterial;

// TV altlığı/standı
let tvStand = BABYLON.MeshBuilder.CreateBox("tvStand", {
    width: 0.6,
    height: 0.1,
    depth: 0.3
}, scene);
tvStand.parent = tvGroup;
tvStand.position.y = -0.8; // TV'nin altında
tvStand.material = tvFrameMaterial;

// TV'yi pencereyle aynı yere konumlandır
tvGroup.position = new BABYLON.Vector3(0, 1.5, roomDepth/2 - 0.05);

// Gelişmiş tablo ekleme fonksiyonu
function addBeautifulPainting(positionX, positionY, positionZ, rotationY, width, height, paintingType, frameName) {
    console.log(`Tablo oluşturuluyor: ${frameName}, tip: ${paintingType}`);
    
    // Tablo grubu oluştur
    let paintingGroup = new BABYLON.TransformNode(frameName + "_group", scene);
    
    // Çerçeve materyal - daha güzel ahşap görünüm
    let frameMaterial = new BABYLON.StandardMaterial(frameName + "_frame_material", scene);
    frameMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.15, 0.05); // Koyu ahşap
    frameMaterial.specularColor = new BABYLON.Color3(0.1, 0.05, 0.02);
    frameMaterial.roughness = 0.8;
    
    // Resim materyali
    let paintingMaterial = new BABYLON.StandardMaterial(frameName + "_material", scene);
    
    // Farklı tablo türleri
    if (paintingType === "abstract") {
        // Soyut sanat - vibrant renkler
        paintingMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.4);
        paintingMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.05, 0.1);
    } else if (paintingType === "landscape") {
        // Manzara - doğa renkleri
        paintingMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.3);
        paintingMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.05);
    } else if (paintingType === "portrait") {
        // Portre - sıcak tonlar
        paintingMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.5, 0.3);
        paintingMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.08, 0.05);
    } else if (paintingType === "modern") {
        // Modern art - cool tonlar
        paintingMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8);
        paintingMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.08, 0.15);
    }
    
    // Texture yüklemeyi dene
    let texturePath = `textures/${frameName}.jpg`;
    try {
        console.log(`${frameName} için texture yükleme denemesi: ${texturePath}`);
        let texture = new BABYLON.Texture(texturePath, scene, true, false);
        texture.onLoadObservable.add(() => {
            console.log(`${frameName} texture başarıyla yüklendi!`);
            paintingMaterial.diffuseTexture = texture;
        });
        texture.onErrorObservable.add(() => {
            console.log(`${frameName} texture yüklenemedi, prosedürel pattern kullanılıyor`);
            createProceduralPainting(paintingMaterial, paintingType, frameName);
        });
    } catch (e) {
        console.log(`${frameName} texture yüklenemedi, prosedürel pattern oluşturuluyor:`, e);
        createProceduralPainting(paintingMaterial, paintingType, frameName);
    }
    
    // Dış çerçeve (kalın)
    let outerFrame = BABYLON.MeshBuilder.CreateBox(frameName + "_outer_frame", {
        width: width + 0.4,
        height: height + 0.4,
        depth: 0.12
    }, scene);
    outerFrame.parent = paintingGroup;
    outerFrame.material = frameMaterial;
    
    // İç çerçeve (ince)
    let innerFrame = BABYLON.MeshBuilder.CreateBox(frameName + "_inner_frame", {
        width: width + 0.1,
        height: height + 0.1,
        depth: 0.06
    }, scene);
    innerFrame.parent = paintingGroup;
    innerFrame.position.z = 0.03;
    let innerFrameMaterial = new BABYLON.StandardMaterial(frameName + "_inner_frame_material", scene);
    innerFrameMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.7, 0.5); // Altın rengi
    innerFrameMaterial.specularColor = new BABYLON.Color3(0.9, 0.8, 0.6);
    innerFrame.material = innerFrameMaterial;
    
    // Resim içeriği
    let painting = BABYLON.MeshBuilder.CreateBox(frameName + "_painting", {
        width: width,
        height: height,
        depth: 0.02
    }, scene);
    painting.parent = paintingGroup;
    painting.position.z = 0.08;
    painting.material = paintingMaterial;
    
    // Konumlandırma
    paintingGroup.position = new BABYLON.Vector3(positionX, positionY, positionZ);
    paintingGroup.rotation.y = rotationY;
    
    // Gölge ekleme
    if (shadowGenerator) {
        shadowGenerator.addShadowCaster(outerFrame);
        shadowGenerator.addShadowCaster(innerFrame);
        shadowGenerator.addShadowCaster(painting);
        outerFrame.receiveShadows = true;
        innerFrame.receiveShadows = true;
        painting.receiveShadows = true;
    }
    
    console.log(`Tablo başarıyla eklendi: ${frameName}`);
    return paintingGroup;
}

// Prosedürel tablo deseni oluşturma
function createProceduralPainting(material, paintingType, frameName) {
    // Dynamic texture oluştur
    let dynamicTexture = new BABYLON.DynamicTexture(frameName + "_dynamic", {width: 512, height: 512}, scene);
    let context = dynamicTexture.getContext();
    
    // Canvas boyutları
    let width = 512;
    let height = 512;
    
    if (paintingType === "abstract") {
        // Soyut sanat deseni
        let gradient = context.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#FF6B6B');
        gradient.addColorStop(0.3, '#4ECDC4');
        gradient.addColorStop(0.6, '#45B7D1');
        gradient.addColorStop(1, '#96CEB4');
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
        
        // Geometrik şekiller ekle
        for (let i = 0; i < 8; i++) {
            context.fillStyle = `hsl(${Math.random() * 360}, 70%, 60%)`;
            context.fillRect(
                Math.random() * width * 0.8,
                Math.random() * height * 0.8,
                50 + Math.random() * 100,
                50 + Math.random() * 100
            );
        }
        
    } else if (paintingType === "landscape") {
        // Manzara deseni
        // Gökyüzü
        let skyGradient = context.createLinearGradient(0, 0, 0, height/2);
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(1, '#E0F6FF');
        context.fillStyle = skyGradient;
        context.fillRect(0, 0, width, height/2);
        
        // Dağlar
        context.fillStyle = '#8B7355';
        context.beginPath();
        context.moveTo(0, height/2);
        for (let x = 0; x < width; x += 20) {
            context.lineTo(x, height/2 - Math.random() * 80);
        }
        context.lineTo(width, height/2);
        context.fill();
        
        // Zemin
        let groundGradient = context.createLinearGradient(0, height/2, 0, height);
        groundGradient.addColorStop(0, '#90EE90');
        groundGradient.addColorStop(1, '#228B22');
        context.fillStyle = groundGradient;
        context.fillRect(0, height/2, width, height/2);
        
    } else if (paintingType === "portrait") {
        // Portre tarzı
        let gradient = context.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
        gradient.addColorStop(0, '#F4A460');
        gradient.addColorStop(0.5, '#DEB887');
        gradient.addColorStop(1, '#8B4513');
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
        
        // Basit yüz şekli
        context.fillStyle = '#FDBCB4';
        context.beginPath();
        context.ellipse(width/2, height/2, 80, 100, 0, 0, 2 * Math.PI);
        context.fill();
        
    } else if (paintingType === "modern") {
        // Modern art
        context.fillStyle = '#2C3E50';
        context.fillRect(0, 0, width, height);
        
        // Geometrik çizgiler
        context.strokeStyle = '#E74C3C';
        context.lineWidth = 8;
        for (let i = 0; i < 6; i++) {
            context.beginPath();
            context.moveTo(Math.random() * width, Math.random() * height);
            context.lineTo(Math.random() * width, Math.random() * height);
            context.stroke();
        }
        
        // Renkli daireler
        for (let i = 0; i < 5; i++) {
            context.fillStyle = `hsl(${Math.random() * 360}, 80%, 60%)`;
            context.beginPath();
            context.arc(
                Math.random() * width,
                Math.random() * height,
                20 + Math.random() * 40,
                0, 2 * Math.PI
            );
            context.fill();
        }
    }
    
    dynamicTexture.update();
    material.diffuseTexture = dynamicTexture;
    material.emissiveTexture = dynamicTexture;
    material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
}

// Güzel tablolar ekleme
addBeautifulPainting(
    -2.5,                // X pozisyonu - TV'nin soluna
    1.5,                 // Y pozisyonu - Duvar ortası
    roomDepth/2 - 0.08,  // Z pozisyonu - Ön duvara yakın
    0,                   // Rotasyon - Düz
    1.2,                 // Genişlik
    1.6,                 // Yükseklik
    "abstract",          // Tablo türü
    "painting1"          // Çerçeve adı
);

addBeautifulPainting(
    roomWidth/2 - 0.08,  // X pozisyonu - Sağ duvar
    1.4,                 // Y pozisyonu
    2.0,                 // Z pozisyonu
    Math.PI / 2,         // Rotasyon - 90 derece
    1.4,                 // Genişlik
    1.0,                 // Yükseklik
    "landscape",         // Tablo türü
    "painting2"          // Çerçeve adı
);

// Bonus: Üçüncü tablo
addBeautifulPainting(
    -roomWidth/2 + 0.08, // Sol duvar
    1.6,                 // Y pozisyonu
    0,                   // Z pozisyonu
    -Math.PI / 2,        // Rotasyon - -90 derece
    1.0,                 // Genişlik
    1.3,                 // Yükseklik
    "modern",            // Tablo türü
    "painting3"          // Çerçeve adı
);

// Gelişmiş bitki ekleme fonksiyonu
function addRealisticPlant(positionX, positionZ, scale, plantType = "ficus") {
    // Bitki grubu oluştur
    let plantGroup = new BABYLON.TransformNode("plantGroup_" + Date.now(), scene);
    
    // Saksı için materyal - daha gerçekçi
    let potMaterial = new BABYLON.StandardMaterial("potMaterial", scene);
    potMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
    potMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    potMaterial.roughness = 0.8;
    
    // Saksı (daha güzel şekil)
    let pot = BABYLON.MeshBuilder.CreateCylinder("pot", {
        height: 0.6,
        diameterTop: 0.8,
        diameterBottom: 0.6,
        tessellation: 16
    }, scene);
    pot.parent = plantGroup;
    pot.position.y = 0.3;
    pot.material = potMaterial;
    
    // Toprak için materyal
    let soilMaterial = new BABYLON.StandardMaterial("soilMaterial", scene);
    soilMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.2, 0.1);
    
    // Toprak yüzeyi
    let soil = BABYLON.MeshBuilder.CreateCylinder("soil", {
        height: 0.05,
        diameter: 0.75,
        tessellation: 16
    }, scene);
    soil.parent = plantGroup;
    soil.position.y = 0.6;
    soil.material = soilMaterial;
    
    // Bitki türüne göre farklı bitkiler oluştur
    if (plantType === "ficus") {
        createFicusPlant(plantGroup);
    } else if (plantType === "palm") {
        createPalmPlant(plantGroup);
    } else if (plantType === "monstera") {
        createMonsteraPlant(plantGroup);
    }
    
    // Konumlandırma ve ölçeklendirme
    plantGroup.position = new BABYLON.Vector3(positionX, 0, positionZ);
    plantGroup.scaling = new BABYLON.Vector3(scale, scale, scale);
    
    // Gölge için ekle
    if (shadowGenerator) {
        shadowGenerator.addShadowCaster(pot);
        shadowGenerator.addShadowCaster(soil);
        pot.receiveShadows = true;
        soil.receiveShadows = true;
    }
    
    return plantGroup;
}

// Ficus bitkisi oluşturma
function createFicusPlant(parentGroup) {
    // Gövde materyali
    let trunkMaterial = new BABYLON.StandardMaterial("trunkMaterial", scene);
    trunkMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
    
    // Ana gövde
    let trunk = BABYLON.MeshBuilder.CreateCylinder("trunk", {
        height: 1.0,
        diameterTop: 0.08,
        diameterBottom: 0.12,
        tessellation: 8
    }, scene);
    trunk.parent = parentGroup;
    trunk.position.y = 1.1;
    trunk.material = trunkMaterial;
    
    // Yaprak materyali
    let leafMaterial = new BABYLON.StandardMaterial("leafMaterial", scene);
    leafMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.6, 0.1);
    leafMaterial.specularColor = new BABYLON.Color3(0.05, 0.1, 0.05);
    leafMaterial.backFaceCulling = false; // İki taraflı görünüm
    
    // Yapraklar için farklı dallar
    for (let i = 0; i < 8; i++) {
        let angle = (i / 8) * Math.PI * 2;
        let height = 1.4 + Math.random() * 0.4;
        let distance = 0.3 + Math.random() * 0.2;
        
        // Dal
        let branch = BABYLON.MeshBuilder.CreateCylinder("branch", {
            height: 0.3,
            diameter: 0.03,
            tessellation: 6
        }, scene);
        branch.parent = parentGroup;
        branch.position = new BABYLON.Vector3(
            Math.cos(angle) * distance,
            height,
            Math.sin(angle) * distance
        );
        branch.rotation.z = Math.PI / 6;
        branch.material = trunkMaterial;
        
        // Yaprak kümeleri
        for (let j = 0; j < 3; j++) {
            let leaf = BABYLON.MeshBuilder.CreateSphere("leaf", {
                diameterX: 0.4 + Math.random() * 0.2,
                diameterY: 0.5 + Math.random() * 0.2,
                diameterZ: 0.1,
                segments: 8
            }, scene);
            leaf.parent = parentGroup;
            leaf.position = new BABYLON.Vector3(
                Math.cos(angle) * (distance + 0.2),
                height + j * 0.1,
                Math.sin(angle) * (distance + 0.2)
            );
            leaf.rotation.y = angle + Math.random() * 0.5;
            leaf.material = leafMaterial;
            
            if (shadowGenerator) {
                shadowGenerator.addShadowCaster(leaf);
                leaf.receiveShadows = true;
            }
        }
        
        if (shadowGenerator) {
            shadowGenerator.addShadowCaster(branch);
            branch.receiveShadows = true;
        }
    }
    
    if (shadowGenerator) {
        shadowGenerator.addShadowCaster(trunk);
        trunk.receiveShadows = true;
    }
}

// Palmiye bitkisi oluşturma
function createPalmPlant(parentGroup) {
    let trunkMaterial = new BABYLON.StandardMaterial("palmTrunkMaterial", scene);
    trunkMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.3, 0.1);
    
    // Palmiye gövdesi
    let trunk = BABYLON.MeshBuilder.CreateCylinder("palmTrunk", {
        height: 1.5,
        diameterTop: 0.1,
        diameterBottom: 0.15,
        tessellation: 12
    }, scene);
    trunk.parent = parentGroup;
    trunk.position.y = 1.35;
    trunk.material = trunkMaterial;
    
    // Palmiye yaprağı materyali
    let palmLeafMaterial = new BABYLON.StandardMaterial("palmLeafMaterial", scene);
    palmLeafMaterial.diffuseColor = new BABYLON.Color3(0.0, 0.7, 0.0);
    palmLeafMaterial.backFaceCulling = false;
    
    // Palmiye yaprakları
    for (let i = 0; i < 6; i++) {
        let angle = (i / 6) * Math.PI * 2;
        
        // Yaprak sapı
        let stem = BABYLON.MeshBuilder.CreateCylinder("palmStem", {
            height: 1.2,
            diameter: 0.02,
            tessellation: 6
        }, scene);
        stem.parent = parentGroup;
        stem.position = new BABYLON.Vector3(0, 2.1, 0);
        stem.rotation.x = Math.PI / 4;
        stem.rotation.y = angle;
        stem.material = trunkMaterial;
        
        // Yaprak parçaları
        for (let j = 0; j < 10; j++) {
            let leaflet = BABYLON.MeshBuilder.CreateBox("palmLeaflet", {
                width: 0.1,
                height: 0.6,
                depth: 0.02
            }, scene);
            leaflet.parent = parentGroup;
            
            let leafPos = j * 0.12;
            leaflet.position = new BABYLON.Vector3(
                Math.cos(angle) * leafPos,
                2.1 + leafPos * 0.3,
                Math.sin(angle) * leafPos
            );
            leaflet.rotation.y = angle;
            leaflet.rotation.z = j * 0.1;
            leaflet.material = palmLeafMaterial;
            
            if (shadowGenerator) {
                shadowGenerator.addShadowCaster(leaflet);
                leaflet.receiveShadows = true;
            }
        }
        
        if (shadowGenerator) {
            shadowGenerator.addShadowCaster(stem);
            stem.receiveShadows = true;
        }
    }
    
    if (shadowGenerator) {
        shadowGenerator.addShadowCaster(trunk);
        trunk.receiveShadows = true;
    }
}

// Monstera bitkisi oluşturma
function createMonsteraPlant(parentGroup) {
    let leafMaterial = new BABYLON.StandardMaterial("monsteraLeafMaterial", scene);
    leafMaterial.diffuseColor = new BABYLON.Color3(0.05, 0.5, 0.05);
    leafMaterial.backFaceCulling = false;
    
    // Gövde
    let stem = BABYLON.MeshBuilder.CreateCylinder("monsteraStem", {
        height: 0.8,
        diameter: 0.06,
        tessellation: 8
    }, scene);
    stem.parent = parentGroup;
    stem.position.y = 1.0;
    stem.material = new BABYLON.StandardMaterial("stemMat", scene);
    stem.material.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.1);
    
    // Büyük monstera yaprakları
    for (let i = 0; i < 5; i++) {
        let angle = (i / 5) * Math.PI * 2;
        let height = 1.2 + i * 0.2;
        
        // Yaprak sapı
        let petiole = BABYLON.MeshBuilder.CreateCylinder("petiole", {
            height: 0.4,
            diameter: 0.03,
            tessellation: 6
        }, scene);
        petiole.parent = parentGroup;
        petiole.position = new BABYLON.Vector3(
            Math.cos(angle) * 0.2,
            height,
            Math.sin(angle) * 0.2
        );
        petiole.rotation.z = Math.PI / 3;
        petiole.rotation.y = angle;
        petiole.material = stem.material;
        
        // Büyük yaprak
        let leaf = BABYLON.MeshBuilder.CreateSphere("monsteraLeaf", {
            diameterX: 0.8,
            diameterY: 1.0,
            diameterZ: 0.05,
            segments: 12
        }, scene);
        leaf.parent = parentGroup;
        leaf.position = new BABYLON.Vector3(
            Math.cos(angle) * 0.5,
            height + 0.3,
            Math.sin(angle) * 0.5
        );
        leaf.rotation.y = angle;
        leaf.material = leafMaterial;
        
        if (shadowGenerator) {
            shadowGenerator.addShadowCaster(petiole);
            shadowGenerator.addShadowCaster(leaf);
            petiole.receiveShadows = true;
            leaf.receiveShadows = true;
        }
    }
    
    if (shadowGenerator) {
        shadowGenerator.addShadowCaster(stem);
        stem.receiveShadows = true;
    }
}

// Farklı bitki türleri ile odayı dekore et
addRealisticPlant(-4.5, -4.5, 0.8, "ficus");     // Sol ön köşe - Ficus
addRealisticPlant(4.5, -4.5, 0.7, "palm");       // Sağ ön köşe - Palmiye
addRealisticPlant(-4.5, 4.5, 0.9, "monstera");   // Sol arka köşe - Monstera
addRealisticPlant(4.5, 4.5, 0.8, "ficus");       // Sağ arka köşe - Ficus

}
    
    // Mobilya modellerini yükle
    function loadFurnitureMeshes() {
        console.log("Mobilya modellerini yüklemeye başlıyor...");
        
        // Koltuk modelini yükle
        console.log("Koltuk modeli yükleniyor: models/sofa.glb");
        BABYLON.SceneLoader.ImportMesh("", "models/", "sofa.glb", scene, function(newMeshes) {
            console.log("Koltuk modeli başarıyla yüklendi, mesh sayısı:", newMeshes.length);
            
            // Birleştirme işlemini kaldır, ana düğüm oluştur
            let sofa = new BABYLON.TransformNode("sofaTemplate", scene);
            
            // Modeli ölçeklendir ve döndür
            sofa.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            sofa.rotation.y = Math.PI;
            
            // Tüm meshler için malzeme oluştur
            let sofaMaterial = new BABYLON.StandardMaterial("sofaMaterial", scene);
            sofaMaterial.diffuseTexture = new BABYLON.Texture("textures/fabric_blue.jpg", scene, false, false, null, assetLoaded);
            sofaMaterial.diffuseTexture.uScale = 2;
            sofaMaterial.diffuseTexture.vScale = 2;
            sofaMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            
            // Tüm meshleri ana düğüme bağla ve malzemeyi uygula
            newMeshes.forEach(mesh => {
                if (mesh.name !== "__root__") {
                    mesh.parent = sofa;
                    if (mesh.material) {
                        mesh.material = sofaMaterial;
                        mesh.receiveShadows = true;
                    }
                }
            });
            
            sofa.isVisible = false;
            furnitureModels.sofa = sofa;
            console.log("Koltuk modeli hazır: furnitureModels.sofa");
            
        }, null, function(scene, message) {
            console.error("Koltuk yüklenirken hata:", message);
            assetLoaded(); // Hata durumunda da yükleme sayacını artır
        });
        
        // Masa modelini yükle
        console.log("Masa modeli yükleniyor: models/table.glb");
        BABYLON.SceneLoader.ImportMesh("", "models/", "table.glb", scene, function(newMeshes) {
            console.log("Masa modeli başarıyla yüklendi, mesh sayısı:", newMeshes.length);
            
            // Birleştirme işlemini kaldır, ana düğüm oluştur
            let table = new BABYLON.TransformNode("tableTemplate", scene);
            
            // Modeli ölçeklendir
            table.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            
            // Tüm meshler için malzeme oluştur
            let tableMaterial = new BABYLON.StandardMaterial("tableMaterial", scene);
            tableMaterial.diffuseTexture = new BABYLON.Texture("textures/wood.jpg", scene, false, false, null, assetLoaded);
            tableMaterial.diffuseTexture.uScale = 1;
            tableMaterial.diffuseTexture.vScale = 1;
            tableMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            
            // Tüm meshleri ana düğüme bağla ve malzemeyi uygula
            newMeshes.forEach(mesh => {
                if (mesh.name !== "__root__") {
                    mesh.parent = table;
                    if (mesh.material) {
                        mesh.material = tableMaterial;
                        mesh.receiveShadows = true;
                    }
                }
            });
            
            table.isVisible = false;
            furnitureModels.table = table;
            console.log("Masa modeli hazır: furnitureModels.table");
            
        }, null, function(scene, message) {
            console.error("Masa yüklenirken hata:", message);
            assetLoaded(); // Hata durumunda da yükleme sayacını artır
        });
        
        // Sandalye modelini yükle
        console.log("Sandalye modeli yükleniyor: models/chair.glb");
        BABYLON.SceneLoader.ImportMesh("", "models/", "chair.glb", scene, function(newMeshes) {
            console.log("Sandalye modeli başarıyla yüklendi, mesh sayısı:", newMeshes.length);
            
            // Birleştirme işlemini kaldır, ana düğüm oluştur
            let chair = new BABYLON.TransformNode("chairTemplate", scene);
            
            // Modeli ölçeklendir
            chair.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            
            // Tüm meshler için malzeme oluştur
            let chairMaterial = new BABYLON.StandardMaterial("chairMaterial", scene);
            chairMaterial.diffuseTexture = new BABYLON.Texture("textures/chair_texture.jpg", scene, false, false, null, assetLoaded);
            chairMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            
            // Tüm meshleri ana düğüme bağla ve malzemeyi uygula
            newMeshes.forEach(mesh => {
                if (mesh.name !== "__root__") {
                    mesh.parent = chair;
                    if (mesh.material) {
                        mesh.material = chairMaterial;
                        mesh.receiveShadows = true;
                    }
                }
            });
            
            chair.isVisible = false;
            furnitureModels.chair = chair;
            console.log("Sandalye modeli hazır: furnitureModels.chair");
            
        }, null, function(scene, message) {
            console.error("Sandalye yüklenirken hata:", message);
            assetLoaded(); // Hata durumunda da yükleme sayacını artır
        });
        
        // Lamba modelini yükle
        console.log("Lamba modeli yükleniyor: models/lamp.glb");
        BABYLON.SceneLoader.ImportMesh("", "models/", "lamp.glb", scene, function(newMeshes) {
            console.log("Lamba modeli başarıyla yüklendi, mesh sayısı:", newMeshes.length);
            
            // Birleştirme işlemini kaldır, ana düğüm oluştur
            let lamp = new BABYLON.TransformNode("lampTemplate", scene);
            
            // Modeli ölçeklendir
            lamp.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            
            // Tüm meshler için malzeme oluştur
            let lampMaterial = new BABYLON.StandardMaterial("lampBaseMaterial", scene);
            lampMaterial.diffuseTexture = new BABYLON.Texture("textures/metal.jpg", scene, false, false, null, assetLoaded);
            lampMaterial.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
            
            // Tüm meshleri ana düğüme bağla ve malzemeyi uygula
            newMeshes.forEach(mesh => {
                if (mesh.name !== "__root__") {
                    mesh.parent = lamp;
                    if (mesh.material) {
                        mesh.material = lampMaterial;
                        mesh.receiveShadows = true;
                    }
                }
            });
            
            lamp.isVisible = false;
            furnitureModels.lamp = lamp;
            console.log("Lamba modeli hazır: furnitureModels.lamp");
            
        }, null, function(scene, message) {
            console.error("Lamba yüklenirken hata:", message);
            assetLoaded(); // Hata durumunda da yükleme sayacını artır
        });
        
        // Fonksiyonun sonuna yükleme durumunu kontrol eden timeout ekle
        setTimeout(() => {
            console.log("--------- MODEL YÜKLEME DURUMU ---------");
            console.log("Yüklenen modeller:", Object.keys(furnitureModels).join(", "));
            
            const expectedModels = ["sofa", "table", "chair", "lamp"];
            const missingModels = expectedModels.filter(model => !furnitureModels[model]);
            
            if (missingModels.length > 0) {
                console.warn("EKSİK MODELLER:", missingModels.join(", "));
            } else {
                console.log("Tüm modeller başarıyla yüklendi!");
            }
            
            console.log("Toplam yüklenen asset sayısı:", loadedAssets);
            console.log("----------------------------------------");
        }, 5000); // 5 saniye sonra kontrol et
    }
    
    // Varlık yükleme takibi
    function assetLoaded() {
        loadedAssets++;
        const progress = Math.min((loadedAssets / totalAssets) * 100, 100);
        loadingProgressElement.style.width = progress + '%';
        
        console.log(`Yükleme ilerleme: ${loadedAssets}/${totalAssets}`);
        
        if (loadedAssets >= totalAssets) {
            if (loadingTimeout) clearTimeout(loadingTimeout);
            setTimeout(() => {
                loadingElement.style.display = 'none';
            }, 1000);
        }
    }
    
    // Mobilya yerleştirme
    function placeFurniture(position) {
        console.log("placeFurniture çağrıldı - Seçilen mobilya:", selectedFurnitureType);
        
        if (!furnitureModels[selectedFurnitureType]) {
            console.warn("Model bulunamadı:", selectedFurnitureType);
            return;
        }
        
        // Yeni bir transform node oluştur
        let newID = selectedFurnitureType + "_" + Date.now();
        let newFurniture = new BABYLON.TransformNode(newID, scene);
        
        // Her mobilya tipi için özel ayarlar
        switch(selectedFurnitureType) {
            case 'sofa':
                newFurniture.position = new BABYLON.Vector3(position.x, 0, position.z);
                newFurniture.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
                newFurniture.rotation.y = Math.PI;
                break;
            case 'table':
                // MASA İÇİN BÜYÜK ÖLÇEK VE YÜKSELTİLMİŞ POZİSYON
                newFurniture.position = new BABYLON.Vector3(position.x, 0, position.z);
                newFurniture.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5); // 50x büyütme!
                break;
            case 'chair':
    console.log("Sandalye yerleştiriliyor...");
    
    // Temel ayarlar
    newFurniture.position = new BABYLON.Vector3(position.x, 0, position.z);
    newFurniture.scaling = new BABYLON.Vector3(1, 1, 1);
    
    // Rotasyonu sıfırla
    newFurniture.rotationQuaternion = null;
    newFurniture.rotation = new BABYLON.Vector3(0, 0, 0);
    
    console.log("Sandalye büyük boyutta yerleştirildi");
    
    // Pozisyon düzeltmesi - child mesh'lerden hesapla
    setTimeout(() => {
        try {
            const childMeshes = newFurniture.getChildMeshes();
            if (childMeshes.length > 0) {
                // İlk child mesh'den bounding box al
                const bbox = childMeshes[0].getBoundingInfo();
                console.log("Child mesh bounding box bulundu");
                
                // Boyut kontrolü
                const size = bbox.boundingBox.extendSizeWorld;
                const height = size.y * 2;
                
                console.log("Sandalye yüksekliği:", height);
                
                // Eğer çok büyükse küçült
                if (height > 3) {
                    const targetHeight = 1.5;
                    const scale = targetHeight / height;
                    newFurniture.scaling = new BABYLON.Vector3(scale, scale, scale);
                    console.log("Sandalye ölçeklendi:", scale);
                }
                
                // Zemine oturt - child mesh'lerin en alt noktasını bul
                setTimeout(() => {
                    let minY = 0;
                    childMeshes.forEach(mesh => {
                        const meshBBox = mesh.getBoundingInfo();
                        const meshMinY = meshBBox.boundingBox.minimumWorld.y;
                        if (meshMinY < minY) minY = meshMinY;
                    });
                    
                    newFurniture.position.y = -minY + 0.05; // Zeminin biraz üstüne
                    console.log("Sandalye zemine oturtuldu, Y pozisyonu:", newFurniture.position.y);
                }, 100);
            }
            
        } catch (error) {
            console.error("Sandalye pozisyon hatası:", error);
            // Fallback: Manuel pozisyon ayarı
            newFurniture.position.y = 0.5; // Zemin üstü sabit yükseklik
            console.log("Manuel pozisyon ayarlandı");
        }
    }, 300);
    break;

case 'lamp':
    console.log("Lamba tavana sabitleniyor...");
    
    // Lambanın tavana sabitlenmesi - odanın içinde kalacak şekilde
    // Tavan yüksekliği 5, lamba boyu ~1 birim olduğunu varsayıyoruz
    // Büyük lamba için daha çok aşağıya indiriyoruz
    newFurniture.position = new BABYLON.Vector3(position.x, 3.3, position.z); // Kesinlikle tavan sınırının altında
    
    // Lamba rotasyonu - normal asılı lamba pozisyonu
    newFurniture.rotation = new BABYLON.Vector3(0, 0, 0); // Düz duruş
    
    // Lamba ölçeği - daha büyük ama hala uygun boyutta
    newFurniture.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5); // 0.3'ten 0.5'e çıkardık
    
    // Sadece tavan bağlantı noktası - sade ve basit
    let ceilingMount = BABYLON.MeshBuilder.CreateCylinder("ceilingMount_" + Date.now(), {
        height: 0.02,
        diameter: 0.08,
        tessellation: 8
    }, scene);
    ceilingMount.position = new BABYLON.Vector3(position.x, 4.99, position.z); // Tavana yapışık
    
    let mountMaterial = new BABYLON.StandardMaterial("mountMaterial", scene);
    mountMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9); // Tavan rengine yakın
    ceilingMount.material = mountMaterial;
    
    // Lamba ışığı - aşağı doğru yönlendirilmiş
    let lampLight = new BABYLON.SpotLight("lampLight_" + Date.now(), 
        new BABYLON.Vector3(0, -0.4, 0), // Lambanın alt kısmından (biraz daha aşağıda)
        new BABYLON.Vector3(0, -1, 0),   // Aşağı doğru
        Math.PI / 3,  // Işık açısı (60 derece)
        2,            // Işık yoğunluğu düşürme oranı
        scene);
    
    lampLight.parent = newFurniture;
    lampLight.intensity = 1.4; // Büyük lambaya uygun olarak biraz artırdık
    lampLight.diffuse = new BABYLON.Color3(1, 0.9, 0.7); // Sıcak sarı ışık
    lampLight.range = 7; // Işık menzilini biraz artırdık
    
    // Hafif sallanma animasyonu ekle (isteğe bağlı)
    BABYLON.Animation.CreateAndStartAnimation(
        "swayAnimation",
        newFurniture,
        "rotation.z",
        30, // FPS
        300, // Toplam frame
        0, // Başlangıç değeri
        Math.PI / 180 * 3, // 3 derece sallanma
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );
    
    console.log("Büyütülmüş lamba tavana sabitlendi ve hafifçe sallanıyor");
    break;
        }
        
        console.log(`${selectedFurnitureType} yerleştiriliyor:`, 
                    "pozisyon:", newFurniture.position, 
                    "ölçek:", newFurniture.scaling,
                    "döndürme:", newFurniture.rotation);
        
        // Alt mesh'leri kopyala
        let original = furnitureModels[selectedFurnitureType];
        let childMeshes = original.getChildMeshes();
        console.log(`${selectedFurnitureType} için ${childMeshes.length} mesh bulundu`);
        
        // Debug için orijinal model bilgilerini göster
        console.log(`Orijinal model bilgileri - ${selectedFurnitureType}:`, 
                "pozisyon:", original.position, 
                "ölçek:", original.scaling);
        
        // Özel malzeme oluştur
        let material = new BABYLON.StandardMaterial(selectedFurnitureType + "Material_" + newID, scene);
        switch(selectedFurnitureType) {
            case 'sofa':
                material.diffuseColor = new BABYLON.Color3(0, 0, 0.8); // Mavi
                break;
            case 'table':
                material.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.05); // Koyu kahverengi
                break;
            case 'chair':
                material.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Koyu gri
                break;
            case 'lamp':
                material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.2); // Sarımsı
                material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0); // Işık efekti
                break;
        }
        
        // Her bir alt mesh'i klonla ve görünür hale getir
        let clonedMeshes = [];
        childMeshes.forEach(originalMesh => {
            try {
                let clonedMesh = originalMesh.clone(originalMesh.name + "_" + newID);
                clonedMesh.parent = newFurniture;
                clonedMesh.material = material; // Yeni malzemeyi uygula
                clonedMesh.isVisible = true;
                clonedMesh.visibility = 1.0;
                clonedMesh.receiveShadows = true;
                
                // Gölge ekle
                if (shadowGenerator) {
                    shadowGenerator.addShadowCaster(clonedMesh);
                }
                
                clonedMeshes.push(clonedMesh);
            } catch (error) {
                console.error("Mesh klonlama hatası:", error);
            }
        });
        
        console.log(`${selectedFurnitureType} için ${clonedMeshes.length} mesh klonlandı`);
        
        // Hiç mesh klonlanmadıysa doğrudan bir küp oluştur (test için)
        if (clonedMeshes.length === 0) {
            console.warn(`${selectedFurnitureType} için hiç mesh klonlanamadı! Test küpü oluşturuluyor...`);
            let testCube = BABYLON.MeshBuilder.CreateBox("testCube_" + newID, {size: 1}, scene);
            testCube.parent = newFurniture;
            testCube.material = material;
        }
        
        return newFurniture;
    }
    
    // Mobilya tipi seçimi (butonlar için)
    function selectFurnitureType(type) {
        console.log(`Mobilya tipi seçildi: ${type}`);
        // UI güncelle
        document.querySelectorAll('.furniture-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById(type + '-btn').classList.add('selected');
        
        // Seçimi güncelle
        selectedFurnitureType = type;
        placementMode = true;
        
        // Varsa mevcut seçimi kaldır
        clearSelection();
    }
    
   // Mobilya seçme fonksiyonu - geliştirilmiş versiyon
function selectFurnitureObject(pickInfo) {
    // Önceki seçimi temizle
    clearSelection();
    
    // Tıklanan nesne bir mobilya mı kontrol et
    if (pickInfo.hit && pickInfo.pickedMesh) {
        console.log("Tıklanan mesh:", pickInfo.pickedMesh.name);
        
        // En üstteki parent'ı bul (transform node)
        let currentMesh = pickInfo.pickedMesh;
        let parentNode = currentMesh;
        
        // Parent hiyerarşisini izle
        while (parentNode.parent && !parentNode.name.includes("Template")) {
            console.log("Parent yukarı:", parentNode.name, "->", parentNode.parent.name);
            parentNode = parentNode.parent;
        }
        
        // Debug için
        console.log("Seçilecek üst nesne:", parentNode.name);
        
        // Mobilya türünü kontrol et (adından)
        if (parentNode && (parentNode.name.includes("sofa") || 
                           parentNode.name.includes("table") || 
                           parentNode.name.includes("chair") || 
                           parentNode.name.includes("lamp"))) {
            selectedFurniture = parentNode;
            
            // Seçimi görsel olarak vurgula
            createSelectionHighlight(selectedFurniture);
            
            console.log("Mobilya seçildi:", selectedFurniture.name);
            return true;
        }
    }
    
    // Bir şey seçilmediyse
    selectedFurniture = null;
    return false;
}
    
    // Seçim vurgusu oluştur - geliştirilmiş versiyon
function createSelectionHighlight(furniture) {
    // Varsa önceki vurguyu temizle
    if (highlightMesh) {
        highlightMesh.dispose();
    }
    
    console.log("Vurgulama oluşturuluyor:", furniture.name);
    
    try {
        // YÖNTEM 1: Dünya Uzayında Sınırlayıcı Kutu Hesaplama
        let boundingInfo = furniture.getHierarchyBoundingVectors(true);
        let min = boundingInfo.min;
        let max = boundingInfo.max;
        
        // Sınırlayıcı kutunun boyutları
        let size = max.subtract(min);
        let center = min.add(max).scale(0.5);
        
        console.log("Mobilya boyutları:", size);
        console.log("Mobilya merkezi:", center);
        
        // Vurgulama için yeni mesh oluştur
        highlightMesh = BABYLON.MeshBuilder.CreateBox("selectionHighlight", {
            width: size.x + 0.1,
            height: size.y + 0.1,
            depth: size.z + 0.1
        }, scene);
        
        // Merkeze yerleştir
        highlightMesh.position = center;
        
        // Yarı saydam mavi malzeme
        let highlightMaterial = new BABYLON.StandardMaterial("highlightMaterial", scene);
        highlightMaterial.diffuseColor = new BABYLON.Color3(0, 0.5, 1);
        highlightMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        highlightMaterial.alpha = 0.3;
        highlightMaterial.wireframe = false;
        highlightMesh.material = highlightMaterial;
        
        // Vurgulama kutusunun önceliğini arttır (her zaman görünsün)
        highlightMesh.renderingGroupId = 1;
        
        console.log("Vurgulama kutusu oluşturuldu");
    } catch (error) {
        console.error("Vurgulama kutusu oluşturulurken hata:", error);
        
        // YÖNTEM 2: Backup yöntemi - Sadece basit bir kutu oluştur
        highlightMesh = BABYLON.MeshBuilder.CreateBox("selectionHighlight", {
            width: 1,
            height: 1,
            depth: 1
        }, scene);
        
        highlightMesh.position = furniture.position.clone();
        
        // Mobilyanın ölçeğini dikkate al
        highlightMesh.scaling = new BABYLON.Vector3(
            furniture.scaling.x * 2,
            furniture.scaling.y * 2,
            furniture.scaling.z * 2
        );
        
        // Yarı saydam kırmızı malzeme (hata durumu için)
        let highlightMaterial = new BABYLON.StandardMaterial("highlightMaterial", scene);
        highlightMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        highlightMaterial.alpha = 0.3;
        highlightMesh.material = highlightMaterial;
    }
}
    
    // Seçimi temizle
    function clearSelection() {
        if (highlightMesh) {
            highlightMesh.dispose();
            highlightMesh = null;
        }
        selectedFurniture = null;
    }
    
    
    // Mobilya silme fonksiyonu
    function deleteFurniture() {
        if (selectedFurniture) {
            console.log("Mobilya siliniyor:", selectedFurniture.name);
            
            // Önce vurgulamayı temizle
            if (highlightMesh) {
                highlightMesh.dispose();
                highlightMesh = null;
            }
            
            // Tüm alt mesh'leri temizle
            selectedFurniture.getChildMeshes().forEach(mesh => {
                if (shadowGenerator) {
                    shadowGenerator.removeShadowCaster(mesh);
                }
                mesh.dispose();
            });
            
            // Ana node'u temizle
            selectedFurniture.dispose();
            selectedFurniture = null;
            
            console.log("Mobilya silindi");
        }
    }
    
    // Etkileşimleri ayarla
function setupInteractions() {
    // Tıklama olayları
    scene.onPointerDown = function(evt, pickInfo) {
        // Sol tıklama
        if (evt.button === 0) {
            
            // ÖNCELİKLE PENCERE KONTROLÜ YAP
            if (pickInfo.hit && pickInfo.pickedMesh) {
                console.log("Tıklanan mesh:", pickInfo.pickedMesh.name);
                
                // Sol pencere kanadı kontrolü
                if (pickInfo.pickedMesh.name === "leftSash") {
                    console.log("Sol pencere kanadı tıklandı!");
                    if (window.toggleSash && window.leftSashRef) {
                        window.toggleSash(window.leftSashRef, -1);
                    }
                    return; // Diğer işlemleri durdur
                }
                
                // Sağ pencere kanadı kontrolü
                if (pickInfo.pickedMesh.name === "rightSash") {
                    console.log("Sağ pencere kanadı tıklandı!");
                    if (window.toggleSash && window.rightSashRef) {
                        window.toggleSash(window.rightSashRef, 1);
                    }
                    return; // Diğer işlemleri durdur
                }
            }
            
            // Pencere kanadı değilse normal işlemler
            if (placementMode && selectedFurnitureType && pickInfo.hit && pickInfo.pickedMesh === ground) {
                // Mobilya yerleştirme modu aktifse yeni mobilya yerleştir
                let newFurniture = placeFurniture(pickInfo.pickedPoint);
                console.log("Yeni mobilya yerleştirildi:", newFurniture.name);
            } else {
                // Normal modda mobilya seçmeyi dene
                selectFurnitureObject(pickInfo);
                placementMode = false; // Seçim moduna geç
            }
        }
    };
        
        
        // Klavye kontrolleri
        scene.onKeyboardObservable.add((kbInfo) => {
            switch (kbInfo.type) {
                case BABYLON.KeyboardEventTypes.KEYDOWN:
                    switch (kbInfo.event.key.toLowerCase()) {
                        case "w": // İleri
                            camera.position.addInPlace(camera.getDirection(BABYLON.Axis.Z).scale(0.1));
                            break;
                        case "s": // Geri
                            camera.position.subtractInPlace(camera.getDirection(BABYLON.Axis.Z).scale(0.1));
                            break;
                        case "a": // Sol
                            camera.position.subtractInPlace(camera.getDirection(BABYLON.Axis.X).scale(0.1));
                            break;
                        case "d": // Sağ
                            camera.position.addInPlace(camera.getDirection(BABYLON.Axis.X).scale(0.1));
                            break;
                        case "r": // Mobilya döndürme
                            if (selectedFurniture) {
                                // 45 derece döndür
                                selectedFurniture.rotation.y += Math.PI / 4;
                                
                                // Vurgulama kutusunu da güncelle
                                if (highlightMesh) {
                                    highlightMesh.rotation = selectedFurniture.rotation.clone();
                                }
                                
                                console.log("Mobilya döndürüldü:", selectedFurniture.name);
                            }
                            break;
                        case "delete": // Mobilya silme
                            if (selectedFurniture) {
                                deleteFurniture();
                            }
                            break;
                    }
                    break;
            }
        });
        
        // UI kontrolleri
        document.getElementById('light-intensity').addEventListener('input', function(e) {
            light.intensity = parseFloat(e.target.value);
        });
        
        document.getElementById('ambient-light').addEventListener('input', function(e) {
            ambientLight.intensity = parseFloat(e.target.value);
        });
        
        document.getElementById('light-position').addEventListener('change', function(e) {
            switch(e.target.value) {
                case 'center':
                    light.position = new BABYLON.Vector3(0, 3, 0);
                    break;
                case 'left':
                    light.position = new BABYLON.Vector3(-3, 3, 0);
                    break;
                case 'right':
                    light.position = new BABYLON.Vector3(3, 3, 0);
                    break;
            }
        });
        
        document.getElementById('reset-view').addEventListener('click', function() {
            camera.position = new BABYLON.Vector3(0, 1.7, -5);
            camera.setTarget(BABYLON.Vector3.Zero());
        });
        
        document.getElementById('clear-all').addEventListener('click', function() {
            // Tüm mobilyaları temizle
            scene.meshes.forEach(mesh => {
                if (!mesh.name.includes('Template') && 
                    mesh !== ground && 
                    !walls.includes(mesh) && 
                    mesh.name !== 'window' &&
                    !mesh.name.startsWith('back') &&
                    !mesh.name.startsWith('left') &&
                    !mesh.name.startsWith('right') &&
                    !mesh.name.includes('selectionHighlight')) {
                    mesh.dispose();
                }
            });
            clearSelection();
        });
        
        // Mobilya seçim butonları
        document.getElementById('sofa-btn').addEventListener('click', function() {
            console.log("Koltuk butonu tıklandı");
            selectFurnitureType('sofa');
        });
        
        document.getElementById('table-btn').addEventListener('click', function() {
            console.log("Masa butonu tıklandı");
            selectFurnitureType('table');
        });
        
        document.getElementById('chair-btn').addEventListener('click', function() {
            console.log("Sandalye butonu tıklandı");
            selectFurnitureType('chair');
        });
        
        document.getElementById('lamp-btn').addEventListener('click', function() {
            console.log("Lamba butonu tıklandı");
            selectFurnitureType('lamp');
        });
    }
    
    // Sahneyi oluştur ve başlat
    scene = createScene();
    
    // Duvarları ve mobilyaları oluştur
    createWalls();
    loadFurnitureMeshes();
    
    // Etkileşimleri ayarla
    setupInteractions();
    
    // Her kareyi çizme döngüsü
    engine.runRenderLoop(function() {
        scene.render();
    });
    
    // Pencere boyutu değiştiğinde güncelle
    window.addEventListener('resize', function() {
        engine.resize();
    });
});