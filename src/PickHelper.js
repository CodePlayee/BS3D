const THREE = require('three');

// refer to https://threejsfundamentals.org/threejs/lessons/threejs-picking.html
class PickHelper {
    // this should be called only once
    constructor(canvas) {
        this.raycaster = new THREE.Raycaster();
        this.pickedObjs = []; // 按照距离排序
        this.pickedObjsSavedColors = [];
        // this.relatedObjs = []; // 与选中对象关联的对象
        // this.relatedObjsSavedColors = [];

        this.pickPosition = { x: 0, y: 0 };
        this.canvas = canvas;
        this.meshLines = []; // 其中元素为 {MeshLine对象, Mesh对象}
        // THREE.Object3D 与 map 对象（MapPoint,MapLine,MapPolygon）映射表
        this.obj3D2mapObj = new Map();

        window.addEventListener('mousemove', e => this.setPickPosition(e));
        window.addEventListener('mouseout', e => this.clearPickPosition());
        window.addEventListener('mouseleave', e => this.clearPickPosition());
        window.addEventListener(
            'touchstart',
            event => {
                // prevent the window from scrolling
                event.preventDefault();
                this.setPickPosition(event.touches[0]);
            },
            { passive: false }
        );

        window.addEventListener('touchmove', event => {
            this.setPickPosition(event.touches[0]);
        });

        window.addEventListener('touchend', this.clearPickPosition);
    }

    pick(scene, camera, color = 0xff0000) {
        // restore the color if there are picked objects.
        if (this.pickedObjs.length) {
            this.pickedObjs.forEach((obj3D, idx) => {
                const savedColor = this.pickedObjsSavedColors[idx];
                obj3D.material && obj3D.material.setValues({ color: savedColor });
            });
            this.pickedObjs.length = 0;
            this.pickedObjsSavedColors.length = 0;

            // this.recoverRelatedObj();
        }

        const normalizedPosition = this.pickPosition;
        // cast a ray through the frustum
        this.raycaster.setFromCamera(normalizedPosition, camera);

        // get the list of meshLines the ray intersected
        const intersectedMeshLines = this.pickMeshLine(this.meshLines).map(idx => this.meshLines[idx].mesh);
        // get the list of objects the ray intersected
        let intersectedObjects = this.raycaster.intersectObjects(scene.children, true);

        intersectedObjects = [...intersectedObjects, ...intersectedMeshLines];
        if (intersectedObjects.length) {
            intersectedObjects.forEach(intersectedObj => {
                const pickedObj3D = intersectedObj.object || intersectedObj;
                const repeated = addOnlyOnce(this.pickedObjs, this.pickedObjsSavedColors, pickedObj3D);
                // if (!repeated) {
                //     this.addRelatedObj(pickedObj3D);
                // }
            });
            this.activePickedAndRelatedObjs(color);
        }
    }

    /**
     *
     * @param {MeshLine[]} meshLines
     */
    pickMeshLine(meshLines) {
        const intersectedMeshLines = [];
        const intersectedIdxes = [];
        let lastIntersectedCount = 0;
        meshLines.forEach((obj, idx) => {
            const { meshLine } = obj;
            meshLine.raycast && meshLine.raycast(this.raycaster, intersectedMeshLines);
            if (intersectedMeshLines.length > lastIntersectedCount) {
                intersectedIdxes.push(idx);
                lastIntersectedCount = intersectedMeshLines.length;
            }
        });

        return intersectedIdxes;
    }

    getCanvasRelativePosition(event) {
        const { canvas } = this;
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    setPickPosition(event) {
        const { canvas } = this;
        const pos = this.getCanvasRelativePosition(event);
        // 归一化处理[-1,1]
        this.pickPosition.x = (pos.x / canvas.clientWidth) * 2 - 1;
        this.pickPosition.y = (pos.y / canvas.clientHeight) * -2 + 1; // flip y
    }

    clearPickPosition() {
        this.pickPosition.x = -100000;
        this.pickPosition.y = -100000;
    }

    setMap(obj3D, mapObj) {
        this.obj3D2mapObj.set(obj3D, mapObj);
    }

    getMapObj(obj3D) {
        return this.obj3D2mapObj.get(obj3D);
    }

    /**
     * 添加关联对象
     * @param {*} pickedObj3D 鼠标当前选中的对象
     */
    // addRelatedObj(pickedObj3D) {
    //     const mapObj = this.getMapObj(pickedObj3D);

    //     // case0:选中的是点符号，激活自身及其关联的线符号，面符号
    //     if (mapObj instanceof MapPoint) {
    //         // 激活多边形的边界
    //         const { mapPolygon, mapLines } = mapObj;
    //         const { border } = mapPolygon.obj3D;
    //         addOnlyOnce(this.relatedObjs, this.relatedObjsSavedColors, border);
    //         // 激活关联的线符号
    //         const { inner, outer } = mapLines;
    //         [...inner, ...outer].forEach(line => {
    //             const { obj3D } = line;
    //             addOnlyOnce(this.relatedObjs, this.relatedObjsSavedColors, obj3D);
    //         });
    //     }
    // }

    // 恢复关联对象
    // recoverRelatedObj() {
    //     // restore the color if there are pick-related objects
    //     if (this.relatedObjs.length) {
    //         this.relatedObjs.forEach((obj3D, idx) => {
    //             const savedColor = this.relatedObjsSavedColors[idx];
    //             obj3D.material && obj3D.material.setValues({ color: savedColor });
    //         });
    //         this.relatedObjs.length = 0;
    //         this.relatedObjsSavedColors.length = 0;
    //     }
    // }

    // 激活选中和关联对象（注意选中对象数组和关联对象数组可能有元素重合）
    activePickedAndRelatedObjs(activeColor) {
        const objs2active = [...this.pickedObjs];
        // this.relatedObjs.forEach(relatedObj => {
        //     let repeated = false;
        //     for (let i = objs2active.length - 1; i > -1; i--) {
        //         if (objs2active[i].uuid === relatedObj.uuid) {
        //             repeated = true;
        //             break;
        //         }
        //     }
        //     if (!repeated) {
        //         objs2active.push(relatedObj);
        //     }
        // });
        objs2active.forEach(obj => {
            obj.material && obj.material.setValues({ color: activeColor });
        });
    }
}

// 仅向数组（选中对象数组和关联对象数组）添加一次
function addOnlyOnce(objs, savedColors, obj) {
    let repeated = false;
    for (let i = objs.length - 1; i >= 0; i--) {
        if (objs[i].uuid === obj.uuid) {
            repeated = true;
            break;
        }
    }
    if (!repeated) {
        objs.push(obj);
        savedColors.push(obj.material.color.getHex());
    }
    return repeated;
}

module.exports = { PickHelper };
