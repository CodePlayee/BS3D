/* eslint-disable no-restricted-syntax */
// used to draw figures
const THREE = require('three');
const { MeshLine, MeshLineMaterial } = require('three.meshline');

function drawHex3d(radius, height, center, color, parent, elevation = 0) {
    const radialSegments = 6; // hex has 6 edges.
    const geometry = new THREE.CylinderGeometry(radius, radius, height, radialSegments);
    const material = new THREE.MeshPhongMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    if (Array.isArray(center)) {
        mesh.position.set(center[0], elevation, center[1]);
    } else {
        mesh.position.set(center.x, elevation, center.y);
    }

    parent.add && parent.add(mesh);
    return mesh;
}

// 绘制 THREE.Line 型的线（实线或虚线，但宽度只能是1）
function drawThinLine(isDash, parent, nodes, color = 0xffffff, elevation = 0) {
    const geometry = new THREE.Geometry();
    nodes.forEach(node => {
        // 绘图平面为 xz
        const x = node[0] || node.x || 0;
        const z = node[1] || node.y || 0;
        const y = elevation || node[2] || node.z;
        geometry.vertices.push(new THREE.Vector3(x, y, z));
    });

    let material;
    if (isDash) {
        material = new THREE.LineDashedMaterial({
            color,
            scale: 1,
            dashSize: 1,
            gapSize: 2,
            isLineDashedMaterial: true,
            transparent: true,
            opacity: 0.6
        });
    } else {
        material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 });
    }

    const obj3D = new THREE.Line(geometry, material);
    isDash && obj3D.computeLineDistances(); // 不可或缺的，否则线段不能显示为虚线
    parent.add(obj3D);
    return obj3D;
}

// 绘制 MeshLine 型的线（支持宽度），但需要手动加入 pickHelper
function drawMeshLine(parent, nodes, color = 0xffffff, elevation = 0, linewidth = 1, pickHelper) {
    const geometry = new THREE.Geometry();
    nodes.forEach(node => {
        // 绘图平面为 xz
        const x = node[0] || node.x || 0;
        const z = node[1] || node.y || 0;
        const y = elevation || node[2] || node.z;
        geometry.vertices.push(new THREE.Vector3(x, y, z));
    });

    const material = new MeshLineMaterial({ color, lineWidth: linewidth, transparent: true, opacity: 0.5 });
    const line = new MeshLine();
    line.setGeometry(geometry, () => linewidth);
    const obj3D = new THREE.Mesh(line.geometry, material);
    pickHelper && pickHelper.meshLines.push({ meshLine: line, mesh: obj3D }); // MeshLine的鼠标选中需要特殊处理
    parent.add(obj3D);

    return obj3D;
}

/**
 * 绘制二维样条曲线
 * @param {[[]]} pts 
 * @param {Object3D} parent 
 */
function drawSplineCurve(parent, pts, color = 0xffffff) {
    const vec2pts = pts.map(pt => new THREE.Vector2(pt[0], pt[1]))
    const curve = new THREE.SplineCurve(vec2pts);
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color });

    const splineObject = new THREE.Line(geometry, material);
    parent.add(splineObject)
}

module.exports = { drawHex3d, drawMeshLine, drawThinLine, drawSplineCurve };
