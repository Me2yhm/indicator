const Indicator = require('./indicator'); // 假设 indicator.js 和 indicator.test.js 在同一目录下

describe('Indicator Class', () => {
    let indicator;
    let data;

    beforeAll(() => {
        // 模拟数据
        data = [
            { day: '2024-08-19', net_value: 0.728 },
            { day: '2024-08-20', net_value: 0.723 },
            { day: '2024-08-21', net_value: 0.723 },
            { day: '2024-08-22', net_value: 0.720 },
            { day: '2024-08-23', net_value: 0.720 },
            { day: '2024-08-26', net_value: 0.716 },
            { day: '2024-08-27', net_value: 0.713 },
            { day: '2024-08-28', net_value: 0.717 },
            { day: '2024-08-29', net_value: 0.722 },
            { day: '2024-08-30', net_value: 0.733 },
            { day: '2024-09-02', net_value: 0.724 },
            { day: '2024-09-03', net_value: 0.730 },
            { day: '2024-09-04', net_value: 0.728 },
            { day: '2024-09-05', net_value: 0.730 },
            { day: '2024-09-06', net_value: 0.720 },
            { day: '2024-09-09', net_value: 0.718 },
            { day: '2024-09-10', net_value: 0.721 },
            { day: '2024-09-11', net_value: 0.723 },
            { day: '2024-09-12', net_value: 0.718 },
            { day: '2024-09-13', net_value: 0.715 },
            { day: '2024-09-18', net_value: 0.712 },
            { day: '2024-09-19', net_value: 0.713 },
            { day: '2024-09-20', net_value: 0.710 },
            { day: '2024-09-23', net_value: 0.708 },
            { day: '2024-09-24', net_value: 0.727 },
            { day: '2024-09-25', net_value: 0.730 },
            { day: '2024-09-26', net_value: 0.752 },
            { day: '2024-09-27', net_value: 0.778 },
            { day: '2024-09-30', net_value: 0.841 },
            { day: '2024-10-08', net_value: 0.901 }
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
        expect(new Date(indicator.drawdownStartDate).getTime()).toBeLessThanOrEqual(new Date(indicator.drawdownEndDate).getTime());
    });


    test('should calculate max drawdown and dates correctly', () => {
        const { maxDrawdown, drawdownStartDate, drawdownEndDate } = calculateMaxDrawdown(data);
        expect(indicator.drawdown).toBeCloseTo(maxDrawdown, 5);
        expect(new Date(indicator.drawdownStartDate).getTime()).toBe(new Date(drawdownStartDate).getTime());
        expect(new Date(indicator.drawdownEndDate).getTime()).toBe(new Date(drawdownEndDate).getTime());
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
        const calmarRatio = calculateCalmarRatio(data,indicator);
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
    const annualReturns = returns.map(r => r * 252);
    const excessReturns = annualReturns.map(r => r - riskFreeRate);
    const meanExcessReturn = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
    const stdDev = Math.sqrt(excessReturns.map(r => (r - meanExcessReturn) ** 2).reduce((a, b) => a + b, 0) / (excessReturns.length - 1));
    if (stdDev === 0) return 0.0;
    return meanExcessReturn / stdDev;
}

function calculateSortinoRatio(data, riskFreeRate = 0.0) {
    const returns = data.slice(1).map((d, i) => (d.net_value / data[i].net_value - 1));
    const annualReturns = returns.map(r => r * 252);
    const excessReturns = annualReturns.map(r => r - riskFreeRate);
    const meanExcessReturn = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
    const downsideReturns = excessReturns.filter(r => r < 0);
    const downsideStdDev = Math.sqrt(downsideReturns.map(r => r ** 2).reduce((a, b) => a + b, 0) / downsideReturns.length);
    if (downsideStdDev === 0) return 0.0;
    return meanExcessReturn / downsideStdDev;
}

function calculateCalmarRatio(data,indicator) {
    const cumulativeReturn = (data[data.length - 1].net_value / data[0].net_value) - 1;
    const annualCumulativeReturn = indicator._calAnnualReturn(cumulativeReturn,indicator.duration);
    const maxDrawdown = calculateMaxDrawdown(data).maxDrawdown;
    if (maxDrawdown === 0) return 0.0;
    return annualCumulativeReturn / maxDrawdown;
}