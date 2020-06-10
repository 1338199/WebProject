
var activeScene;
var camera;
var renderer;
var loadManager;
var computeManager;
var sceneManager;
var uiManager;
var assetManager;
var inputManager;
var colorIndex = 0;
var musicIndex = 0;
var helpindex = 0;
var gamesize = 1;
var sceneIndex = 0;
window.onload = Initialize;
window.onresize = AdaptWindow;

function InitializeComputeManager(){
    // struct to control the animation
    computeManager = {
        //deltaTime
        deltaTime: 0.0,
        //the time of first frame
        firstFrame: performance.now(),
        //generate a randint between min and max
        randInt: function (min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
    };
}

function InitializeSceneManager(){
    //struct to manage the scene
    sceneManager = {
        //array to store scenes
        scenes: {},
        //add a new scene
        addScene: function (scene) {
            if(scene.name === ""){
                throw "Scene.name property is required!";
            }
            scene.isReady = false;
            this.scenes[scene.name] = scene;
        },
        // loading a scene with a particular name
        loadScene: function (name) {
            if(activeScene !== undefined){
                uiManager.loader.show("Loading...");
                //remove current active scene
                while(activeScene.children.length > 0){
                    activeScene.remove(activeScene.children[activeScene.children.length-1]);
                }
                if(activeScene.onDestroy !== undefined){
                    activeScene.onDestroy();
                }
            }
            //if there is no active scene now
            activeScene = undefined;
            setTimeout(function(){
                //get the scene from scenes using its name
                activeScene = sceneManager.scenes[name];
                //start the game after 1s
                setTimeout(function () {
                    Start();
                    uiManager.loader.hide();
                },1000);
            },1000);
        }
    };
}
function InitializeUIManager(){
    //struct to manage the ui
    uiManager = {
        menus: {},
        // show the menu
        showMenu: function (param) {
            //hide all menu items now
            this.hideMenu();
            //show the particular menu
            this.menus[param].removeClass("hide");
        },
        hideMenu: function (param) {
            //hide all menu items
            if(param === undefined){
                for(var key in this.menus){
                    this.menus[key].addClass("hide");
                }
            }else{
                //hide the particular menu item
                this.menus[param].addClass("hide");
            }
        },
        //add a menu item to menus
        addMenu: function (param) {
            this.menus[param.attr("id")] = param;
        },
        //loading label menu
        loader: {
            element: $("#loader"),
            //show loading label
            show: function(text){
                this.element.find("#label").html(text);
                //not hide
                this.element.removeClass("hide");
                // if(callback !== undefined){
                //     callback();
                // }
            },
            //hide loading label
            hide: function () {
                this.element.addClass("hide");
            }
        }
    };
}
//initial the assets
function InitializeAssetManager(){
    assetManager = {
        objects: {},
        cameraSize: (typeof window.orientation !== 'undefined') ? 5 : 30,
        shadowSize: (typeof window.orientation !== 'undefined') ? 512 : 512 * 6,
        loader: new Array(),
        //initial the object
        addObject: function (param) {
            if(param.name === ""){
                throw "Obj.name property is Required!";
            }
            this.objects[param.name] = param;
        }
    }
}

function InitializeLoaderManager(){
    function OnComplete(e){
        //show finish loading if loading completed
        uiManager.loader.show("Finished Loading");
        setTimeout(function () {
            uiManager.loader.hide();
        }, 2000);
        InitializeScene();
    }
    function OnProgress(url, currentLoaded, totalItem){
        uiManager.loader.show("Loading " + currentLoaded.toString() + " / " + totalItem.toString() + " items (" + Math.ceil((currentLoaded/totalItem*100.0)).toString()+"%)");
    }
    function OnError(e){
        throw e;
    }
    loadManager = new THREE.LoadingManager(OnComplete,OnProgress,OnError);
}

function Initialize(windowEvent){

    function InitializeInputManager(){
        inputManager = {
            canvas: $("#main_canvas")[0],
            position: new THREE.Vector2(),
            shoot: false,
            exits: false,
        };
        window.onmousemove = function (e) {
            inputManager.position.set(e.pageX/this.innerWidth - 0.5,e.pageY/this.innerHeight - 0.5);
        };
        window.onkeypress = function (e) {
            if (e.keyCode === 115){
                inputManager.shoot = true;

            }
            else if(e.keyCode === 101){
                inputManager.exits = true;
            }
            else if(e.keyCode === 97){
                inputManager.accelerate = true;
            }
            else if(e.keyCode === 113){
                inputManager.slowdown = true;
            }
        }
    }

    InitializeComputeManager();
    InitializeSceneManager();
    InitializeUIManager();
    InitializeAssetManager();
    InitializeLoaderManager();
    InitializeInputManager();

    InitializeInput();

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({
        canvas: $('#main_canvas')[0],
        antialias: true,
    });
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.shadowMap.enabled = true;

    AdaptWindow(windowEvent);
    Prepare();
}

function AdaptWindow(windowEvent){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function PrepareCubeMapLoader(url, ext){
    var urls = [
        url + "px" + ext,
        url + "nx" + ext,
        url + "py" + ext,
        url + "ny" + ext,
        url + "pz" + ext,
        url + "nz" + ext
    ];
    function OnLoad(res){
        res.format = THREE.RGBFormat;
        assetManager.cubeMap = res;
    }
    assetManager.loader.push(function(){
        assetManager.cubeMap= new THREE.CubeTextureLoader(loadManager).load(urls,OnLoad);
    });
}

function PrepareObjectLoader(url, onLoad){
    assetManager.loader.push(function(){
        new THREE.FBXLoader(loadManager).load(url,onLoad);
    });
}
//Called ONCE per web load
function Prepare(){
    PrepareCubeMapLoader("img/cubemap/dark-s_",".jpg");
    PrepareObjectLoader("model/StarSparrow01.fbx",function (res) {
        res.traverse(function (child) {
            if (child.isMesh) {
                var basePath = "stars/Textures/StarSparrow_";
                var emissiveTexture = new THREE.TextureLoader(loadManager).load(basePath + "Emissive.png");
                var metallicTexture = new THREE.TextureLoader(loadManager).load(basePath + "Metallic.png");
                var roughnessTexture = new THREE.TextureLoader(loadManager).load(basePath + "Roughness.png");
                var normalTexture = new THREE.TextureLoader(loadManager).load(basePath + "Normal.png");
                var baseColorTexture = new THREE.TextureLoader(loadManager).load(basePath + "Red.png");
                var specularTexture = new THREE.TextureLoader(loadManager).load(basePath + "Specular.png");
                var glossinessTexture = new THREE.TextureLoader(loadManager).load(basePath + "Glossiness.png");
                child.material = new THREE.MeshPhysicalMaterial({
                    // color: 0xffffff,
                    map: baseColorTexture,
                    emissive: 0xffffff,
                    emissiveMap: emissiveTexture,
                    envMap: assetManager.cubeMap,
                    metalness: 1.0,
                    metalnessMap: metallicTexture,
                    normalMap: normalTexture,
                    roughness: 1.0,
                    roughnessMap: roughnessTexture,
                    specular:1.0,
                    specularMap:specularTexture,
                    glossiniess:1.0,
                    glossiniessMap:glossinessTexture,
                    reflectivity: 1.0,
                    clearCoat: 1.0,
                });
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        var hitBoxPosition = [
            new THREE.Vector3(0,-1.5,0), 4,
            new THREE.Vector3(1.5,-1.75,0.5), 2,
            new THREE.Vector3(-1.5,-1.75,0.5), 2,
            new THREE.Vector3(1.5,-1.75,-0.5), 2,
            new THREE.Vector3(-1.5,-1.75,-0.5), 2,
            new THREE.Vector3(3.75,-0.5,0), 2,
            new THREE.Vector3(-3.75,-0.5,0), 2,
            new THREE.Vector3(5,0.5,0), 2,
            new THREE.Vector3(-5,0.5,0), 2,
        ];
        res.hitBoxes = new Array();
        for(var i=0;i<9;i++){
            //var hitBox = new THREE.Mesh(boxGeometry, new THREE.MeshStandardMaterial({color: 0xffff,}));
            var hitBox = new THREE.Object3D();
            hitBox.scale.set(0.5,0.5,0.5);
            hitBox.name = "hit_box_"+i.toString();
            var hitboxIndex = i * 2;
            hitBox.position.set(hitBoxPosition[hitboxIndex].x,hitBoxPosition[hitboxIndex].y,hitBoxPosition[hitboxIndex].z);
            res.add(hitBox);
            let tolerance = hitBoxPosition[hitboxIndex + 1];
            hitBox.isColliding = function (other) {
                var resOther = new THREE.Vector3();
                other.getWorldPosition(resOther);
                var resCurrent = new THREE.Vector3();
                this.getWorldPosition(resCurrent);
                var distance = resCurrent.distanceTo(resOther);
                var isCollide = distance < tolerance;
                //this.material.color = new THREE.Color((isCollide) ? 0xff0000 : 0x00ff00);
                return isCollide;
            };
            res.hitBoxes.push(hitBox);
        }

        res.isColliding = function (other) {
            for(var i = 0;i<this.hitBoxes.length;i++){
                if(this.hitBoxes[i].isColliding(other)){
                    return true;
                }
            }
            return false;
        };

        res.name = "spaceship";
        res.mixer = new THREE.AnimationMixer(res);
        // res.spaceshipAction = res.mixer.clipAction(res.animations[0]);
        assetManager.addObject(res);
    });

    assetManager.loader.forEach(element => {
        element();
    });

    for(var i=0;i<4;i++){
        loadObj(i);
    }

    for(var j=0;j<4;j++){
        loadRocketObj(j);
    }

    loadAim();

    loadRocket();

    requestAnimationFrame(Update);
}

function loadObj(i) {
    var OBJLoader = new THREE.OBJLoader();//obj加载器
    var MTLLoader = new THREE.MTLLoader();//材质文件加载器
    MTLLoader.load('rock/rock.mtl', function(materials) {
        // 返回一个包含材质的对象MaterialCreator
        //obj的模型会和MaterialCreator包含的材质对应起来
        OBJLoader.setMaterials(materials);
        OBJLoader.load('rock/rock.obj', function(obj) {
            obj.name = "rock"+i.toString();
            assetManager.addObject(obj);
        })
    });
}

function loadRocketObj(j) {
    var OBJLoader = new THREE.OBJLoader();//obj加载器
    var MTLLoader = new THREE.MTLLoader();//材质文件加载器
    MTLLoader.load('model/rocket1.mtl', function(materials) {
        // 返回一个包含材质的对象MaterialCreator
        //obj的模型会和MaterialCreator包含的材质对应起来
        OBJLoader.setMaterials(materials);
        OBJLoader.load('model/rocket1.obj', function(obj) {
            obj.name = "rocket"+j.toString();
            assetManager.addObject(obj);
        })
    });
}

function loadAim() {
    var OBJLoader = new THREE.OBJLoader();//obj加载器
    var MTLLoader = new THREE.MTLLoader();//材质文件加载器
    MTLLoader.load('model/obj/Triangle.mtl', function(materials) {
        // 返回一个包含材质的对象MaterialCreator
        //obj的模型会和MaterialCreator包含的材质对应起来
        OBJLoader.setMaterials(materials);
        OBJLoader.load('model/obj/Triangle.obj', function(obj) {
            obj.name = "aim";
            assetManager.addObject(obj);
        })
    });
}


function loadRocket() {
    var OBJLoader = new THREE.OBJLoader();
    var MTLLoader = new THREE.MTLLoader();
    // 没有材质文件，系统自动设置Phong网格材质
    MTLLoader.load('model/rocket.mtl',function (materials) {
        // 控制台查看返回结构：包含一个网格模型Mesh的组Group
        // 查看加载器生成的材质对象：MeshPhongMaterial
        OBJLoader.setMaterials(materials);
        OBJLoader.load('model/rocket.obj', function(res) {
            var hitBoxPosition = [
                new THREE.Vector3(0,-1.5,0), 4,
                new THREE.Vector3(1.5,-1.75,0.5), 4,
                new THREE.Vector3(-1.5,-1.75,0.5), 4,
                new THREE.Vector3(1.5,-1.75,-0.5), 4,
                new THREE.Vector3(-1.5,-1.75,-0.5), 4,
                new THREE.Vector3(3.75,-0.5,0), 4,
                new THREE.Vector3(-3.75,-0.5,0), 4,
                new THREE.Vector3(5,0.5,0), 4,
                new THREE.Vector3(-5,0.5,0), 4,
            ];
            res.hitBoxes = new Array();
            for(var i=0;i<9;i++){
                var hitBox = new THREE.Object3D();
                hitBox.scale.set(0.5,0.5,0.5);
                hitBox.name = "shoot_box_"+i.toString();
                var hitboxIndex = i * 2;
                hitBox.position.set(hitBoxPosition[hitboxIndex].x,hitBoxPosition[hitboxIndex].y,hitBoxPosition[hitboxIndex].z);
                res.add(hitBox);
                let tolerance = hitBoxPosition[hitboxIndex + 1];
                hitBox.isColliding = function (other) {
                    var resOther = new THREE.Vector3();
                    other.getWorldPosition(resOther);
                    var resCurrent = new THREE.Vector3();
                    this.getWorldPosition(resCurrent);
                    var distance = resCurrent.distanceTo(resOther);
                    var isCollide = distance < tolerance;
                    //this.material.color = new THREE.Color((isCollide) ? 0xff0000 : 0x00ff00);
                    return isCollide;
                };
                res.hitBoxes.push(hitBox);
            }
            res.isColliding = function (other) {
                for(var i = 0;i<this.hitBoxes.length;i++){
                    if(this.hitBoxes[i].isColliding(other)){
                        return true;
                    }
                }
                return false;
            };
            res.name = "rocket";
            assetManager.addObject(res);
        })
    });
}

//Will be called on Scene initialization
function Start(){
    //traverse all child nodes of activeScene
    //awake nodes of which method is awake();
    activeScene.traverse(function(child){
        if(child.awake !== undefined){
            child.awake();
        }
    });

    //traverse all child nodes of activeScene
    //start nodes of which method is start
    activeScene.traverse(function(child){
        if(child.start !== undefined){
            child.start();
        }
    });
    //Scene has been actived
    activeScene.isReady = true;
}

//Called continously
function Update(currentFrame){

    computeManager.deltaTime = (currentFrame - computeManager.firstFrame)/1000.0;
    computeManager.firstFrame = currentFrame;

    var currentScene = activeScene;
    if(currentScene !== undefined && currentScene.isReady){
        try{
            currentScene.traverse(function(child){
                if(child.frameUpdate !== undefined){
                    child.frameUpdate();
                }
                if(child.mixer !== undefined){
                    child.mixer.update(computeManager.deltaTime);
                }
            });
            renderer.render(currentScene, camera);
        }catch(e){
        }

    }
    requestAnimationFrame(Update);
}

function InitializeScene(){
    //Default scene
    function InitializeMainMenu(){
        var scene = new THREE.Scene();
        scene.name = "main_menu";
        sceneManager.addScene(scene);

        scene.awake = function(){
            uiManager.showMenu("main_menu");
            this.state = "In";
            this.position.set(0,0,0);
            this.background = new THREE.Color(0x00);
            //this.fog = new THREE.Fog(0xa0a0a0,25, 30);
            var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
            this.add(hemiLight);
            var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.castShadow = true;
            directionalLight.position.set(0,10,-10);

            directionalLight.shadow.camera.left = -assetManager.cameraSize;
            directionalLight.shadow.camera.right = assetManager.cameraSize;
            directionalLight.shadow.camera.top = assetManager.cameraSize;
            directionalLight.shadow.camera.bottom = -assetManager.cameraSize;
            directionalLight.shadow.mapSize.width = assetManager.shadowSize;
            directionalLight.shadow.mapSize.height = assetManager.shadowSize;
            this.add(directionalLight);

            var spaceshipGroup = new THREE.Group();
            spaceshipGroup.name = "spaceship_group";
            var spaceship = assetManager.objects["spaceship"];
            spaceshipGroup.add(spaceship);
            scene.add(spaceshipGroup);

            scene.background = assetManager.cubeMap;

            var rocks = new Array();
            for(var i=0;i<4;i++){
                var rock = assetManager.objects["rock"+i.toString()];
                rocks.push(rock);
                rock.scale.set(1,1,1);
                rock.position.set(8,-1.5,0);
                rock.awake = rock.start = rock.frameUpdate = undefined;
                scene.add(rock);
            }

            rocks[0].awake = function () {
                this.position.set(8,-1.5,0);
                this.rotation.set(0,1,0);
                this.scale.set(0.001,0.001,0.001);
            };

            rocks[1].awake = function () {
                this.position.set(-15,3,3);
                this.rotation.set(0,1.5,0);
                this.scale.set(0.005,0.005,0.005);
            };

            rocks[2].awake = function () {
                this.position.set(9,-1.5,3);
                this.rotation.set(0,0.2,0);
                this.scale.set(0.002,0.002,0.002);
            };

            rocks[3].awake = function () {
                this.position.set(11,-1,0);
                this.rotation.set(0,0.3,0);
                this.scale.set(0.001,0.001,0.001);
            };

            var rockets = new Array();
            for(var j=0;j<4;j++){
                var rocket = assetManager.objects["rocket"+j.toString()];
                rockets.push(rocket);
                rocket.scale.set(1,1,1);
                rocket.position.set(7,-2.5,0);
                rocket.awake = rocket.start = rocket.frameUpdate = undefined;
                scene.add(rocket);
            }

            rockets[0].awake = function () {
                this.position.set(7,-2.5,0);
            };

            rockets[1].awake = function () {
                this.position.set(-7,3,3);
            };

            rockets[2].awake = function () {
                this.position.set(-5,-1.5,3);
            };

            rockets[3].awake = function () {
                this.position.set(11,-5,0);
            };

            spaceshipGroup.awake = function () {
                this.isLaunched = false;
                this.isAssembled = false;
                this.velocity = new THREE.Vector3();
                this.position.set(0,0,-10);
                this.scale.set(0.01*gamesize,0.01*gamesize,0.01*gamesize);
            };

            spaceshipGroup.launch = function (i) {
                if(this.isLaunched){
                    return;
                }
                this.isLaunched = true;
                // spaceshipGroup.animAction.paused = false;
                // spaceshipGroup.animAction.reset();
                // spaceshipGroup.animAction.timeScale = 1;
                scene.state = "Out";
                setTimeout(function () {
                    spaceshipGroup.isAssembled = true;
                    setTimeout(function () {
                        if(i === 1){
                            sceneManager.loadScene("game_play1");
                        }
                        else if(i === 2){
                            sceneManager.loadScene("game_play");
                        }
                        else{
                            sceneManager.loadScene("game_play2");
                        }
                    }, 2000);
                }, 3000);
            };

            spaceshipGroup.frameUpdate = function () {
                if(this.isAssembled){
                    this.velocity.z += 0.01;
                    this.position.add(this.velocity);
                }else{
                    var diff = -this.position.z;
                    if(Math.abs(diff) < 5){
                        // this.animAction.paused = false;
                    }
                    this.position.set(0,0,this.position.z + diff * computeManager.deltaTime);
                }
            };


        };

        scene.start = function () {
            camera.position.set(0,10,10);
            var highscore = (localStorage.highScore !== undefined) ? parseFloat(localStorage.highScore) : 0.0;
            var highscore1 = (localStorage.highScore1 !== undefined) ? parseFloat(localStorage.highScore1) : 0.0;
            uiManager.menus["main_menu"].find("#main_score")[0].innerHTML = "Highscore of Level2: " + highscore.toFixed(2).toString();
            uiManager.menus["main_menu"].find("#main_score1")[0].innerHTML = "Highscore of Level1: " + highscore1.toFixed(2).toString();
            setTimeout(function () {
                scene.state = "Idle";
            }, 2000);
        };

        scene.frameUpdate = function () {

            var diff = new THREE.Vector3(0,0,0);

            if(scene.state === "In"){
                diff.sub(new THREE.Vector3(0,5,10));
            }else if(scene.state === "Out"){
                diff.sub(new THREE.Vector3(0,2,-10));
            }else{
                diff.sub(new THREE.Vector3(Math.sin(computeManager.firstFrame * Math.PI/180 / 100)*10,10,Math.cos(computeManager.firstFrame * Math.PI/180 / 100)*10));
            }
            diff.add(camera.position);
            diff.multiplyScalar(computeManager.deltaTime);
            camera.position.sub(diff);

            //camera.position.set(Math.sin(computeManager.lastFrame * Math.PI/180 / 100)*10,10,Math.cos(computeManager.lastFrame * Math.PI/180 / 100)*10);
            camera.lookAt(0,0,0);
        };
    }

    function InitializeGamePlay(){
        var scene = new THREE.Scene();
        var collide = false;
        scene.name = "game_play";
        sceneManager.addScene(scene);
        var redBoxIter = 0;
        var redBoxes = new Array();
        var rocket = assetManager.objects["rocket"];
        var spaceshipGroup;
        var randNode;
        var possiblePosition = new Array();
        // 非位置音频可用于不考虑位置的背景音乐
        // 创建一个监听者
        var listener = new THREE.AudioListener();
        // camera.add( listener );
        // 创建一个非位置音频对象  用来控制播放
        var audio1 = new THREE.Audio(listener);
        // 创建一个音频加载器对象
        var audioLoader = new THREE.AudioLoader();
        // 加载音频文件，返回一个音频缓冲区对象作为回调函数参数
        audioLoader.load('audios/shoot.mp3', function(AudioBuffer) {
            // 音频缓冲区对象关联到音频对象audio
            audio1.setBuffer(AudioBuffer);
            audio1.setLoop(false); //是否循环
            audio1.setVolume(0.5); //音量
            // 播放缓冲区中的音频数据
        });

        var listener1 = new THREE.AudioListener();
        // camera.add( listener );
        // 创建一个非位置音频对象  用来控制播放
        var audio2 = new THREE.Audio(listener1);
        // 创建一个音频加载器对象
        var audioLoader1 = new THREE.AudioLoader();
        // 加载音频文件，返回一个音频缓冲区对象作为回调函数参数
        audioLoader1.load('audios/explode.mp3', function(AudioBuffer) {
            // 音频缓冲区对象关联到音频对象audio
            audio2.setBuffer(AudioBuffer);
            audio2.setLoop(false); //是否循环
            audio2.setVolume(0.5); //音量
            // 播放缓冲区中的音频数据
        });

        scene.awake = function () {
            uiManager.showMenu("gameplay_menu");


            this.background = assetManager.cubeMap;
            this.scoreBoard = uiManager.menus["gameplay_menu"].scoreBoard;

            var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
            this.add(hemiLight);
            var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.castShadow = true;
            directionalLight.position.set(0,10,-10);
            this.add(directionalLight);


            spaceshipGroup = new THREE.Group();
            spaceshipGroup.name = "spaceship_group";
            var spaceship = assetManager.objects["spaceship"];
            spaceshipGroup.add(spaceship);

            spaceshipGroup.awake = function () {
                this.scale.set(0.01*gamesize, 0.01*gamesize, 0.01*gamesize);
            };

            spaceshipGroup.frameUpdate = function () {
                var diffPos = new THREE.Vector2(this.position.x - -10*inputManager.position.x,this.position.y - -10*inputManager.position.y);
                this.position.set(this.position.x - diffPos.x * computeManager.deltaTime * scene.speed, this.position.y - diffPos.y * computeManager.deltaTime * scene.speed,0);
                this.rotation.set(0,0,(this.rotation.z - (this.rotation.z - -inputManager.position.x) * scene.speed * computeManager.deltaTime));
                for(var i = 0; i < 4;i++) {
                    if (this.children[0].isColliding(redBoxes[i])) {
                        var currentHighscore = (localStorage.highScore !== undefined) ? parseFloat(localStorage.highScore) : 0;
                        var currentScore = scene.speed * scene.distance;
                        if (currentHighscore < currentScore) {
                            localStorage.highScore = currentScore;
                        }
                        sceneManager.loadScene("main_menu");
                    }
                }
            };

            directionalLight.target = spaceshipGroup;
            directionalLight.shadow.camera.left = -assetManager.cameraSize;
            directionalLight.shadow.camera.right = assetManager.cameraSize;
            directionalLight.shadow.camera.top = assetManager.cameraSize;
            directionalLight.shadow.camera.bottom = -assetManager.cameraSize;
            directionalLight.shadow.mapSize.width = assetManager.shadowSize;
            directionalLight.shadow.mapSize.height = assetManager.shadowSize;
            this.add(spaceshipGroup);

            var aim = assetManager.objects['aim'];
            aim.awake = function(){
                this.scale.set(0.3,0.3,0.3);
                this.position.set(spaceshipGroup.position.x,spaceshipGroup.position.y,90);
            };
            aim.frameUpdate = function () {
                this.position.set(spaceshipGroup.position.x,spaceshipGroup.position.y,50);
            };
            this.add(aim);



            this.add(aim);

            for(var x=-1;x<2;x++){
                for(var y=-1;y<2;y++){
                    possiblePosition.push(new THREE.Vector2(x*5,y*5));
                }
            }


            for(var i=0;i<4;i++){
                var redBox = assetManager.objects["rock"+i.toString()];
                redBoxes.push(redBox);
                redBox.castShadow = true;
                var size = Math.ceil(Math.random()*1)+1;
                redBox.scale.set(0.001*size,0.001*size,0.001*size);
                redBox.position.set(0,0,-1000);
                redBox.rotation.set(0,0,0);
                redBox.awake = redBox.start = redBox.frameUpdate = undefined;
                let zDistance = i;
                redBox.awake = function () {
                    var randNode = possiblePosition[computeManager.randInt(0,possiblePosition.length - 1)];
                    this.position.set(randNode.x,randNode.y,30*(zDistance+1));
                };
                redBox.frameUpdate = function () {
                    this.translateZ(-computeManager.deltaTime*10*scene.speed);
                    if(this.position.z < -30){
                        redBoxIter = (redBoxIter + 1) % 4;
                        randNode = possiblePosition[computeManager.randInt(0,possiblePosition.length - 1)];
                        this.position.set(randNode.x,randNode.y,90);
                    }
                };
                this.add(redBox);
            }
        };

        scene.start = function () {
            camera.position.set(0,0,10);
            this.distance = 0;
            this.speed = 4;
        };



        scene.frameUpdate = function () {
            if(inputManager.exits){
                inputManager.exits = false;
                sceneManager.loadScene("main_menu");
            }
            scene.traverse(function(obj) {
                if (obj.type === "Fire") {
                    setTimeout(function(){
                        scene.remove(obj);
                    },600);
                }
            });
            this.speed += computeManager.deltaTime/10;
            if(inputManager.accelerate){
                inputManager.accelerate = false;
                this.speed += 0.4;
            }
            if(inputManager.slowdown && this.speed > 0){
                inputManager.slowdown = false;
                this.speed -= 0.8;
            }
            camera.position.set(Math.sin(spaceshipGroup.position.x/10) * 2,Math.sin(spaceshipGroup.position.y/10) * 2 + 5   ,-20);
            camera.lookAt(0,0,0);
            this.distance += computeManager.deltaTime;
            this.scoreBoard.innerHTML = "Score : " + this.distance.toFixed(2) + " X " +
                this.speed.toFixed(2) + " = " + (this.distance*this.speed).toFixed(2).toString()+
                "<br/><img src='images/speed.png' width=\"25px\" height=\"25px\"> <hr/> Speed:"+this.speed.toFixed(2);
            if(inputManager.shoot){
                audio1.play();
                collide = true;

                var move =true;
                inputManager.shoot = false;
                rocket.castShadow = true;
                rocket.scale.set(2, 2, 2);
                rocket.position.set(spaceshipGroup.position.x,spaceshipGroup.position.y,spaceshipGroup.position.z);
                rocket.awake = rocket.frameUpdate = undefined;
                rocket.awake = function () {
                    this.position.set(spaceshipGroup.position.x,spaceshipGroup.position.y,spaceshipGroup.position.z);
                };
                rocket.frameUpdate = function () {
                    if(move) {
                        this.translateZ(computeManager.deltaTime * 10 * scene.speed);
                    }
                    else{
                        this.position.set(spaceshipGroup.position.x,spaceshipGroup.position.y,spaceshipGroup.position.z);
                    }
                    for(var i = 0;i < 4;i++){
                        if(this.position.distanceTo(redBoxes[i].position)<3 && collide){
                            audio2.play();
                            var plane=new THREE.PlaneBufferGeometry(10,10,10);

                            var fire=new THREE.Fire(plane,{
                                textureWidth:512,
                                textureHeight:512,
                                debug:false
                            });
                            fire.position.set(redBoxes[i].position.x,redBoxes[i].position.y-4,redBoxes[i].position.z) ;
                            fire.addSource(0.5,0.1,0.1,1.0,0.0,1.0);
                            fire.rotateX(Math.PI);
                            scene.add(fire);
                            redBoxIter = (redBoxIter + 1) % 4;
                            randNode = possiblePosition[computeManager.randInt(0,possiblePosition.length - 1)];
                            redBoxes[i].position.set(randNode.x,randNode.y,90);

                            this.position.set(spaceshipGroup.position.x,spaceshipGroup.position.y,spaceshipGroup.position.z);
                            collide = false;
                            move=false;
                        }
                    }

                };
                this.add(rocket);
            }
        };


    }

    function InitializeGamePlay1(){
        var scene1 = new THREE.Scene();
        scene1.name = "game_play1";
        sceneManager.addScene(scene1);
        var redBoxIter = 0;
        var rocketBoxes = new Array();
        var spaceshipGroup;
        var randNode;
        var possiblePosition = new Array();


        scene1.awake = function () {
            uiManager.showMenu("gameplay_menu1");
            this.background = assetManager.cubeMap;
            this.scoreBoard1 = uiManager.menus["gameplay_menu1"].scoreBoard1;

            var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
            this.add(hemiLight);
            var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.castShadow = true;
            directionalLight.position.set(0,10,-10);
            this.add(directionalLight);


            spaceshipGroup = new THREE.Group();
            spaceshipGroup.name = "spaceship_group";
            var spaceship = assetManager.objects["spaceship"];
            spaceshipGroup.add(spaceship);

            spaceshipGroup.awake = function () {
                this.scale.set(0.01*gamesize, 0.01*gamesize, 0.01*gamesize);
            };

            spaceshipGroup.frameUpdate = function () {
                var diffPos = new THREE.Vector2(this.position.x - -10*inputManager.position.x,this.position.y - -10*inputManager.position.y);
                this.position.set(this.position.x - diffPos.x * computeManager.deltaTime * scene1.speed, this.position.y - diffPos.y * computeManager.deltaTime * scene1.speed,0);
                this.rotation.set(0,0,(this.rotation.z - (this.rotation.z - -inputManager.position.x) * scene1.speed * computeManager.deltaTime));
                for(var i = 0;i < 4;i++) {
                    if (this.children[0].isColliding(rocketBoxes[i])) {
                        var currentHighscore1 = (localStorage.highScore1 !== undefined) ? parseFloat(localStorage.highScore1) : 0;
                        var currentScore1 = scene1.speed * scene1.distance;
                        if (currentHighscore1 < currentScore1) {
                            localStorage.highScore1 = currentScore1;
                        }
                        sceneManager.loadScene("main_menu");
                    }
                }
            };

            directionalLight.target = spaceshipGroup;
            directionalLight.shadow.camera.left = -assetManager.cameraSize;
            directionalLight.shadow.camera.right = assetManager.cameraSize;
            directionalLight.shadow.camera.top = assetManager.cameraSize;
            directionalLight.shadow.camera.bottom = -assetManager.cameraSize;
            directionalLight.shadow.mapSize.width = assetManager.shadowSize;
            directionalLight.shadow.mapSize.height = assetManager.shadowSize;
            this.add(spaceshipGroup);


            for(var x=-1;x<2;x++){
                for(var y=-1;y<2;y++){
                    possiblePosition.push(new THREE.Vector2(x*3,y*3));
                }
            }

            for(var j=0;j<4;j++){
                var rocketBox = assetManager.objects["rocket"+j.toString()];
                rocketBoxes.push(rocketBox);
                rocketBox.castShadow = true;
                rocketBox.scale.set(2,2,2);
                rocketBox.position.set(0,0,-1000);
                rocketBox.awake = rocketBox.start = rocketBox.frameUpdate = undefined;
                let zDistance = j;
                rocketBox.awake = function () {
                    var randNode = possiblePosition[computeManager.randInt(0,possiblePosition.length - 1)];
                    this.position.set(randNode.x,randNode.y,30*(zDistance+1));
                };
                rocketBox.frameUpdate = function () {
                    this.translateZ(-computeManager.deltaTime*15*scene1.speed);
                    if(this.position.z < -30){
                        redBoxIter = (redBoxIter + 1) % 4;
                        randNode = possiblePosition[computeManager.randInt(0,possiblePosition.length - 1)];
                        this.position.set(randNode.x,randNode.y,90);
                    }
                };
                this.add(rocketBox);
            }

        };

        scene1.start = function () {
            camera.position.set(0,0,10);
            this.distance = 0;
            this.speed = 1;
        };


        scene1.frameUpdate = function () {
            if(inputManager.exits){
                inputManager.exits = false;
                sceneManager.loadScene("main_menu");
            }
            this.speed += computeManager.deltaTime/10;
            if(inputManager.accelerate){
                inputManager.accelerate = false;
                this.speed += 0.4;
            }
            if(inputManager.slowdown && this.speed > 0){
                inputManager.slowdown = false;
                this.speed -= 0.8;
            }
            camera.position.set(Math.sin(spaceshipGroup.position.x/10) * 2,Math.sin(spaceshipGroup.position.y/10) * 2 + 5   ,-20);
            camera.lookAt(0,0,0);
            this.distance += computeManager.deltaTime;
            this.scoreBoard1.innerHTML = "Score : " + this.distance.toFixed(2) + " X "
                + this.speed.toFixed(2) + " = " + (this.distance*this.speed).toFixed(2).toString()+
                "<br/><img src='images/speed.png' width=\"25px\" height=\"25px\"> <hr/> Speed:"+this.speed.toFixed(2);
        };
    }

    function InitializeGamePlay2(){
        var scene2 = new THREE.Scene();
        var collide = false;
        scene2.name = "game_play";
        sceneManager.addScene(scene2);
        var redBoxIter = 0;
        var redBoxes = new Array();
        var rocket = assetManager.objects["rocket"];
        var spaceshipGroup;
        var randNode;
        var possiblePosition = new Array();
        // 非位置音频可用于不考虑位置的背景音乐
        // 创建一个监听者
        var listener = new THREE.AudioListener();
        // camera.add( listener );
        // 创建一个非位置音频对象  用来控制播放
        var audio2 = new THREE.Audio(listener);
        // 创建一个音频加载器对象
        var audioLoader = new THREE.AudioLoader();
        // 加载音频文件，返回一个音频缓冲区对象作为回调函数参数
        audioLoader.load('audios/shoot.mp3', function(AudioBuffer) {
            // 音频缓冲区对象关联到音频对象audio
            audio2.setBuffer(AudioBuffer);
            audio2.setLoop(false); //是否循环
            audio2.setVolume(0.5); //音量
            // 播放缓冲区中的音频数据
        });

        var listener2 = new THREE.AudioListener();
        // camera.add( listener );
        // 创建一个非位置音频对象  用来控制播放
        var audio3 = new THREE.Audio(listener2);
        // 创建一个音频加载器对象
        var audioLoader2 = new THREE.AudioLoader();
        // 加载音频文件，返回一个音频缓冲区对象作为回调函数参数
        audioLoader2.load('audios/explode.mp3', function(AudioBuffer) {
            // 音频缓冲区对象关联到音频对象audio
            audio3.setBuffer(AudioBuffer);
            audio3.setLoop(false); //是否循环
            audio3.setVolume(0.5); //音量
            // 播放缓冲区中的音频数据
        });

        scene2.awake = function () {
            uiManager.showMenu("gameplay_menu2");


            this.background = assetManager.cubeMap;
            this.scoreBoard2 = uiManager.menus["gameplay_menu2"].scoreBoard2;

            var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
            this.add(hemiLight);
            var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.castShadow = true;
            directionalLight.position.set(0,10,-10);
            this.add(directionalLight);


            spaceshipGroup = new THREE.Group();
            spaceshipGroup.name = "spaceship_group";
            var spaceship = assetManager.objects["spaceship"];
            spaceshipGroup.add(spaceship);

            spaceshipGroup.awake = function () {
                this.scale.set(0.01*gamesize, 0.01*gamesize, 0.01*gamesize);
            };

            spaceshipGroup.frameUpdate = function () {
                var diffPos = new THREE.Vector2(this.position.x - -10*inputManager.position.x,this.position.y - -10*inputManager.position.y);
                this.position.set(this.position.x - diffPos.x * computeManager.deltaTime * scene2.speed, this.position.y - diffPos.y * computeManager.deltaTime * scene2.speed,0);
                this.rotation.set(0,0,(this.rotation.z - (this.rotation.z - -inputManager.position.x) * scene2.speed * computeManager.deltaTime));
                for(var i = 0; i < 4;i++) {
                    if (this.children[0].isColliding(redBoxes[i])) {
                        var currentHighscore2 = (localStorage.highScore2 !== undefined) ? parseFloat(localStorage.highScore2) : 0;
                        var currentScore2 = scene2.speed * scene2.distance;
                        if (currentHighscore2 < currentScore2) {
                            localStorage.highScore2 = currentScore2;
                        }
                        sceneManager.loadScene("main_menu");
                    }
                }
            };

            directionalLight.target = spaceshipGroup;
            directionalLight.shadow.camera.left = -assetManager.cameraSize;
            directionalLight.shadow.camera.right = assetManager.cameraSize;
            directionalLight.shadow.camera.top = assetManager.cameraSize;
            directionalLight.shadow.camera.bottom = -assetManager.cameraSize;
            directionalLight.shadow.mapSize.width = assetManager.shadowSize;
            directionalLight.shadow.mapSize.height = assetManager.shadowSize;
            this.add(spaceshipGroup);

            var aim = assetManager.objects['aim'];
            aim.awake = function(){
                this.scale.set(0.3,0.3,0.3);
                this.position.set(spaceshipGroup.position.x,spaceshipGroup.position.y,90);
            };
            aim.frameUpdate = function () {
                this.position.set(spaceshipGroup.position.x,spaceshipGroup.position.y,50);
            };
            this.add(aim);



            this.add(aim);

            for(var x=-1;x<2;x++){
                for(var y=-1;y<2;y++){
                    possiblePosition.push(new THREE.Vector2(x*5,y*5));
                }
            }


            for(var i=0;i<4;i++){
                var redBox = assetManager.objects["rocket"+i.toString()];
                redBoxes.push(redBox);
                redBox.castShadow = true;
                redBox.scale.set(2,2,2);
                redBox.position.set(0,0,-1000);
                redBox.rotation.set(0,0,0);
                redBox.awake = redBox.start = redBox.frameUpdate = undefined;
                let zDistance = i;
                redBox.awake = function () {
                    var randNode = possiblePosition[computeManager.randInt(0,possiblePosition.length - 1)];
                    this.position.set(randNode.x,randNode.y,30*(zDistance+1));
                };
                redBox.frameUpdate = function () {
                    this.translateZ(-computeManager.deltaTime*10*scene2.speed);
                    if(this.position.z < -30){
                        redBoxIter = (redBoxIter + 1) % 4;
                        randNode = possiblePosition[computeManager.randInt(0,possiblePosition.length - 1)];
                        this.position.set(randNode.x,randNode.y,90);
                    }
                };
                this.add(redBox);
            }
        };

        scene2.start = function () {
            camera.position.set(0,0,10);
            this.distance = 0;
            this.speed = 1;
        };



        scene2.frameUpdate = function () {
            if(inputManager.exits){
                inputManager.exits = false;
                sceneManager.loadScene("main_menu");
            }
            scene2.traverse(function(obj) {
                if (obj.type === "Fire") {
                    setTimeout(function(){
                        scene2.remove(obj);
                    },600);
                }
            });
            this.speed += computeManager.deltaTime/10;
            if(inputManager.accelerate){
                inputManager.accelerate = false;
                this.speed += 0.4;
            }
            if(inputManager.slowdown && this.speed > 0){
                inputManager.slowdown = false;
                this.speed -= 0.8;
            }
            camera.position.set(Math.sin(spaceshipGroup.position.x/10) * 2,Math.sin(spaceshipGroup.position.y/10) * 2 + 5   ,-20);
            camera.lookAt(0,0,0);
            this.distance += computeManager.deltaTime;
            this.scoreBoard2.innerHTML = "Score : " + this.distance.toFixed(2) + " X " +
                this.speed.toFixed(2) + " = " + (this.distance*this.speed).toFixed(2).toString()+
                "<br/><img src='images/speed.png' width=\"25px\" height=\"25px\"> <hr/> Speed:"+this.speed.toFixed(2);
            if(inputManager.shoot){
                audio2.play();
                collide = true;

                var move =true;
                inputManager.shoot = false;
                rocket.castShadow = true;
                rocket.scale.set(2, 2, 2);
                rocket.position.set(spaceshipGroup.position.x,spaceshipGroup.position.y,spaceshipGroup.position.z);
                rocket.awake = rocket.frameUpdate = undefined;
                rocket.awake = function () {
                    this.position.set(spaceshipGroup.position.x,spaceshipGroup.position.y,spaceshipGroup.position.z);
                };
                rocket.frameUpdate = function () {
                    if(move) {
                        this.translateZ(computeManager.deltaTime * 10 * scene2.speed);
                    }
                    else{
                        this.position.set(spaceshipGroup.position.x,spaceshipGroup.position.y,spaceshipGroup.position.z);
                    }
                    for(var i = 0;i < 4;i++){
                        if(this.position.distanceTo(redBoxes[i].position)<3 && collide){
                            audio3.play();
                            var plane=new THREE.PlaneBufferGeometry(10,10,10);

                            var fire=new THREE.Fire(plane,{
                                textureWidth:512,
                                textureHeight:512,
                                debug:false
                            });
                            fire.position.set(redBoxes[i].position.x,redBoxes[i].position.y-4,redBoxes[i].position.z) ;
                            fire.addSource(0.5,0.1,0.1,1.0,0.0,1.0);
                            fire.rotateX(Math.PI);
                            scene2.add(fire);
                            redBoxIter = (redBoxIter + 1) % 4;
                            randNode = possiblePosition[computeManager.randInt(0,possiblePosition.length - 1)];
                            redBoxes[i].position.set(randNode.x,randNode.y,90);

                            this.position.set(spaceshipGroup.position.x,spaceshipGroup.position.y,spaceshipGroup.position.z);
                            collide = false;
                            move=false;
                        }
                    }

                };
                this.add(rocket);
            }
        };
    }
    InitializeMainMenu();
    InitializeGamePlay();
    InitializeGamePlay1();
    InitializeGamePlay2();

    sceneManager.loadScene("main_menu");

}

function InitializeInput(){
    $.each($(".menu"), function (indexInArray, valueOfElement) {
        $(valueOfElement).addClass("transitioned");
        uiManager.addMenu($(valueOfElement));
    });

    uiManager.hideMenu();

    // 非位置音频可用于不考虑位置的背景音乐
    // 创建一个监听者
    var listener = new THREE.AudioListener();
    // camera.add( listener );
    // 创建一个非位置音频对象  用来控制播放
    var audio = new THREE.Audio(listener);
    // 创建一个音频加载器对象
    var audioLoader = new THREE.AudioLoader();
    // 加载音频文件，返回一个音频缓冲区对象作为回调函数参数
    audioLoader.load('audios/ambient.mp3', function(AudioBuffer) {
        // 音频缓冲区对象关联到音频对象audio
        audio.setBuffer(AudioBuffer);
        audio.setLoop(true); //是否循环
        audio.setVolume(0.5); //音量
        // 播放缓冲区中的音频数据
    });

    function MainMenu(){
        var playBtn = $("#play_btn");
        playBtn.click(function (e) {
            var spaceshipGroup = activeScene.getObjectByName("spaceship_group");
            spaceshipGroup.launch();
            uiManager.hideMenu();
        });

        var playBtn1 = $("#play_btn1");
        playBtn1.click(function (e) {
            var spaceshipGroup = activeScene.getObjectByName("spaceship_group");
            spaceshipGroup.launch(1);
            uiManager.hideMenu();
        });
        var playBtn2 = $("#play_btn2");
        playBtn2.click(function (e) {
            var spaceshipGroup = activeScene.getObjectByName("spaceship_group");
            spaceshipGroup.launch(2);
            uiManager.hideMenu();
        });
        $("#scene_btn").click(function (e) {
            var ext = ".jpg";
            var url;
            var urls;
            if(sceneIndex % 2 === 0) {
                url = "img/cubemap/bkg1_";
                urls = [
                    url + "px" + ext,
                    url + "nx" + ext,
                    url + "py" + ext,
                    url + "ny" + ext,
                    url + "pz" + ext,
                    url + "nz" + ext
                ];
            }else{
                url = "img/cubemap/dark-s_";

                urls = [
                    url + "px" + ext,
                    url + "nx" + ext,
                    url + "py" + ext,
                    url + "ny" + ext,
                    url + "pz" + ext,
                    url + "nz" + ext
                ];
            }
            function OnLoad(res){
                res.format = THREE.RGBFormat;
                assetManager.cubeMap = res;
            }
            assetManager.cubeMap= new THREE.CubeTextureLoader(loadManager).load(urls,OnLoad);
            activeScene.background = assetManager.cubeMap;
            sceneIndex = sceneIndex + 1;
        });

        $("#switch_btn").click(function (e) {
            var spaceshipMaterial = activeScene.getObjectByName("spaceship_group");
            var basePath = "stars/Textures/StarSparrow_";
            var baseColorTexture;
            colorIndex = (colorIndex + 1)%8;
            switch(colorIndex){
                case 0: baseColorTexture = new THREE.TextureLoader(loadManager).load(basePath + "Red.png");
                break;
                case 1: baseColorTexture = new THREE.TextureLoader(loadManager).load(basePath + "Blue.png");
                break;
                case 2: baseColorTexture = new THREE.TextureLoader(loadManager).load(basePath + "Black.png");
                break;
                case 3: baseColorTexture = new THREE.TextureLoader(loadManager).load(basePath + "Yellow.png");
                break;
                case 4: baseColorTexture = new THREE.TextureLoader(loadManager).load(basePath + "Green.png");
                break;
                case 5: baseColorTexture = new THREE.TextureLoader(loadManager).load(basePath + "Cyan.png");
                break;
                case 6: baseColorTexture = new THREE.TextureLoader(loadManager).load(basePath + "Orange.png");
                break;
                default: baseColorTexture = new THREE.TextureLoader(loadManager).load(basePath + "Purple.png");
                break;
            }
            spaceshipMaterial.traverse(function (child) {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhysicalMaterial({
                        // color: 0xffffff,
                        map: baseColorTexture,
                    });
                }
            });
        });
        $("#music_btn").click(function (e) {
            if(musicIndex%2 === 0){
                audio.play(); //play播放、stop停止、pause暂停
            }
            else{
                audio.pause();
            }
            musicIndex = musicIndex+1;
        });
        $("#help_btn").click(function (e) {
            if(helpindex%2 === 0){
                document.getElementById("help").style.visibility = "visible";
            }
            else{
                document.getElementById("help").style.visibility = "hidden";
            }
            helpindex = helpindex + 1;
        });
        $("#easy").click(function (e) {
            var spaceshipMaterial = activeScene.getObjectByName("spaceship_group");
            spaceshipMaterial.scale.set(0.005,0.005,0.005);
            gamesize = 0.5;
            this.style.background = "#00ACED";
            document.getElementById("normal").style.background = "#fff";
            document.getElementById("hard").style.background = "#fff";
        });
        $("#normal").click(function (e) {
            var spaceshipMaterial = activeScene.getObjectByName("spaceship_group");
            spaceshipMaterial.scale.set(0.01,0.01,0.01);
            gamesize = 1.0;
            this.style.background = "#00ACED";
            document.getElementById("easy").style.background = "#fff";
            document.getElementById("hard").style.background = "#fff";
        });
        $("#hard").click(function (e) {
            var spaceshipMaterial = activeScene.getObjectByName("spaceship_group");
            spaceshipMaterial.scale.set(0.012,0.012,0.012);
            gamesize = 1.2;
            this.style.background = "#00ACED";
            document.getElementById("easy").style.background = "#fff";
            document.getElementById("normal").style.background = "#fff";
        });
    }

    function GameplayMenu(){
        var scoreBoard = $(uiManager.menus["gameplay_menu"]).find("#play_score")[0];
        var scoreBoard1 = $(uiManager.menus["gameplay_menu1"]).find("#play_score1")[0];
        var scoreBoard2 = $(uiManager.menus["gameplay_menu2"]).find("#play_score2")[0];
        uiManager.menus["gameplay_menu"].scoreBoard = scoreBoard;
        uiManager.menus["gameplay_menu1"].scoreBoard1 = scoreBoard1;
        uiManager.menus["gameplay_menu2"].scoreBoard2 = scoreBoard2;
        scoreBoard.innerHTML = "Initializing...";
        scoreBoard1.innerHTML = "Initializing...";
        scoreBoard2.innerHTML = "Initializing...";
    }

    MainMenu();
    GameplayMenu();
}
