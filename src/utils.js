const d3 = require('d3');
const Hexagon = require('./hexagon');

const { Hex } = Hexagon;

// 几何中心
const calGeomCenter = pts => {
    let xs = 0,
        ys = 0;
    pts.forEach(pt => {
        xs += pt[0];
        ys += pt[1];
    });
    const n = pts.length || 1;
    return [xs / n, ys / n];
};

// 点群凸包
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const lexicographicOrder = (a, b) => a[0] - b[0] || a[1] - b[1];
// Computes the upper convex hull per the monotone chain algorithm.
// http://en.wikibooks.org/wiki/Algorithm_Implementation/Geometry/Convex_hull/Monotone_chain
// Assumes points.length >= 3, is sorted by x, unique in y.
// Returns an array of indices into points in left-to-right order.
function computeUpperHullIndexes(points) {
    const n = points.length,
        indexes = [0, 1];
    let size = 2;

    for (let i = 2; i < n; ++i) {
        while (size > 1 && cross(points[indexes[size - 2]], points[indexes[size - 1]], points[i]) <= 0)--size;
        indexes[size++] = i;
    }

    return indexes.slice(0, size); // remove popped points
}

const calHullPts = points => {
    const n = points.length;
    if (n < 3) return null;

    let i;

    const sortedPoints = new Array(n),
        flippedPoints = new Array(n);

    for (i = 0; i < n; ++i) sortedPoints[i] = [+points[i][0], +points[i][1], i];
    sortedPoints.sort(lexicographicOrder);
    for (i = 0; i < n; ++i) flippedPoints[i] = [sortedPoints[i][0], -sortedPoints[i][1]];

    const upperIndexes = computeUpperHullIndexes(sortedPoints),
        lowerIndexes = computeUpperHullIndexes(flippedPoints);

    // Construct the hull polygon, removing possible duplicate endpoints.
    const skipLeft = lowerIndexes[0] === upperIndexes[0],
        skipRight = lowerIndexes[lowerIndexes.length - 1] === upperIndexes[upperIndexes.length - 1],
        hull = [];

    // Add upper hull in right-to-l order.
    // Then add lower hull in left-to-right order.
    for (i = upperIndexes.length - 1; i >= 0; --i) hull.push(points[sortedPoints[upperIndexes[i]][2]]);
    for (i = +skipLeft; i < lowerIndexes.length - skipRight; ++i) hull.push(points[sortedPoints[lowerIndexes[i]][2]]);

    return hull;
};

// 对节点集合进行力导向布局
const forceLayout = (width, height, nodes, gapScale = 1) => {
    if (nodes && Array.isArray(nodes[0])) {
        nodes = nodes.map(node => {
            return { x: node[0], y: node[1] };
        });
    }

    const force = d3.layout.force().size([width, height]);
    const links = [];
    // 借助 voronoi 的对偶 delaunay 构成节点间的links
    d3.geom
        .voronoi()
        .links(nodes)
        .forEach(link => {
            const dx = link.source.x - link.target.x;
            const dy = link.source.y - link.target.y;
            link.distance = Math.sqrt(dx * dx + dy * dy);
            links.push(link);
        });

    // "linkDistance" defines the distance (normally in pixels) between connected nodes.
    force
        .gravity(0)
        .nodes(nodes)
        .links(links)
        .linkDistance(d => d.distance * gapScale)
        .start();

    // the num of force.tick get called is 300, which can be adjusted to control the quality and efficiency.
    for (let i = 0; i < 200; i++) {
        force.tick();
    }
    force.stop(); // stop the force explicitly to end the calculation quickly
    return { nodes, links };
};

// 计算两个正六边形单元之间的距离
function heuristic(a, b) {
    if (a instanceof Hex && b instanceof Hex) {
        return a.distance(b);
    }
    console.error('a or b is not a Hex.');
}

/**
 * 使用 A* 算法计算两点间的最短路径
 * @param {*} startHex 起点Hex
 * @param {*} endHex 终点Hex
 * @param {*} moveCost 移动代价（要素间与要素内不同）
 */
function aStar(startHex, endHex, moveCost) {
    const frontier = [{ hex: startHex, priority: 0 }]; // 优先队列
    const costSoFar = {};
    costSoFar[startHex.coordStr()] = 0;

    const cameFrom = new Map();
    cameFrom.set(startHex, null);

    while (frontier.length > 0) {
        const { hex: curHex } = frontier.shift();
        if (curHex.equal(endHex)) {
            cameFrom.set(endHex, cameFrom.get(curHex));
            break;
        }

        // eslint-disable-next-line no-restricted-syntax
        for (const nextHex of curHex.getNeighbors()) {
            const { q, r, s } = nextHex;
            const key = `${q},${r},${s}`;

            const curHexStr = curHex.coordStr();
            let newCost = costSoFar[curHexStr];
            // 如果是构建两个要素间的两个目标之间的联系
            if (Array.isArray(moveCost)) {
                if (moveCost[0][key] && !moveCost[1][key]) {
                    newCost += 500; // 在无关的面状要素内的移动代价
                } else {
                    newCost += 1; // 在其他区域的移动代价
                }
            } else {
                // 如果是构建要素内的两个目标间的联系
                newCost += moveCost[key] ? 1 : 1000;
            }

            const nextHexStr = nextHex.coordStr();
            if (!costSoFar[nextHexStr] || newCost < costSoFar[nextHexStr]) {
                costSoFar[nextHexStr] = newCost;
                const priority = newCost + heuristic(nextHex, endHex);
                // 维护 priorityQueue
                let isNew = true;
                let i = 0;
                const len = frontier.length;
                for (; i < len; i++) {
                    const item = frontier[i];
                    if (item.hex.equal(nextHex)) {
                        item.priority = priority;
                        frontier.sort((a, b) => a.priority - b.priority); // to be optimized
                        isNew = false;
                        break;
                    }
                }
                if (isNew) {
                    i = 0;
                    for (; i < len; i++) {
                        if (frontier[i].priority >= priority) {
                            frontier.splice(i, 0, { hex: nextHex, priority });
                            break;
                        }
                    }
                    if (i === len) {
                        frontier.push({ hex: nextHex, priority });
                    }
                }

                cameFrom.set(nextHex, curHex);
            }
        }
    }

    let cur = endHex;
    const path = [];
    while (cur && !cur.equal(startHex)) {
        path.unshift(cur);
        cur = cameFrom.get(cur);
    }
    path.unshift(startHex);

    return path;
}

/**
 *  线之间的协调，将两条线尽可能重合。
 * @param {[[]]} linePair 线的数组，每条线为 hex 数组
 */
function coordinate2lines(linePair) {
    // 每次处理两条线
    const line1 = linePair[0];
    const line2 = linePair[1];

    const lineHexStr1 = {};
    line1.forEach((hex, i) => {
        lineHexStr1[hex.coordStr()] = i + 1;
    });
    const lineHexStr2 = {};
    line2.forEach((hex, i) => {
        lineHexStr2[hex.coordStr()] = i + 1;
    });

    const coverIdx1 = []; // 重合点在第一条线上的索引
    for (let i = 0, len = line1.length; i < len; i++) {
        const key = line1[i].coordStr();
        const lastKey = line1[i - 1] && line1[i - 1].coordStr();
        const nextKey = line1[i + 1] && line1[i + 1].coordStr();
        if (lineHexStr2[key]) {
            // 前后都是重合点的不加入
            if (!lineHexStr2[lastKey] || !lineHexStr2[nextKey]) {
                coverIdx1.push(lineHexStr1[key] - 1);
            }
        }
    }

    if (!coverIdx1.length) return;

    const coverIdx2 = []; // 重合点在第二条线上的索引
    for (let i = 0, len = line2.length; i < len; i++) {
        const key = line2[i].coordStr();
        const lastKey = line2[i - 1] && line2[i - 1].coordStr();
        const nextKey = line2[i + 1] && line2[i + 1].coordStr();
        if (lineHexStr1[key]) {
            if (!lineHexStr1[lastKey] || !lineHexStr1[nextKey]) {
                coverIdx2.push(lineHexStr2[key] - 1);
            }
        }
    }

    const spliceIdx1 = [],
        spliceIdx2 = [];
    const coverPtCount = coverIdx1.length;
    // 重合点数量为偶数
    if (coverPtCount % 2 === 0) {
        for (let i = 0; i < coverPtCount; i = i + 2) {
            const gap1 = coverIdx1[i + 1] - coverIdx1[i] - 1;
            const gap2 = coverIdx2[i + 1] - coverIdx2[i] - 1;
            const seg1 = line1.slice(coverIdx1[i], coverIdx1[i + 1]);
            const seg2 = line2.slice(coverIdx2[i], coverIdx2[i + 1]);
            gap1 >= gap2 ? spliceIdx1.push([coverIdx1[i], gap1, seg2]) : spliceIdx2.push([coverIdx2[i], gap2, seg1]);
        }
    } else {
        // 重合点数量为奇数
        for (let i = 0; i < coverPtCount - 1; i++) {
            const gap1 = coverIdx1[i + 1] - coverIdx1[i] - 1;
            const gap2 = coverIdx2[i + 1] - coverIdx2[i] - 1;
            const seg1 = line1.slice(coverIdx1[i], coverIdx1[i + 1]);
            const seg2 = line2.slice(coverIdx2[i], coverIdx2[i + 1]);
            gap1 >= gap2 ? spliceIdx1.push([coverIdx1[i], gap1, seg2]) : spliceIdx2.push([coverIdx2[i], gap2, seg1]);
        }
    }

    let deleted = 0;
    for (let i = 0; i < spliceIdx1.length; i++) {
        const delIdx = spliceIdx1[i][0] - deleted + 1;
        const deleteCount = spliceIdx1[i][1];
        const alterItems = spliceIdx1[i][2];
        line1.splice(delIdx, deleteCount, ...alterItems);
        deleted += deleteCount - alterItems.length;
    }
    deleted = 0;
    for (let i = 0; i < spliceIdx2.length; i++) {
        const delIdx = spliceIdx2[i][0] - deleted + 1;
        const deleteCount = spliceIdx2[i][1];
        const alterItems = spliceIdx2[i][2];
        line2.splice(delIdx, deleteCount, ...alterItems);
        deleted += deleteCount - alterItems.length;
    }
}

module.exports = { aStar, calGeomCenter, calHullPts, forceLayout, coordinate2lines };
