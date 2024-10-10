const Indicator = require('./indicator'); // 假设 indicator.js 和 indicator.test.js 在同一目录下

describe('Indicator Class', () => {
    let indicator;
    let data;

    beforeAll(() => {
        // 模拟数据
        data = [
            { day: '2023-01-01', net_value: 1000 },
            { day: '2023-01-02', net_value: 1010 },
            { day: '2023-01-03', net_value: 1020 },
            { day: '2023-01-04', net_value: 980 },
            { day: '2023-01-05', net_value: 990 },
        ];

        // 初始化 Indicator 实例
        indicator = new Indicator(data[0].day, data[0].net_value, 0.02);
        for (let i = 1; i < data.length; i++) {
            indicator.update(data[i].day, data[i].net_value, 0.02);
        }
    });

    test('should calculate drawdown correctly', () => {
        expect(indicator.drawdown).toBeGreaterThanOrEqual(0);
        expect(indicator.drawdown).toBeLessThanOrEqual(1);
        expect(new Date(indicator.drawdownStartDate)).toBeLessThanOrEqual(new Date(indicator.drawdownEndDate));
    });

    test('should calculate annual return correctly', () => {
        expect(indicator.annualReturnAcc).toBeGreaterThanOrEqual(0);
    });

    test('should calculate calmar ratio correctly', () => {
        if (indicator.drawdown > 0) {
            expect(indicator.calmarRatio).toBeCloseTo(indicator.annualReturnAcc / indicator.drawdown, 5);
        }
    });

    test('should calculate sharpe ratio correctly', () => {
        const sharpeRatio = calculateSharpeRatio(data, indicator.rf);
        expect(indicator.sharpRatio).toBeCloseTo(sharpeRatio, 5);
    });

    test('should calculate sortino ratio correctly', () => {
        const sortinoRatio = calculateSortinoRatio(data, indicator.rf);
        expect(indicator.sortinoRatio).toBeCloseTo(sortinoRatio, 5);
    });

    test('should calculate calmar ratio correctly', () => {
        const calmarRatio = calculateCalmarRatio(data);
        expect(indicator.calmarRatio).toBeCloseTo(calmarRatio, 5);
    });
});

// 辅助函数
function calculateMaxDrawdown(data) {
    let maxDrawdown = 0.0;
    let drawdownStartDate = null;
    let drawdownEndDate = null;

    let peak = data[0].net_value;
    let peakDate = data[0].day;

    for (let i = 1; i < data.length; i++) {
        const currentNet = data[i].net_value;
        const currentDate = data[i].day;

        if (currentNet >= peak) {
            peak = currentNet;
            peakDate = currentDate;
        }

        const drawdown = (peak - currentNet) / peak;
        if (drawdown >= maxDrawdown) {
            maxDrawdown = drawdown;
            drawdownStartDate = peakDate;
            drawdownEndDate = currentDate;
        }
    }

    return { maxDrawdown, drawdownStartDate, drawdownEndDate };
}

function calculateSharpeRatio(data, riskFreeRate = 0.0) {
    const returns = data.slice(1).map((d, i) => (d.net_value / data[i].net_value - 1));
    const excessReturns = returns.map(r => r - riskFreeRate);
    const meanExcessReturn = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
    const stdDev = Math.sqrt(excessReturns.map(r => (r - meanExcessReturn) ** 2).reduce((a, b) => a + b, 0) / (excessReturns.length - 1));
    if (stdDev === 0) return 0.0;
    return meanExcessReturn / stdDev;
}

function calculateSortinoRatio(data, riskFreeRate = 0.0) {
    const returns = data.slice(1).map((d, i) => (d.net_value / data[i].net_value - 1));
    const excessReturns = returns.map(r => r - riskFreeRate);
    const meanExcessReturn = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
    const downsideReturns = excessReturns.filter(r => r < 0);
    const downsideStdDev = Math.sqrt(downsideReturns.map(r => r ** 2).reduce((a, b) => a + b, 0) / downsideReturns.length);
    if (downsideStdDev === 0) return 0.0;
    return meanExcessReturn / downsideStdDev;
}

function calculateCalmarRatio(data) {
    const cumulativeReturn = (data[data.length - 1].net_value / data[0].net_value) - 1;
    const maxDrawdown = calculateMaxDrawdown(data).maxDrawdown;
    if (maxDrawdown === 0) return 0.0;
    return cumulativeReturn / maxDrawdown;
}