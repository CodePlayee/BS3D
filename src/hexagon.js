/* eslint-disable max-classes-per-file */
// the following code is base on http://www.redblobgames.com/grids/hexagons/
// Thanks to Amit and other experts in related domain.
// Recommand: cube coordinates for algorithms and axial or doubled for storage.
// GaoZhen at 2020/01/12

// 采用三斜轴坐标系(cube coordinates come from 3d cartesian coordinates.)
class Hex {
    constructor(q, r, s, corners) {
        this.q = q;
        this.r = r;
        this.s = s;
        this.corners = corners || [];
        this.center = [];
    }

    add(b) {
        return new Hex(this.q + b.q, this.r + b.r, this.s + b.s);
    }

    subtract(b) {
        return new Hex(this.q - b.q, this.r - b.r, this.s - b.s);
    }

    scale(k) {
        return new Hex(this.q * k, this.r * k, this.s * k);
    }

    rotateLeft() {
        return new Hex(-this.s, -this.q, -this.r);
    }

    rotateRight() {
        return new Hex(-this.r, -this.s, -this.q);
    }

    static direction(direction) {
        return Hex.directions[direction];
    }

    neighbor(direction) {
        return this.add(Hex.direction(direction));
    }

    getNeighbors() {
        const neighbors = [];
        for (let i = 0; i < 6; i++) {
            neighbors.push(this.neighbor(i));
        }
        return neighbors;
    }

    diagonalNeighbor(direction) {
        return this.add(Hex.diagonals[direction]);
    }

    // Adjacent hexagons are distance 1 apart in the hex grid but distance 2 apart in the cube grid.
    // In a cube grid, Manhattan distances are abs(dx) + abs(dy) + abs(dz). The distance on a hex grid is half that.
    len() {
        return (Math.abs(this.q) + Math.abs(this.r) + Math.abs(this.s)) / 2;
    }

    distance(b) {
        return this.subtract(b).len();
    }

    round() {
        let qi = Math.round(this.q);
        let ri = Math.round(this.r);
        let si = Math.round(this.s);
        const qDiff = Math.abs(qi - this.q);
        const rDiff = Math.abs(ri - this.r);
        const sDiff = Math.abs(si - this.s);
        if (qDiff > rDiff && qDiff > sDiff) {
            qi = -ri - si;
        } else if (rDiff > sDiff) {
            ri = -qi - si;
        } else {
            si = -qi - ri;
        }
        return new Hex(qi, ri, si);
    }

    lerp(b, t) {
        return new Hex(this.q * (1.0 - t) + b.q * t, this.r * (1.0 - t) + b.r * t, this.s * (1.0 - t) + b.s * t);
    }

    linedraw(b) {
        const N = this.distance(b);
        const aNudge = new Hex(this.q + 1e-6, this.r + 1e-6, this.s - 2e-6);
        const bNudge = new Hex(b.q + 1e-6, b.r + 1e-6, b.s - 2e-6);
        const results = [];
        const step = 1.0 / Math.max(N, 1);
        for (let i = 0; i <= N; i++) {
            results.push(aNudge.lerp(bNudge, step * i).round());
        }
        return results;
    }

    equal(hex) {
        if (this.q === hex.q && this.r === hex.r) {
            return true;
        }
        // const roundedThis = this.round();
        // const roundedHex = hex.round();
        // if (roundedThis.q === roundedHex.q && roundedThis.r === roundedHex.r) {
        //   return true;
        // }
        return false;
    }

    coordStr() {
        return `${this.q},${this.r},${this.s}`;
    }
}

Hex.directions = [
    new Hex(1, 0, -1),
    new Hex(1, -1, 0),
    new Hex(0, -1, 1),
    new Hex(-1, 0, 1),
    new Hex(-1, 1, 0),
    new Hex(0, 1, -1)
];
Hex.diagonals = [
    new Hex(2, -1, -1),
    new Hex(1, -2, 1),
    new Hex(-1, -1, 2),
    new Hex(-2, 1, 1),
    new Hex(-1, 2, -1),
    new Hex(1, 1, -2)
];

// 采用笛卡尔直角坐标系
class OffsetCoord {
    constructor(col, row) {
        this.col = col;
        this.row = row;
    }

    // 三斜轴坐标转直角坐标（q代表平底型,r代表顶角型）
    static qoffsetFromCube(offset, h) {
        const col = h.q;
        const row = h.r + (h.q + offset * (h.q & 1)) / 2;
        if (offset !== OffsetCoord.EVEN && offset !== OffsetCoord.ODD) {
            throw new Error('offset must be EVEN (+1) or ODD (-1)');
        }
        return new OffsetCoord(col, row);
    }

    static qoffsetToCube(offset, h) {
        const q = h.col;
        const r = h.row - (h.col + offset * (h.col & 1)) / 2;
        const s = -q - r;
        if (offset !== OffsetCoord.EVEN && offset !== OffsetCoord.ODD) {
            throw new Error('offset must be EVEN (+1) or ODD (-1)');
        }
        return new Hex(q, r, s);
    }

    static roffsetFromCube(offset, h) {
        const col = h.q + (h.r + offset * (h.r & 1)) / 2;
        const row = h.r;
        if (offset !== OffsetCoord.EVEN && offset !== OffsetCoord.ODD) {
            throw new Error('offset must be EVEN (+1) or ODD (-1)');
        }
        return new OffsetCoord(col, row);
    }

    static roffsetToCube(offset, h) {
        const q = h.col - (h.row + offset * (h.row & 1)) / 2;
        const r = h.row;
        const s = -q - r;
        if (offset !== OffsetCoord.EVEN && offset !== OffsetCoord.ODD) {
            throw new Error('offset must be EVEN (+1) or ODD (-1)');
        }
        return new Hex(q, r, s);
    }
}

OffsetCoord.EVEN = 1;
OffsetCoord.ODD = -1;

// 另一种直角坐标系
class DoubledCoord {
    constructor(col, row) {
        this.col = col;
        this.row = row;
    }

    // q代表平底型,r代表顶角型
    static qdoubledFromCube(h) {
        const col = h.q;
        const row = 2 * h.r + h.q;
        return new DoubledCoord(col, row);
    }

    qdoubledToCube() {
        const q = this.col;
        const r = (this.row - this.col) / 2;
        const s = -q - r;
        return new Hex(q, r, s);
    }

    static rdoubledFromCube(h) {
        const col = 2 * h.q + h.r;
        const row = h.r;
        return new DoubledCoord(col, row);
    }

    rdoubledToCube() {
        const q = (this.col - this.row) / 2;
        const r = this.row;
        const s = -q - r;
        return new Hex(q, r, s);
    }
}

/**
 * the helper class for layout
 * @param f(0-3):forward matrix
 * @param b(0-3):inverse matrix
 */
class Orientation {
    constructor(f0, f1, f2, f3, b0, b1, b2, b3, startAngle) {
        this.f0 = f0;
        this.f1 = f1;
        this.f2 = f2;
        this.f3 = f3;
        this.b0 = b0;
        this.b1 = b1;
        this.b2 = b2;
        this.b3 = b3;
        this.startAngle = startAngle;
    }
}

class Layout {
    /**
     *
     * @param {Orientation} orientation
     * @param {Array} size 用于在横纵方向拉伸或挤压六边形（注意不等同于宽高）
     * @param {Array} origin 六边形系统在绘图区域的原点
     */
    constructor(orientation, size, origin) {
        this.orientation = orientation;
        this.size = size;
        this.origin = origin;
    }

    // hex(the center point of hex) to screen
    hexToPixel(h) {
        const M = this.orientation;
        const { size, origin } = this;

        const x = (M.f0 * h.q + M.f1 * h.r) * size[0];
        const y = (M.f2 * h.q + M.f3 * h.r) * size[1];
        return [x + origin[0], y + origin[1]];
    }

    /**
     * screen to hex
     * @param {Array} p
     * @returns {Hex} fractional hex
     */
    pixelToHex(p) {
        const M = this.orientation;
        const { size, origin } = this;
        const pt = [(p[0] - origin[0]) / size[0], (p[1] - origin[1]) / size[1]];
        const q = M.b0 * pt[0] + M.b1 * pt[1];
        const r = M.b2 * pt[0] + M.b3 * pt[1];
        return new Hex(q, r, -q - r);
    }

    /**
     * calculate the relative coordinates of a corner of one hex.
     * @param {int} corner
     */
    hexCornerOffset(corner) {
        const M = this.orientation;
        const { size } = this;
        const angle = (2.0 * Math.PI * (M.startAngle - corner)) / 6.0;
        return [size[0] * Math.cos(angle), size[1] * Math.sin(angle)];
    }

    /**
     * get the corners of one hex
     * @param {Hex} h 正六边形对象
     */
    hexCorners(h) {
        const corners = [];
        const center = this.hexToPixel(h);
        for (let i = 5; i >= 0; i--) {
            const offset = this.hexCornerOffset(i);
            corners.push([center[0] + offset[0], center[1] + offset[1]]);
        }
        return [...corners, corners[0]];
    }

    /**
     *
     * @param {Array} p 正六边形单元中心的屏幕坐标点
     * @return 正六边形顶点数组（闭合）
     */
    hexCorners2(p) {
        const corners = [];
        for (let i = 5; i >= 0; i--) {
            const offset = this.hexCornerOffset(i);
            corners.push([p[0] + offset[0], p[1] + offset[1]]);
        }
        return [...corners, corners[0]];
    }
}

// there are only two orientations: pointy and flat.
Layout.pointy = new Orientation(
    Math.sqrt(3.0),
    Math.sqrt(3.0) / 2.0,
    0.0,
    3.0 / 2.0,
    Math.sqrt(3.0) / 3.0,
    -1.0 / 3.0,
    0.0,
    2.0 / 3.0,
    0.5
);
Layout.flat = new Orientation(
    3.0 / 2.0,
    0.0,
    Math.sqrt(3.0) / 2.0,
    Math.sqrt(3.0),
    2.0 / 3.0,
    0.0,
    -1.0 / 3.0,
    Math.sqrt(3.0) / 3.0,
    0.0
);

module.exports = { Hex, OffsetCoord, DoubledCoord, Orientation, Layout };
