const Gosper = require('./gosper');
const Hexagon = require('./hexagon');

const { calGeomCenter, calHullPts, forceLayout } = require('./utils');


// 构建gosper空间填充曲线和对应正六边形格网(不绘制)
function gosperAndHexGrid(camera, container, stepLen = 10, initialAngle = Math.PI * 0.5, iterateLevel = 3) {
    const { Layout } = Hexagon;
    // 注意相机位置对显示内容范围的影响
    const { fov, position } = camera;
    const hInCamera = position.y * 2 * Math.tan(((fov * 0.5) / 180) * Math.PI);
    const wInCamera = hInCamera * (container.clientWidth / container.clientHeight);
    const xRatio = wInCamera / container.clientWidth;
    const originX = Math.round(-container.clientWidth * 0.5 * xRatio + stepLen * 2);
    const originY = 0;

    const gosper = new Gosper(originX, originY, stepLen, initialAngle, iterateLevel);
    let gosperNodes = gosper.calGosperNodes();
    let gosperCenter = calGeomCenter(gosperNodes);
    gosperCenter = [Math.round(gosperCenter[0]), Math.round(gosperCenter[1])];

    // 将gosper曲线几何中心平移至[0,0]
    gosperNodes = gosperNodes.map(node => [node[0] - gosperCenter[0], node[1] - gosperCenter[1]]);
    // 构建正六边形格网
    const hexes = []; // 存储所有正六边单元
    const hexR = stepLen / Math.sqrt(3);
    const size = [hexR, hexR];
    const origin = [gosperNodes[0][0], gosperNodes[0][1]]; // 六边形系统在绘图区域的原点
    const layout = new Layout(Layout.pointy, size, origin);

    for (let i = 0, len = gosperNodes.length; i < len; i++) {
        const pt = [gosperNodes[i][0], gosperNodes[i][1]];
        const hex = layout.pixelToHex(pt).round();
        const corners = layout.hexCorners2(pt);
        hex.corners = corners;
        hex.center = [gosperNodes[i][0], gosperNodes[i][1]];
        hexes.push(hex);
    }

    return { hexes, gosperNodes, layout };
}

// function spatialization(data, width, height, hexSize, obj3Dnames, hexes, gosperNodes, scene, layout) {
//     // const feaColors = ['rgb(254,67,101)', 'rgb(69,137,148)', 'rgb(224,228,10)', 'rgb(222,87,18)', 'rgb(65,170,52)'];
//     const hexCount = hexes.length;

//     // 实际数据待替换
//     const proportionRatios = [0, 0.15, 0.4, 0.7, 0.85, 1]; // 各数据群组元素数量比率
//     const proportion = proportionRatios.map(ratio => Math.round(hexCount * ratio));
//     const mpRawData = {
//         entities: [{}, {}, {}, {}, {}, {}],
//         innerLinks: [
//             { source: 0, target: 1 },
//             { source: 0, target: 2 },
//             { source: 0, target: 5 },
//             { source: 2, target: 3 }
//         ]
//     };

//     const mapPolygons = [];

//     for (let i = 0, len = proportion.length; i < len - 1; i++) {
//         const s = proportion[i],
//             t = proportion[i + 1];
//         const mpHexes = hexes.slice(s, t);
//         const mpGosperNodes = gosperNodes.slice(s, t);
//         const mapPolygon = new MapPolygon(mpHexes, mpGosperNodes, mpRawData);
//         mapPolygons.push(mapPolygon);
//     }

//     const translate = forceLayoutTranslate(mapPolygons, width, height, 1.6);

//     mapPolygons.forEach((mapPolygon, idx) => {
//         mapPolygon.translate(translate[idx], layout);
//     });

//     return mapPolygons;
// }

// 计算地图要素经过力导向布局后的偏移量

function forceLayoutTranslate(mapPolygons, width, height, gapScale = 1) {
    // 用来进行力导向布局的节点(在地图要素凸包点集中均匀采样得到)
    const sampleGroupNum = 4; // 采样组数

    const hullSampleGroup = mapPolygons.map(polygon => {
        const hullPts = calHullPts(polygon.geometry.borderPts);
        const sample = [];
        const gap = Math.round((hullPts.length - 1) / sampleGroupNum);
        for (let i = 0, len = hullPts.length; i < len; i += gap) {
            sample.push(hullPts[i]);
        }
        return sample;
    });

    // 单个多边形外轮廓点采样数目
    const transOffsetGroup = []; // 各组采样点确定的平移总量
    for (let j = 0; j < sampleGroupNum; j++) {
        // 某一组采样点系列
        const sampleSeries = hullSampleGroup.map(sample => sample[j]);
        const result = forceLayout(width, height, sampleSeries, gapScale);
        // 图斑中心布局节点
        const { nodes: layoutNodes } = result;
        const transOffset = sampleSeries.map((item, idx) => {
            return [layoutNodes[idx].x - item[0], layoutNodes[idx].y - item[1]];
        });
        transOffsetGroup.push(transOffset);
    }

    const translate = []; // 采用各系列采样点算出的偏移量的最大值
    for (let i = 0, len = mapPolygons.length; i < len; i++) {
        let xTransMax = 0,
            yTransMax = 0;
        transOffsetGroup.forEach(item => {
            xTransMax = Math.abs(xTransMax) < Math.abs(item[i][0]) ? item[i][0] : xTransMax;
            yTransMax = Math.abs(yTransMax) < Math.abs(item[i][1]) ? item[i][1] : yTransMax;
        });

        translate.push([xTransMax, yTransMax]);
    }
    return translate;
}

module.exports = { gosperAndHexGrid };
