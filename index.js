/* eslint-disable no-restricted-syntax */
const Event = require('eventemitter3');
const THREE = require('three');
require('./src/OrbitControls');

const { PickHelper } = require('./src/PickHelper');
const { gosperAndHexGrid, spatialization } = require('./src/spatialization');
const { drawHex3d, drawMeshLine, drawThinLine, drawSplineCurve } = require('./src/draw')

// 多边形内点符号样式
const mapPointStyle = {
  height: 10,
  color: 0x666666,
  elevation: 0
};
// 多边形外边界样式
const polyBorderStyle = {
  color: 0xaaaaaa,
  elevation: -mapPointStyle.height * 0.5,
  lineWidth: 1
};

// 细线符号样式
const thinLineStyle = {
  color: 0x888888,
  elevation: -mapPointStyle.height * 0.5
};
// 粗线符号样式
const fatLineStyle = {
  color: 0x0000ff,
  elevation: 5,
  linewidth: 1
};

class DEMO extends Event {
  constructor(container, config) {
    super();
    this.container = container;
    this.config = config;
    this.apis = config.apis;
    this.data = [];
    this.init();
    this.rendered = false;
    this.obj3Dnames = {
      hexCubes: 'hexCubes',
      hexGrid: 'hexGrid',
      linkSymbols: 'linkSymbols',
      feaBorder: 'feaBorder'
    };
  }

  init() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('width', width);
    canvas.setAttribute('height', height);
    this.container.appendChild(canvas);

    // init things for THREEjs
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 500);
    // camera.position.set(0, 250, 0);
    camera.position.set(0, 0, 500);

    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(width, height);

    this.orbitCtrls = new THREE.OrbitControls(camera, renderer.domElement);

    const lightColor = 0xffffff;
    const lightIntensity = 1;
    const light = new THREE.DirectionalLight(lightColor, lightIntensity);
    light.position.set(0, 100, 0);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight('#888888');
    scene.add(ambientLight);

    this.THREE = { scene, camera, renderer };

    // support picking objects in scene
    this.pickHelper = new PickHelper(canvas);
    this.pickHelper.clearPickPosition();
  }

  // allow the camera to orbit around a target
  loop() {
    const { scene, camera, renderer } = this.THREE;
    this.orbitCtrls && this.orbitCtrls.update();
    this.pickHelper.pick(scene, camera);
    renderer.render(scene, camera);
    requestAnimationFrame(this.loop.bind(this));
  }

  // render or setData
  render(data) {
    if (this.rendered) return;
    const hexR = this.config.hexSize / Math.sqrt(3);
    const { scene, camera, renderer } = this.THREE;
    const { clientWidth: width, clientHeight: height } = this.container;

    const splinePts = [[-width * 0.5, 0], [-width * 0.25, 150], [0, 0], [width * 0.25, 150], [width * 0.5, 0]] //
    const ptCount = 6
    const dx = width / ptCount
    const dy = height / ptCount

    let originX = -width * 0.5 + 10
    let originY = height * 0.5 - 10
    const origin = [originX, originY]
    // splinePts.push(origin)

    let pt
    for (let i = 0; i < ptCount; i++) {
      originX += dx
      originY += dy
      pt = [originX, originY]
      // splinePts.push(pt)
    }

    console.log(splinePts)

    const splineCurveObj3D = new THREE.Object3D()
    scene.add(splineCurveObj3D)
    drawSplineCurve(splineCurveObj3D, splinePts)


    this.data = data;
    this.loop();

    this.rendered = true;
  }

  // 用户在界面修改了配置
  updateOptions(config) {
    this.rendered = false;
    let needUpdate = false;
    if (this.config.hexSize !== config.hexSize) needUpdate = true;
    this.config = { ...this.config, ...config };
    const { scene, camera, renderer } = this.THREE;

    if (needUpdate) {
      for (let i = scene.children.length - 1; i >= 0; i--) {
        const child = scene.children[i];
        if (this.obj3Dnames[child.name]) {
          scene.remove(child);
        }
      }
      this.render(this.data);
      renderer.render(scene, camera);
    }
  }

  // destroy
  destroy() {
    this.orbitCtrls && this.orbitCtrls.dispose();
    const { scene } = this.THREE;
    scene.children.forEach(child => {
      scene.remove(child);
    });
    this.container.removeChild(this.canvas);
  }
}

// 构建gosper空间曲线和正六边形格网
function consGosperAndHex(hexSize) {
  const stepLen = hexSize || 10;
  const initialAngle = 0; // Math.PI * 0.5;
  const iterateLevel = 3;
  const { hexes, gosperNodes, layout } = gosperAndHexGrid(
    camera,
    this.container,
    stepLen,
    initialAngle,
    iterateLevel
  );

  const hexesObj3D = new THREE.Object3D()
  scene.add(hexesObj3D)

  hexes.forEach(hex => {
    const hexH = Math.random() * 30
    const hexElevation = hexH * 0.5
    drawHex3d(hexR, hexH, hex.center, 0xcccccc, hexesObj3D, hexElevation)
  })
}

module.exports = DEMO;
