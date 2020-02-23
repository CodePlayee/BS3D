/**
 * Gosper Curve
 * Angle:60°
 * Axiom:A
 * Replacement rules:
 * A->A-B--B+A++AA+B-
 * B->+A-BB--B-A++A+B
 * Both A and B mean to move forward,
  + means to turn left 60 degrees,
  - means to turn right 60 degrees.
 */
class Gosper {
    /**
     *
     * @param {number} x  x value of the start pt of gosper curve
     * @param {number} y y value of the start pt of gosper curve
     * @param {*} step the length in screen of each segment in gosper curve.
     * @param {*} initalAngle the inital direction from the starting pt.
     * @param {int} iterateLevel the iterate level of gosper curve
     */
    constructor(x, y, step = 10, initalAngle = Math.PI * 0.5, iterateLevel) {
        this.x = x || 10;
        this.y = y || 10;
        this.initalAngle = initalAngle;
        this.step = step;
        this.iterateLevel = iterateLevel;
        // gosper曲线节点
        this.pts = [[this.x, this.y]];
    }

    replaceAll(str, mapObj) {
        const regExp = new RegExp(Object.keys(mapObj).join('|'), 'gi');
        return str.replace(regExp, matched => mapObj[matched]);
    }

    produce(iterateLevel) {
        let result = Gosper.axiom;
        for (let i = 0; i < iterateLevel; i++) {
            result = this.replaceAll(result, Gosper.rules);
        }
        return result;
    }

    incX(angle) {
        return Math.cos(angle) * this.step;
    }

    incY(angle) {
        return Math.sin(angle) * this.step;
    }

    // 采用 turtle graphic 语法，移动一步，产生一个节点
    moveStep(angle) {
        this.x += this.incX(angle);
        this.y += this.incY(angle);
        this.pts.push([this.x, this.y]);
    }

    // 获取 gosper 曲线上的节点
    calGosperNodes() {
        let angle = this.initalAngle;
        const result = this.produce(this.iterateLevel);

        for (let stringIndex = 0; stringIndex < result.length; stringIndex++) {
            switch (result[stringIndex]) {
                case 'A':
                case 'B':
                    this.moveStep(angle);
                    break;
                case '-':
                    angle -= Math.PI / 3;
                    break;
                case '+':
                    angle += Math.PI / 3;
                    break;
                default:
                    break;
            }
        }
        return this.pts;
    }
}

// 静态属性
Gosper.axiom = 'A';
Gosper.rules = {
    A: 'A-B--B+A++AA+B-',
    B: '+A-BB--B-A++A+B'
};

module.exports = Gosper;
