import * as THREE from '/js/three.js';
import { OrbitControls } from '/js/OrbitControls.js';
import Stats from '/js/stats.module.js';
import { EffectComposer } from '/js/postprocessing/EffectComposer.js';
import { RenderPass } from '/js/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '/js/postprocessing/UnrealBloomPass.js';

let composer;
const params = {
    exposure: 1,
    bloomStrength: 1.5,
    bloomThreshold: 0,
    bloomRadius: 0
};

/**
 * Debug
 */
// const stats = new Stats()
// stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
// document.body.appendChild(stats.dom)

const canvas = document.querySelector('canvas.webgl')

// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

// Scene
const scene = new THREE.Scene()

// Camera
const camera = new THREE.PerspectiveCamera(64, sizes.width / sizes.height, 1, 90);
camera.position.set(30,15,0);
scene.add(camera);


// Controls
const controls = new OrbitControls(camera, canvas);
controls.target.set(0,0,0);
controls.enablePan = false;
controls.maxDistance = 50;
controls.enableDamping = true;
controls.rotateSpeed = 0.25;

// Renderer
THREE.Cache.enabled = true;

let AA = true
if (window.devicePixelRatio > 1) {
  AA = false
}

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    canvas: canvas
})

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor( 0xffffff, 0);
renderer.render(scene, camera);

renderer.outputEncoding = THREE.sRGBEncoding;
const renderScene = new RenderPass( scene, camera );

const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
bloomPass.threshold = params.bloomThreshold;
bloomPass.strength = params.bloomStrength;
bloomPass.radius = params.bloomRadius;

composer = new EffectComposer( renderer );
composer.addPass( renderScene );
composer.addPass( bloomPass );

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
})

// Models

const amount = parseInt( window.location.search.slice( 1 ) ) || 256;
const count = Math.pow( amount, 2 );
let i = 0;
const offset = ( amount - 1 ) / 2;

const dummy = new THREE.Object3D();
const basicMaterial = new THREE.MeshBasicMaterial();
const color = new THREE.Color();
const sphereGeometry = new THREE.SphereGeometry( 1, 8, 4 );
var mesh = new THREE.InstancedMesh( sphereGeometry, basicMaterial, count );

for ( let x = 0; x < amount; x ++ ) {
    for ( let y = 0; y < amount; y ++ ) {
        dummy.position.set( (offset - x) / 4, 0, (offset - y) / 4 );
        dummy.scale.set(.025,.025,.025)
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt( i, color );

        i ++;
    }
}
scene.add( mesh );

//AUDIO
let dataArray;
var analyser;

document.getElementById("play").onclick = function init(){
    const audioContext = new window.AudioContext();
    const audioElement = document.getElementById("myAudio");
    const source = audioContext.createMediaElementSource(audioElement);
    analyser = audioContext.createAnalyser();
    
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.75;
    audioElement.play();
    
    document.getElementById("play").style.display = "none";
    document.getElementById("audioplayer").style.display = "block";
    animate();
}

let queue = [];
for (let x = 0; x < amount; x++){
    for (let y = 0; y < amount; y++){
        queue.push(0);
    }
}

/**
 * Animate
 */

const animate = () =>
 {
    // Update controls
    controls.update() 

    analyser.getByteFrequencyData(dataArray);
    for (let i = 0; i < amount; i++){
        queue.push(dataArray[i])
        queue.shift();
    }

    let i = 0;
    for ( let x = 0; x < amount; x ++ ) {
        for ( let y = 0; y < amount; y ++ ) {
            mesh.setColorAt( i, color.setHSL( queue[i]/640 -.2, 0.8, queue[i]/128 - 0.7) );
            mesh.instanceColor.needsUpdate = true;
            dummy.position.set( (offset - x) / 4, queue[i]/28, (offset - y) / 4 );
            dummy.updateMatrix();
            mesh.setMatrixAt( i, dummy.matrix );
            mesh.instanceMatrix.needsUpdate = true;
            i++
        }
    }

    // Render
    // stats.begin()
    composer.render(renderer);
    // stats.end()
 
     // Call tick again on the next frame
     window.requestAnimationFrame( animate )
}


