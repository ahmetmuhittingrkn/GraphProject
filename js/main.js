document.addEventListener('DOMContentLoaded', function() {
    const loadingElement = document.getElementById('loading');
    const loadingProgressElement = document.getElementById('loading-progress');
    
    const canvas = document.getElementById('renderCanvas');
    const engine = new BABYLON.Engine(canvas, true);
    
    let scene, camera, light, ambientLight;
    let ground, walls = [];
    let selectedFurnitureType = null;
    let selectedFurniture = null;
    let highlightMesh = null;
    let placementMode = false;
    let furnitureModels = {};
    let totalAssets = 9;
    let loadedAssets = 0;
    let shadowGenerator;
    
    let loadingTimeout = setTimeout(() => {
        console.warn("Yükleme zaman aşımına uğradı, uygulama başlatılıyor.");
        loadingElement.style.display = 'none';
    }, 15000);
    
    const createScene = function() {
        const newScene = new BABYLON.Scene(engine);
        newScene.clearColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        
        camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(-3, 4, -3), newScene);
        camera.setTarget(new BABYLON.Vector3(1, 0, 1));
        camera.attachControl(canvas, true);
        camera.speed = 0.2;
        camera.angularSensibility = 4000;
        
        camera.applyGravity = true;
        camera.ellipsoid = new BABYLON.Vector3(0.5, 0.9, 0.5);
        camera.checkCollisions = true;
        
        light = new BABYLON.PointLight('mainLight', new BABYLON.Vector3(0, 3, 0), newScene);
        light.intensity = 1.0;
        light.diffuse = new BABYLON.Color3(1, 0.95, 0.85);
        light.specular = new BABYLON.Color3(1, 1, 1);
        
        ambientLight = new BABYLON.HemisphericLight('ambientLight', new BABYLON.Vector3(0, 1, 0), newScene);
        ambientLight.intensity = 0.5;
        ambientLight.diffuse = new BABYLON.Color3(0.8, 0.8, 0.8);
        
        ground = BABYLON.MeshBuilder.CreateGround('ground', {width: 10, height: 10}, newScene);
        let groundMaterial = new BABYLON.StandardMaterial('groundMat', newScene);
        groundMaterial.diffuseTexture = new BABYLON.Texture('textures/floor.jpg', newScene, false, false, null, assetLoaded);
        groundMaterial.diffuseTexture.uScale = 4;
        groundMaterial.diffuseTexture.vScale = 4;
        groundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        ground.material = groundMaterial;
        ground.checkCollisions = true;
        ground.receiveShadows = true;
        
        shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 32;
        
        return newScene;
    };
    
    function createWalls() {
    let wallMaterial = new BABYLON.StandardMaterial('wallMat', scene);
    wallMaterial.diffuseTexture = new BABYLON.Texture('textures/wall.jpg', scene, false, false, null, assetLoaded);
    wallMaterial.diffuseTexture.uScale = 2;
    wallMaterial.diffuseTexture.vScale = 1;
    wallMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    wallMaterial.backFaceCulling = false;
    
    const roomWidth = 10; 
    const roomDepth = 10;
    const roomHeight = 5;
    
    let backWall = BABYLON.MeshBuilder.CreateBox('backWall', {
        width: roomWidth,
        height: roomHeight,
        depth: 0.1
    }, scene);
    backWall.position = new BABYLON.Vector3(0, roomHeight/2, roomDepth/2);
    backWall.material = wallMaterial;
    backWall.checkCollisions = true;
    walls.push(backWall);
    
    let leftWall = BABYLON.MeshBuilder.CreateBox('leftWall', {
        width: 0.1,
        height: roomHeight,
        depth: roomDepth
    }, scene);
    leftWall.position = new BABYLON.Vector3(-roomWidth/2, roomHeight/2, 0);
    leftWall.material = wallMaterial;
    leftWall.checkCollisions = true;
    walls.push(leftWall);
    
    let rightWall = BABYLON.MeshBuilder.CreateBox('rightWall', {
        width: 0.1,
        height: roomHeight,
        depth: roomDepth
    }, scene);
    rightWall.position = new BABYLON.Vector3(roomWidth/2, roomHeight/2, 0);
    rightWall.material = wallMaterial;
    rightWall.checkCollisions = true;
    walls.push(rightWall);
    
    let frontWallLeft = BABYLON.MeshBuilder.CreateBox('frontWallLeft', {
        width: roomWidth/2 - 1,
        height: roomHeight,
        depth: 0.1
    }, scene);
    frontWallLeft.position = new BABYLON.Vector3(-roomWidth/4 - 0.5, roomHeight/2, -roomDepth/2);
    frontWallLeft.material = wallMaterial;
    frontWallLeft.checkCollisions = true;
    walls.push(frontWallLeft);
    
    let frontWallRight = BABYLON.MeshBuilder.CreateBox('frontWallRight', {
        width: roomWidth/2 - 1,
        height: roomHeight,
        depth: 0.1
    }, scene);
    frontWallRight.position = new BABYLON.Vector3(roomWidth/4 + 0.5, roomHeight/2, -roomDepth/2);
    frontWallRight.material = wallMaterial;
    frontWallRight.checkCollisions = true;
    walls.push(frontWallRight);
    
    let doorTop = BABYLON.MeshBuilder.CreateBox('doorTop', {
        width: 2,
        height: roomHeight - 2.5,
        depth: 0.1
    }, scene);
    doorTop.position = new BABYLON.Vector3(0, roomHeight - (roomHeight - 2.5)/2, -roomDepth/2);
    doorTop.material = wallMaterial;
    doorTop.checkCollisions = true;
    walls.push(doorTop);
    
    let ceiling = BABYLON.MeshBuilder.CreateBox('ceiling', {
        width: roomWidth,
        height: 0.1,
        depth: roomDepth
    }, scene);
    ceiling.position = new BABYLON.Vector3(0, roomHeight, 0);
    
    let ceilingMaterial = new BABYLON.StandardMaterial('ceilingMat', scene);
    ceilingMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
    ceilingMaterial.backFaceCulling = false;
    ceiling.material = ceilingMaterial;
    walls.push(ceiling);
    
    let tvGroup = new BABYLON.TransformNode("tvGroup", scene);


    function addDoor() {
        let doorGroup = new BABYLON.TransformNode("doorGroup", scene);
        
        let doorMaterial = new BABYLON.StandardMaterial("doorMaterial", scene);
        doorMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
        
        let handleMaterial = new BABYLON.StandardMaterial("handleMaterial", scene);
        handleMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.1);
        
        let frameMaterial = new BABYLON.StandardMaterial("frameMaterial", scene);
        frameMaterial.diffuseColor = new BABYLON.Color3(0.35, 0.18, 0.08);
        
        let door = BABYLON.MeshBuilder.CreateBox("doorPanel", {
            width: 1.8,
            height: 2.4,
            depth: 0.08
        }, scene);
        door.parent = doorGroup;
        door.material = doorMaterial;
        
        let topFrame = BABYLON.MeshBuilder.CreateBox("topFrame", {
            width: 2.2,
            height: 0.12,
            depth: 0.12
        }, scene);
        topFrame.parent = doorGroup;
        topFrame.position.y = 1.26;
        topFrame.material = frameMaterial;
        
        let leftFrame = BABYLON.MeshBuilder.CreateBox("leftFrame", {
            width: 0.12,
            height: 2.64,
            depth: 0.12
        }, scene);
        leftFrame.parent = doorGroup;
        leftFrame.position.x = -1.04;
        leftFrame.material = frameMaterial;
        
        let rightFrame = BABYLON.MeshBuilder.CreateBox("rightFrame", {
            width: 0.12,
            height: 2.64,
            depth: 0.12
        }, scene);
        rightFrame.parent = doorGroup;
        rightFrame.position.x = 1.04;
        rightFrame.material = frameMaterial;
        
        let doorHandle = BABYLON.MeshBuilder.CreateCylinder("doorHandle", {
            height: 0.04,
            diameter: 0.08,
            tessellation: 16
        }, scene);
        doorHandle.parent = doorGroup;
        doorHandle.rotation.x = Math.PI/2;
        doorHandle.position = new BABYLON.Vector3(0.7, 0, 0.08);
        doorHandle.material = handleMaterial;
        
        let handleConnector = BABYLON.MeshBuilder.CreateBox("handleConnector", {
            width: 0.04,
            height: 0.04,
            depth: 0.06
        }, scene);
        handleConnector.parent = doorGroup;
        handleConnector.position = new BABYLON.Vector3(0.7, 0, 0.04);
        handleConnector.material = handleMaterial;
        
        doorGroup.position = new BABYLON.Vector3(0, 1.2, -roomDepth/2 + 0.05);
        
        console.log("Giriş kapısı eklendi");
        
        return doorGroup;
    }

let door = addDoor();

function addOpenableWindow(position, width, height, frameDepth, sashDepth) {
    const halfW = width / 2;
    
    const frameMat = new BABYLON.StandardMaterial("frameMat", scene);
    frameMat.diffuseColor = new BABYLON.Color3(0.45, 0.28, 0.12);

    const glassMat = new BABYLON.StandardMaterial("glassMat", scene);
    glassMat.diffuseColor = new BABYLON.Color3(0.8, 0.9, 1);
    glassMat.alpha = 0.6;
    glassMat.backFaceCulling = false;

    const viewMat = new BABYLON.StandardMaterial("viewMat", scene);
    viewMat.diffuseTexture = new BABYLON.Texture("textures/window_view.jpg", scene);
    viewMat.backFaceCulling = false;

    const winGroup = new BABYLON.TransformNode("openableWindow", scene);
    winGroup.position = position;
    winGroup.rotation.y = Math.PI / 2;

    const frame = BABYLON.MeshBuilder.CreateBox("winFrame", {
        width: width + 0.1,
        height: height + 0.1,
        depth: frameDepth
    }, scene);
    frame.parent = winGroup;
    frame.material = frameMat;
    frame.isPickable = false;

    const leftSash = BABYLON.MeshBuilder.CreateBox("leftSash", {
        width: halfW - 0.01,
        height: height - 0.02,
        depth: sashDepth + 0.03
    }, scene);
    leftSash.parent = winGroup;
    leftSash.material = glassMat;
    leftSash.position.x = -halfW / 2;
    leftSash.position.z = (frameDepth + sashDepth) / 2 + 0.1;
    
    leftSash.setPivotPoint(new BABYLON.Vector3(-halfW / 2, 0, 0));
    leftSash.isPickable = true;
    leftSash.isOpen = false;

    const rightSash = BABYLON.MeshBuilder.CreateBox("rightSash", {
        width: halfW - 0.01,
        height: height - 0.02,
        depth: sashDepth + 0.03
    }, scene);
    rightSash.parent = winGroup;
    rightSash.material = glassMat;
    rightSash.position.x = halfW / 2;
    rightSash.position.z = (frameDepth + sashDepth) / 2 + 0.1;
    
    rightSash.setPivotPoint(new BABYLON.Vector3(halfW / 2, 0, 0));
    rightSash.isPickable = true;
    rightSash.isOpen = false;

    const outsideView = BABYLON.MeshBuilder.CreatePlane("outsideView", {
        width: width,
        height: height
    }, scene);
    outsideView.parent = winGroup;
    outsideView.position.z = -frameDepth / 2 - 0.01;
    outsideView.material = viewMat;
    outsideView.isPickable = false;

    window.leftSashRef = leftSash;
    window.rightSashRef = rightSash;

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
            { frame: 30, value: to }
        ]);
        
        sash.animations = [anim];
        scene.beginAnimation(sash, 0, 30, false);
        
        console.log(sash.name + " açıldı/kapandı. Yeni durum:", sash.isOpen ? "Açık" : "Kapalı");
    };

    leftSash.actionManager = new BABYLON.ActionManager(scene);
    leftSash.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPickTrigger, function () {
            console.log("Sol kanat tıklandı!");
            toggleSash(leftSash, -1);
        }
    ));

    rightSash.actionManager = new BABYLON.ActionManager(scene);
    rightSash.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnPickTrigger, function () {
            console.log("Sağ kanat tıklandı!");
            toggleSash(rightSash, 1);
        }
    ));

    const highlightMat = new BABYLON.StandardMaterial("highlightMat", scene);
    highlightMat.diffuseColor = new BABYLON.Color3(1, 1, 0.8);
    highlightMat.alpha = 0.7;
    highlightMat.backFaceCulling = false;

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

addOpenableWindow(
    new BABYLON.Vector3(roomWidth/2 - 0.06, 1.7, 0),
    2.0,   // genişlik
    1.8,   // yükseklik
    0.1,   // çerçeve kalınlığı
    0.05   // kanat kalınlığı
);

let tvScreenMaterial = new BABYLON.StandardMaterial("tvScreenMat", scene);
let tvTexture = new BABYLON.Texture("textures/tv.jpg", scene);
tvScreenMaterial.diffuseTexture = tvTexture;
tvScreenMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);

let tvFrameMaterial = new BABYLON.StandardMaterial("tvFrameMat", scene);
tvFrameMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);

let tvFrame = BABYLON.MeshBuilder.CreateBox("tvFrame", {
    width: 2.2,
    height: 1.5,
    depth: 0.1
}, scene);
tvFrame.parent = tvGroup;
tvFrame.material = tvFrameMaterial;

let tvScreen = BABYLON.MeshBuilder.CreatePlane("tvScreen", {
    width: 2,
    height: 1.3
}, scene);
tvScreen.parent = tvGroup;
tvScreen.position.z = 0.06;
tvScreen.material = tvScreenMaterial;

let tvStand = BABYLON.MeshBuilder.CreateBox("tvStand", {
    width: 0.6,
    height: 0.1,
    depth: 0.3
}, scene);
tvStand.parent = tvGroup;
tvStand.position.y = -0.8;
tvStand.material = tvFrameMaterial;

tvGroup.position = new BABYLON.Vector3(0, 1.5, roomDepth/2 - 0.05);

function addSimpleShelf(positionX, positionY, positionZ, rotationY, width) {
    let shelfGroup = new BABYLON.TransformNode("simpleShelf_" + Date.now(), scene);
    
    let woodMaterial = new BABYLON.StandardMaterial("woodMat", scene);
    woodMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
    woodMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    
    let shelf = BABYLON.MeshBuilder.CreateBox("shelfBody", {
        width: width,
        height: 0.15,
        depth: 0.3
    }, scene);
    shelf.parent = shelfGroup;
    shelf.material = woodMaterial;
    
    let book = BABYLON.MeshBuilder.CreateBox("book", {
        width: 0.2,
        height: 0.25,
        depth: 0.15
    }, scene);
    book.parent = shelfGroup;
    book.position.y = 0.2;
    book.position.x = -width/3;
    
    let bookMaterial = new BABYLON.StandardMaterial("bookMat", scene);
    bookMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.2, 0.7);
    book.material = bookMaterial;
    
    let vase = BABYLON.MeshBuilder.CreateCylinder("vase", {
        height: 0.3,
        diameter: 0.1,
        tessellation: 16
    }, scene);
    vase.parent = shelfGroup;
    vase.position.y = 0.225;
    vase.position.x = width/3;
    
    let vaseMaterial = new BABYLON.StandardMaterial("vaseMat", scene);
    vaseMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.1, 0.1);
    vase.material = vaseMaterial;
    
    shelfGroup.position = new BABYLON.Vector3(positionX, positionY, positionZ);
    shelfGroup.rotation.y = rotationY;
    
    if (shadowGenerator) {
        shadowGenerator.addShadowCaster(shelf);
        shadowGenerator.addShadowCaster(book);
        shadowGenerator.addShadowCaster(vase);
        shelf.receiveShadows = true;
    }
    
    return shelfGroup;
}

addSimpleShelf(
    -2.5,                // X pozisyonu - sol duvar
    1.5,                 // Y pozisyonu
    roomDepth/2 - 0.2,   // Z pozisyonu - duvardan daha uzak (0.2 birim)
    0,                   // Rotasyon
    1.2                  // Genişlik
);

addSimpleShelf(
    roomWidth/2 - 0.2,   // X pozisyonu - sağ duvar (0.2 birim mesafe)
    1.4,                 // Y pozisyonu
    2.0,                 // Z pozisyonu
    Math.PI / 2,         // Rotasyon - 90 derece
    1.2                  // Genişlik
);

addSimpleShelf(
    -roomWidth/2 + 0.2,  // X pozisyonu - sol duvar (0.2 birim mesafe)
    1.6,                 // Y pozisyonu - yüksek
    -1.0,                // Z pozisyonu
    -Math.PI / 2,        // Rotasyon - -90 derece
    1.2                  // Genişlik
);

function debugCameraPosition() {
    if (typeof camera !== 'undefined' && camera) {
        console.log(`📷 Kamera pozisyonu: x=${camera.position.x.toFixed(2)}, y=${camera.position.y.toFixed(2)}, z=${camera.position.z.toFixed(2)}`);
        console.log(`📷 Kamera target: x=${camera.target.x.toFixed(2)}, y=${camera.target.y.toFixed(2)}, z=${camera.target.z.toFixed(2)}`);
    }
}

function debugScene() {
    console.log("🔍 SAHNE DEBUG BİLGİLERİ:");
    console.log(`📦 Toplam mesh sayısı: ${scene.meshes.length}`);
    console.log(`💡 Toplam ışık sayısı: ${scene.lights.length}`);
    console.log(`🎭 Toplam materyal sayısı: ${scene.materials.length}`);
    
    let paintingMeshes = scene.meshes.filter(mesh => mesh.name.includes('painting'));
    console.log(`🖼️ Tablo mesh'leri: ${paintingMeshes.length} adet`);
    paintingMeshes.forEach(mesh => {
        console.log(`  - ${mesh.name}: visible=${mesh.isVisible}, position=(${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)})`);
    });
    
    debugCameraPosition();
}

// Bu fonksiyonu çağırarak debug yapın
debugScene();


    function addRealisticPlant(positionX, positionZ, scale, plantType = "ficus") {
        let plantGroup = new BABYLON.TransformNode("plantGroup_" + Date.now(), scene);
        
        let potMaterial = new BABYLON.StandardMaterial("potMaterial", scene);
        potMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
        potMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        potMaterial.roughness = 0.8;
        
        let pot = BABYLON.MeshBuilder.CreateCylinder("pot", {
            height: 0.6,
            diameterTop: 0.8,
            diameterBottom: 0.6,
            tessellation: 16
        }, scene);
        pot.parent = plantGroup;
        pot.position.y = 0.3;
        pot.material = potMaterial;
        
        let soilMaterial = new BABYLON.StandardMaterial("soilMaterial", scene);
        soilMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.2, 0.1);
        
        let soil = BABYLON.MeshBuilder.CreateCylinder("soil", {
            height: 0.05,
            diameter: 0.75,
            tessellation: 16
        }, scene);
        soil.parent = plantGroup;
        soil.position.y = 0.6;
        soil.material = soilMaterial;
        
        if (plantType === "ficus") {
            createFicusPlant(plantGroup);
        } else if (plantType === "palm") {
            createPalmPlant(plantGroup);
        } else if (plantType === "monstera") {
            createMonsteraPlant(plantGroup);
        }
        
        plantGroup.position = new BABYLON.Vector3(positionX, 0, positionZ);
        plantGroup.scaling = new BABYLON.Vector3(scale, scale, scale);
        
        if (shadowGenerator) {
            shadowGenerator.addShadowCaster(pot);
            shadowGenerator.addShadowCaster(soil);
            pot.receiveShadows = true;
            soil.receiveShadows = true;
        }
        
        return plantGroup;
    }

    function createFicusPlant(parentGroup) {
        let trunkMaterial = new BABYLON.StandardMaterial("trunkMaterial", scene);
        trunkMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
        
        let trunk = BABYLON.MeshBuilder.CreateCylinder("trunk", {
            height: 1.0,
            diameterTop: 0.08,
            diameterBottom: 0.12,
            tessellation: 8
        }, scene);
        trunk.parent = parentGroup;
        trunk.position.y = 1.1;
        trunk.material = trunkMaterial;
        
        let leafMaterial = new BABYLON.StandardMaterial("leafMaterial", scene);
        leafMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.6, 0.1);
        leafMaterial.specularColor = new BABYLON.Color3(0.05, 0.1, 0.05);
        leafMaterial.backFaceCulling = false;
        
        for (let i = 0; i < 8; i++) {
            let angle = (i / 8) * Math.PI * 2;
            let height = 1.4 + Math.random() * 0.4;
            let distance = 0.3 + Math.random() * 0.2;
            
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

    function createPalmPlant(parentGroup) {
        let trunkMaterial = new BABYLON.StandardMaterial("palmTrunkMaterial", scene);
        trunkMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.3, 0.1);
        
        let trunk = BABYLON.MeshBuilder.CreateCylinder("palmTrunk", {
            height: 1.5,
            diameterTop: 0.1,
            diameterBottom: 0.15,
            tessellation: 12
        }, scene);
        trunk.parent = parentGroup;
        trunk.position.y = 1.35;
        trunk.material = trunkMaterial;
        
        let palmLeafMaterial = new BABYLON.StandardMaterial("palmLeafMaterial", scene);
        palmLeafMaterial.diffuseColor = new BABYLON.Color3(0.0, 0.7, 0.0);
        palmLeafMaterial.backFaceCulling = false;
        
        for (let i = 0; i < 6; i++) {
            let angle = (i / 6) * Math.PI * 2;
            
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

    function createMonsteraPlant(parentGroup) {
        let leafMaterial = new BABYLON.StandardMaterial("monsteraLeafMaterial", scene);
        leafMaterial.diffuseColor = new BABYLON.Color3(0.05, 0.5, 0.05);
        leafMaterial.backFaceCulling = false;
        
        let stem = BABYLON.MeshBuilder.CreateCylinder("monsteraStem", {
            height: 0.8,
            diameter: 0.06,
            tessellation: 8
        }, scene);
        stem.parent = parentGroup;
        stem.position.y = 1.0;
        stem.material = new BABYLON.StandardMaterial("stemMat", scene);
        stem.material.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.1);
        
        for (let i = 0; i < 5; i++) {
            let angle = (i / 5) * Math.PI * 2;
            let height = 1.2 + i * 0.2;
            
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

    addRealisticPlant(-4.5, -4.5, 0.8, "ficus");
    addRealisticPlant(4.5, -4.5, 0.7, "palm");
    addRealisticPlant(-4.5, 4.5, 0.9, "monstera");
    addRealisticPlant(4.5, 4.5, 0.8, "ficus");

}
    
    function loadFurnitureMeshes() {
        console.log("Mobilya modellerini yüklemeye başlıyor...");
        
        console.log("Koltuk modeli yükleniyor: models/sofa.glb");
        BABYLON.SceneLoader.ImportMesh("", "models/", "sofa.glb", scene, function(newMeshes) {
            console.log("Koltuk modeli başarıyla yüklendi, mesh sayısı:", newMeshes.length);
            
            let sofa = new BABYLON.TransformNode("sofaTemplate", scene);
            
            sofa.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            sofa.rotation.y = Math.PI;
            
            let sofaMaterial = new BABYLON.StandardMaterial("sofaMaterial", scene);
            sofaMaterial.diffuseTexture = new BABYLON.Texture("textures/fabric_blue.jpg", scene, false, false, null, assetLoaded);
            sofaMaterial.diffuseTexture.uScale = 2;
            sofaMaterial.diffuseTexture.vScale = 2;
            sofaMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            
            newMeshes.forEach(mesh => {
                if (mesh.name !== "__root__") {
                    mesh.parent = sofa;
                    if (mesh.material) {
                        mesh.material = sofaMaterial;
                        mesh.receiveShadows = true;
                    }
                    mesh.isVisible = false;
                }
            });
            
            sofa.isVisible = false;
            furnitureModels.sofa = sofa;
            console.log("Koltuk modeli hazır: furnitureModels.sofa");
            
        }, null, function(scene, message) {
            console.error("Koltuk yüklenirken hata:", message);
            assetLoaded();
        });
        
        console.log("Masa modeli yükleniyor: models/table.glb");
        BABYLON.SceneLoader.ImportMesh("", "models/", "table.glb", scene, function(newMeshes) {
            console.log("Masa modeli başarıyla yüklendi, mesh sayısı:", newMeshes.length);
            
            let table = new BABYLON.TransformNode("tableTemplate", scene);
            
            table.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            
            let tableMaterial = new BABYLON.StandardMaterial("tableMaterial", scene);
            tableMaterial.diffuseTexture = new BABYLON.Texture("textures/wood.jpg", scene, false, false, null, assetLoaded);
            tableMaterial.diffuseTexture.uScale = 1;
            tableMaterial.diffuseTexture.vScale = 1;
            tableMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            
            newMeshes.forEach(mesh => {
                if (mesh.name !== "__root__") {
                    mesh.parent = table;
                    if (mesh.material) {
                        mesh.material = tableMaterial;
                        mesh.receiveShadows = true;
                    }
                    mesh.isVisible = false;
                }
            });
            
            table.isVisible = false;
            furnitureModels.table = table;
            console.log("Masa modeli hazır: furnitureModels.table");
            
        }, null, function(scene, message) {
            console.error("Masa yüklenirken hata:", message);
            assetLoaded();
        });
        
        console.log("Sandalye modeli yükleniyor: models/chair.glb");
        BABYLON.SceneLoader.ImportMesh("", "models/", "chair.glb", scene, function(newMeshes) {
            console.log("Sandalye modeli başarıyla yüklendi, mesh sayısı:", newMeshes.length);
            
            let chair = new BABYLON.TransformNode("chairTemplate", scene);
            
            chair.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            
            let chairMaterial = new BABYLON.StandardMaterial("chairMaterial", scene);
            chairMaterial.diffuseTexture = new BABYLON.Texture("textures/chair_texture.jpg", scene, false, false, null, assetLoaded);
            chairMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            
            newMeshes.forEach(mesh => {
                if (mesh.name !== "__root__") {
                    mesh.parent = chair;
                    if (mesh.material) {
                        mesh.material = chairMaterial;
                        mesh.receiveShadows = true;
                    }
                    mesh.isVisible = false;
                }
            });
            
            chair.isVisible = false;
            furnitureModels.chair = chair;
            console.log("Sandalye modeli hazır: furnitureModels.chair");
            
        }, null, function(scene, message) {
            console.error("Sandalye yüklenirken hata:", message);
            assetLoaded();
        });
        
        console.log("Lamba modeli yükleniyor: models/lamp.glb");
        BABYLON.SceneLoader.ImportMesh("", "models/", "lamp.glb", scene, function(newMeshes) {
            console.log("Lamba modeli başarıyla yüklendi, mesh sayısı:", newMeshes.length);
            
            let lamp = new BABYLON.TransformNode("lampTemplate", scene);
            
            lamp.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            
            let lampMaterial = new BABYLON.StandardMaterial("lampBaseMaterial", scene);
            lampMaterial.diffuseTexture = new BABYLON.Texture("textures/metal.jpg", scene, false, false, null, assetLoaded);
            lampMaterial.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
            
            newMeshes.forEach(mesh => {
                if (mesh.name !== "__root__") {
                    mesh.parent = lamp;
                    if (mesh.material) {
                        mesh.material = lampMaterial;
                        mesh.receiveShadows = true;
                    }
                    mesh.isVisible = false;
                }
            });
            
            lamp.isVisible = false;
            furnitureModels.lamp = lamp;
            console.log("Lamba modeli hazır: furnitureModels.lamp");
            
        }, null, function(scene, message) {
            console.error("Lamba yüklenirken hata:", message);
            
        
            sofa.isVisible = false;
            furnitureModels.sofa = sofa;
            console.log("Koltuk modeli hazır: furnitureModels.sofa");
            
        }, null, function(scene, message) {
            console.error("Koltuk yüklenirken hata:", message);
            assetLoaded(); 
        });
        
        console.log("Masa modeli yükleniyor: models/table.glb");
        BABYLON.SceneLoader.ImportMesh("", "models/", "table.glb", scene, function(newMeshes) {
            console.log("Masa modeli başarıyla yüklendi, mesh sayısı:", newMeshes.length);
            
            let table = new BABYLON.TransformNode("tableTemplate", scene);
            
            
            table.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
        
            let tableMaterial = new BABYLON.StandardMaterial("tableMaterial", scene);
            tableMaterial.diffuseTexture = new BABYLON.Texture("textures/wood.jpg", scene, false, false, null, assetLoaded);
            tableMaterial.diffuseTexture.uScale = 1;
            tableMaterial.diffuseTexture.vScale = 1;
            tableMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            
            
            newMeshes.forEach(mesh => {
                if (mesh.name !== "__root__") {
                    mesh.parent = table;
                    if (mesh.material) {
                        mesh.material = tableMaterial;
                        mesh.receiveShadows = true;
                    }
                    
                    mesh.isVisible = false;
                }
            });
            
            table.isVisible = false;
            furnitureModels.table = table;
            console.log("Masa modeli hazır: furnitureModels.table");
            
        }, null, function(scene, message) {
            console.error("Masa yüklenirken hata:", message);
            assetLoaded(); 
        });
        
        console.log("Sandalye modeli yükleniyor: models/chair.glb");
        BABYLON.SceneLoader.ImportMesh("", "models/", "chair.glb", scene, function(newMeshes) {
            console.log("Sandalye modeli başarıyla yüklendi, mesh sayısı:", newMeshes.length);
            
        
            let chair = new BABYLON.TransformNode("chairTemplate", scene);
            
            
            chair.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            
            
            let chairMaterial = new BABYLON.StandardMaterial("chairMaterial", scene);
            chairMaterial.diffuseTexture = new BABYLON.Texture("textures/chair_texture.jpg", scene, false, false, null, assetLoaded);
            chairMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            
            newMeshes.forEach(mesh => {
                if (mesh.name !== "__root__") {
                    mesh.parent = chair;
                    if (mesh.material) {
                        mesh.material = chairMaterial;
                        mesh.receiveShadows = true;
                    }
                    mesh.isVisible = false;
                }
            });
            
            chair.isVisible = false;
            furnitureModels.chair = chair;
            console.log("Sandalye modeli hazır: furnitureModels.chair");
            
        }, null, function(scene, message) {
            console.error("Sandalye yüklenirken hata:", message);
            assetLoaded(); 
        });
        
        console.log("Lamba modeli yükleniyor: models/lamp.glb");
        BABYLON.SceneLoader.ImportMesh("", "models/", "lamp.glb", scene, function(newMeshes) {
            console.log("Lamba modeli başarıyla yüklendi, mesh sayısı:", newMeshes.length);
            
            
            let lamp = new BABYLON.TransformNode("lampTemplate", scene);
            
           
            lamp.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            
           
            let lampMaterial = new BABYLON.StandardMaterial("lampBaseMaterial", scene);
            lampMaterial.diffuseTexture = new BABYLON.Texture("textures/metal.jpg", scene, false, false, null, assetLoaded);
            lampMaterial.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);
            
            
            newMeshes.forEach(mesh => {
                if (mesh.name !== "__root__") {
                    mesh.parent = lamp;
                    if (mesh.material) {
                        mesh.material = lampMaterial;
                        mesh.receiveShadows = true;
                    }
                    
                    mesh.isVisible = false;
                }
            });
            
           
            lamp.isVisible = false;
            furnitureModels.lamp = lamp;
            console.log("Lamba modeli hazır: furnitureModels.lamp");
            
        }, null, function(scene, message) {
            console.error("Lamba yüklenirken hata:", message);
            assetLoaded(); 
        });

console.log("Yatak modeli yükleniyor: models/bed.glb");
BABYLON.SceneLoader.ImportMesh("", "models/", "bed.glb", scene, function(newMeshes) {
    console.log("Yatak modeli başarıyla yüklendi, mesh sayısı:", newMeshes.length);
    
    let bed = new BABYLON.TransformNode("bedTemplate", scene);
    
    bed.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
    
    bed.rotation = new BABYLON.Vector3(0, 0, 0);
    bed.rotationQuaternion = null;
    
    newMeshes.forEach((mesh, index) => {
        if (mesh.name !== "__root__") {
            mesh.parent = bed;
            mesh.receiveShadows = true;
            
            mesh.rotation = new BABYLON.Vector3(0, 0, 0);
            mesh.rotationQuaternion = null;
            
            mesh.isVisible = false;
            mesh.setEnabled(true);
        }
    });
    
    bed.isVisible = false;
    furnitureModels.bed = bed;
    console.log("Yatak modeli hazır: furnitureModels.bed");
    
}, null, function(scene, message) {
    console.error("Yatak yüklenirken hata:", message);
    assetLoaded();
});
        
        setTimeout(() => {
            console.log("--------- MODEL YÜKLEME DURUMU ---------");
            console.log("Yüklenen modeller:", Object.keys(furnitureModels).join(", "));
            
            const expectedModels = ["sofa", "table", "chair", "lamp","bed"];
            const missingModels = expectedModels.filter(model => !furnitureModels[model]);
            
            if (missingModels.length > 0) {
                console.warn("EKSİK MODELLER:", missingModels.join(", "));
            } else {
                console.log("Tüm modeller başarıyla yüklendi!");
            }
            
            console.log("Toplam yüklenen asset sayısı:", loadedAssets);
            console.log("----------------------------------------");
        }, 5000);
    }
    
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
    
    function placeFurniture(position) {
        console.log("placeFurniture çağrıldı - Seçilen mobilya:", selectedFurnitureType);
        
        if (!furnitureModels[selectedFurnitureType]) {
            console.warn("Model bulunamadı:", selectedFurnitureType);
            return;
        }
        
        let newID = selectedFurnitureType + "_" + Date.now();
        let newFurniture = new BABYLON.TransformNode(newID, scene);
        
        switch(selectedFurnitureType) {
            case 'sofa':
                newFurniture.position = new BABYLON.Vector3(position.x, 0, position.z);
                newFurniture.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
                newFurniture.rotation.y = Math.PI;
                break;
            case 'table':
                newFurniture.position = new BABYLON.Vector3(position.x, 0, position.z);
                newFurniture.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
                break;
            case 'chair':
    console.log("Sandalye yerleştiriliyor...");
    
    newFurniture.position = new BABYLON.Vector3(position.x, 0, position.z);
    newFurniture.scaling = new BABYLON.Vector3(1, 1, 1);
    
    newFurniture.rotationQuaternion = null;
    newFurniture.rotation = new BABYLON.Vector3(0, 0, 0);
    
    console.log("Sandalye büyük boyutta yerleştirildi");
    
    setTimeout(() => {
        try {
            const childMeshes = newFurniture.getChildMeshes();
            if (childMeshes.length > 0) {
                const bbox = childMeshes[0].getBoundingInfo();
                console.log("Child mesh bounding box bulundu");
                
                const size = bbox.boundingBox.extendSizeWorld;
                const height = size.y * 2;
                
                console.log("Sandalye yüksekliği:", height);
                
                if (height > 3) {
                    const targetHeight = 1.5;
                    const scale = targetHeight / height;
                    newFurniture.scaling = new BABYLON.Vector3(scale, scale, scale);
                    console.log("Sandalye ölçeklendi:", scale);
                }
                
                setTimeout(() => {
                    let minY = 0;
                    childMeshes.forEach(mesh => {
                        const meshBBox = mesh.getBoundingInfo();
                        const meshMinY = meshBBox.boundingBox.minimumWorld.y;
                        if (meshMinY < minY) minY = meshMinY;
                    });
                    
                    newFurniture.position.y = -minY + 0.05;
                    console.log("Sandalye zemine oturtuldu, Y pozisyonu:", newFurniture.position.y);
                }, 100);
            }
            
        } catch (error) {
            console.error("Sandalye pozisyon hatası:", error);
            newFurniture.position.y = 0.5;
            console.log("Manuel pozisyon ayarlandı");
        }
    }, 300);
    break;

case 'lamp':
    console.log("Lamba tavana sabitleniyor...");
    
    newFurniture.position = new BABYLON.Vector3(position.x, 3.3, position.z);
    
    newFurniture.rotation = new BABYLON.Vector3(0, 0, 0);
    
    newFurniture.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
    
    let ceilingMount = BABYLON.MeshBuilder.CreateCylinder("ceilingMount_" + Date.now(), {
        height: 0.02,
        diameter: 0.08,
        tessellation: 8
    }, scene);
    ceilingMount.position = new BABYLON.Vector3(position.x, 4.99, position.z);
    
    let mountMaterial = new BABYLON.StandardMaterial("mountMaterial", scene);
    mountMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
    ceilingMount.material = mountMaterial;
    
    let lampLight = new BABYLON.SpotLight("lampLight_" + Date.now(), 
        new BABYLON.Vector3(0, -0.4, 0),
        new BABYLON.Vector3(0, -1, 0),
        Math.PI / 3,
        2,
        scene);
    
    lampLight.parent = newFurniture;
    lampLight.intensity = 1.4;
    lampLight.diffuse = new BABYLON.Color3(1, 0.9, 0.7);
    lampLight.range = 7;
    
    BABYLON.Animation.CreateAndStartAnimation(
        "swayAnimation",
        newFurniture,
        "rotation.z",
        30,
        300,
        0,
        Math.PI / 180 * 3,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
    );
    
    console.log("Büyütülmüş lamba tavana sabitlendi ve hafifçe sallanıyor");
    break;

   case 'bed':
    console.log("Yatak yerleştiriliyor...");
    
    newFurniture.position = new BABYLON.Vector3(position.x, 0, position.z);
    
    newFurniture.rotationQuaternion = null;
    newFurniture.rotation = new BABYLON.Vector3(0, 0, 0);
    
    newFurniture.scaling = new BABYLON.Vector3(0.3, 0.3, 0.3);

    break;

        }
        
        console.log(`${selectedFurnitureType} yerleştiriliyor:`, 
                    "pozisyon:", newFurniture.position, 
                    "ölçek:", newFurniture.scaling,
                    "döndürme:", newFurniture.rotation);
        
        let original = furnitureModels[selectedFurnitureType];
        let childMeshes = original.getChildMeshes();
        console.log(`${selectedFurnitureType} için ${childMeshes.length} mesh bulundu`);
        
        console.log(`Orijinal model bilgileri - ${selectedFurnitureType}:`, 
                "pozisyon:", original.position, 
                "ölçek:", original.scaling);
        
        let material = new BABYLON.StandardMaterial(selectedFurnitureType + "Material_" + newID, scene);
        switch(selectedFurnitureType) {
            case 'sofa':
                material.diffuseColor = new BABYLON.Color3(0, 0, 0.8);
                break;
            case 'table':
                material.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.05);
                break;
            case 'chair':
                material.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
                break;
            case 'lamp':
                material.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.2);
                material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0);
                break;
            case 'bed':
                material.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.5);
                break;   
        }
        
        childMeshes.forEach(originalMesh => {
            try {
                let clonedMesh = originalMesh.clone(originalMesh.name + "_" + newID);
                clonedMesh.parent = newFurniture;
                
                if(selectedFurnitureType !== 'bed') {
                    clonedMesh.material = material;
                }
                
                clonedMesh.isVisible = true;
                clonedMesh.receiveShadows = true;
                
                if (shadowGenerator) {
                    shadowGenerator.addShadowCaster(clonedMesh);
                }
                
                clonedMeshes.push(clonedMesh);
            } catch (error) {
                console.error("Mesh klonlama hatası:", error);
            }
        });
        
        console.log(`${selectedFurnitureType} için ${clonedMeshes.length} mesh klonlandı`);
        
        if (clonedMeshes.length === 0) {
            console.warn(`${selectedFurnitureType} için hiç mesh klonlanamadı! Test küpü oluşturuluyor...`);
            let testCube = BABYLON.MeshBuilder.CreateBox("testCube_" + newID, {size: 1}, scene);
            testCube.parent = newFurniture;
            testCube.material = material;
        }
        
        return newFurniture;
    }
    
    function selectFurnitureType(type) {
        console.log(`Mobilya tipi seçildi: ${type}`);
        document.querySelectorAll('.furniture-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById(type + '-btn').classList.add('selected');
        
        selectedFurnitureType = type;
        placementMode = true;
        
        clearSelection();
    }
    
function selectFurnitureObject(pickInfo) {
    clearSelection();
    
    if (pickInfo.hit && pickInfo.pickedMesh) {
        console.log("Tıklanan mesh:", pickInfo.pickedMesh.name);
        
        let currentMesh = pickInfo.pickedMesh;
        let parentNode = currentMesh;
        
        while (parentNode.parent && !parentNode.name.includes("Template")) {
            console.log("Parent yukarı:", parentNode.name, "->", parentNode.parent.name);
            parentNode = parentNode.parent;
        }
        
        console.log("Seçilecek üst nesne:", parentNode.name);
        
        if (parentNode.name.includes("Template")) {
            console.log("Bu bir template modelidir, seçilemez!");
            return false;
        }
        
        if (parentNode && (parentNode.name.includes("sofa") || 
               parentNode.name.includes("table") || 
               parentNode.name.includes("chair") || 
               parentNode.name.includes("lamp") ||
               parentNode.name.includes("bed")))                  {
            selectedFurniture = parentNode;
            
            createSelectionHighlight(selectedFurniture);
            
            console.log("Mobilya seçildi:", selectedFurniture.name);
            return true;
        }
    }
    
    selectedFurniture = null;
    return false;
}
    
function createSelectionHighlight(furniture) {
    if (highlightMesh) {
        highlightMesh.dispose();
    }
    
    console.log("Vurgulama oluşturuluyor:", furniture.name);
    
    try {
        let boundingInfo = furniture.getHierarchyBoundingVectors(true);
        let min = boundingInfo.min;
        let max = boundingInfo.max;
        
        let size = max.subtract(min);
        let center = min.add(max).scale(0.5);
        
        console.log("Mobilya boyutları:", size);
        console.log("Mobilya merkezi:", center);
        
        highlightMesh = BABYLON.MeshBuilder.CreateBox("selectionHighlight", {
            width: size.x + 0.1,
            height: size.y + 0.1,
            depth: size.z + 0.1
        }, scene);
        
        highlightMesh.position = center;
        
        let highlightMaterial = new BABYLON.StandardMaterial("highlightMaterial", scene);
        highlightMaterial.diffuseColor = new BABYLON.Color3(0, 0.5, 1);
        highlightMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        highlightMaterial.alpha = 0.3;
        highlightMaterial.wireframe = false;
        highlightMesh.material = highlightMaterial;
        
        highlightMesh.renderingGroupId = 1;
        
        console.log("Vurgulama kutusu oluşturuldu");
    } catch (error) {
        console.error("Vurgulama kutusu oluşturulurken hata:", error);
        
        highlightMesh = BABYLON.MeshBuilder.CreateBox("selectionHighlight", {
            width: 1,
            height: 1,
            depth: 1
        }, scene);
        
        highlightMesh.position = furniture.position.clone();
        
        highlightMesh.scaling = new BABYLON.Vector3(
            furniture.scale.x * 2,
            furniture.scaling.y * 2,
            furniture.scaling.z * 2
        );
        
        let highlightMaterial = new BABYLON.StandardMaterial("highlightMaterial", scene);
        highlightMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        highlightMaterial.alpha = 0.3;
        highlightMesh.material = highlightMaterial;
    }
}
    
    function clearSelection() {
        if (highlightMesh) {
            highlightMesh.dispose();
            highlightMesh = null;
        }
        selectedFurniture = null;
    }
    
    function deleteFurniture() {
        if (selectedFurniture) {
            console.log("Mobilya siliniyor:", selectedFurniture.name);
            
            if (highlightMesh) {
                highlightMesh.dispose();
                highlightMesh = null;
            }
            
            selectedFurniture.getChildMeshes().forEach(mesh => {
                if (shadowGenerator) {
                    shadowGenerator.removeShadowCaster(mesh);
                }
                mesh.dispose();
            });
            
            selectedFurniture.dispose();
            selectedFurniture = null;
            
            console.log("Mobilya silindi");
        }
    }
    
function setupInteractions() {
    scene.onPointerDown = function(evt, pickInfo) {
        if (evt.button === 0) {
            
            if (pickInfo.hit && pickInfo.pickedMesh) {
                console.log("Tıklanan mesh:", pickInfo.pickedMesh.name);
                
                if (pickInfo.pickedMesh.name === "leftSash") {
                    console.log("Sol pencere kanadı tıklandı!");
                    if (window.toggleSash && window.leftSashRef) {
                        window.toggleSash(window.leftSashRef, -1);
                    }
                    return;
                }
                
                if (pickInfo.pickedMesh.name === "rightSash") {
                    console.log("Sağ pencere kanadı tıklandı!");
                    if (window.toggleSash && window.rightSashRef) {
                        window.toggleSash(window.rightSashRef, 1);
                    }
                    return;
                }
            }
            
            if (placementMode && selectedFurnitureType && pickInfo.hit && pickInfo.pickedMesh === ground) {
                let newFurniture = placeFurniture(pickInfo.pickedPoint);
                console.log("Yeni mobilya yerleştirildi:", newFurniture.name);
            } else {
                selectFurnitureObject(pickInfo);
                placementMode = false;
            }
        }
    };
        
        scene.onKeyboardObservable.add((kbInfo) => {
            switch (kbInfo.type) {
                case BABYLON.KeyboardEventTypes.KEYDOWN:
                    switch (kbInfo.event.key.toLowerCase()) {
                        case "w":
                            camera.position.addInPlace(camera.getDirection(BABYLON.Axis.Z).scale(0.1));
                            break;
                        case "s":
                            camera.position.subtractInPlace(camera.getDirection(BABYLON.Axis.Z).scale(0.1));
                            break;
                        case "a":
                            camera.position.subtractInPlace(camera.getDirection(BABYLON.Axis.X).scale(0.1));
                            break;
                        case "d":
                            camera.position.addInPlace(camera.getDirection(BABYLON.Axis.X).scale(0.1));
                            break;
                        case "r":
                            if (selectedFurniture) {
                                selectedFurniture.rotation.y += Math.PI / 4;
                                
                                if (highlightMesh) {
                                    highlightMesh.rotation = selectedFurniture.rotation.clone();
                                }
                                
                                console.log("Mobilya döndürüldü:", selectedFurniture.name);
                            }
                            break;
                        case "delete":
                            if (selectedFurniture) {
                                deleteFurniture();
                            }
                            break;
                    }
                    break;
            }
        });
        
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
        
        document.getElementById('sofa-btn').addEventListener('click', function() {
            console.log("Koltuk butonu tıklandı");
            selectFurnitureType('sofa');
        });
        
        document.getElementById('table-btn'). addEventListener('click', function() {
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

        document.getElementById('bed-btn').addEventListener('click', function() {
            console.log("Yatak butonu DOM'da bulundu ve tıklandı");
            selectFurnitureType('bed');
            
            // Manuel olarak da kontrol et:
            this.classList.add('selected');
            console.log("Manuel selected class eklendi");
        });
    }
    
    // Sahneyi oluştur ve başlat
    scene = createScene();
    
    // Duvarları ve mobilyaları oluştur
    createWalls();
    loadFurnitureMeshes();
    
    // ÖNEMLİ: OTOMATİK MOBİLYA YERLEŞTİRME KODUNU DEVRE DIŞI BIRAKTIK
    // Artık hiçbir mobilya otomatik olarak yerleştirilmiyor
    
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