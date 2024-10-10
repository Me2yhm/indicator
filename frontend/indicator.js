class Indicator {
    /**
     * 计算净值指标的类
     *
     * 对外暴露的接口有两个, 一个是初始化方法, 一个是update方法。
     * 初始化方法。如果传入的trade_date和net是数组, 则在实例化时会自动计算净值指标。
     * update方法用于更新净值指标。
     */

    constructor(tradeDate, net, rf) {
        /**
         * 初始化方法。如果传入的trade_date和net是数组, 则在实例化时会自动计算净值指标。
         * 对外暴露的指标属性为：
         *
         * :return_acc: 累计收益率
         * :annual_return_acc: 年化累计收益率
         * :drawdown: 最大回撤
         * :drawdown_start_date: 最大回撤开始日期
         * :drawdown_end_date: 最大回撤结束日期
         * :drawdown_recovery_date: 最大回撤恢复日期
         * :sharp_ratio: 夏普比率
         * :sortino_ratio: 索提诺比率
         * :calmar_ratio: 卡玛比率
         * :return_mean: 日均收益率均值
         * :return_std: 日均收益率标准差
         * :_annual_return_std: 年化收益率标准差
         * :_annual_return_down_std: 年化下行收益率标准差
         */
        this.returnAcc = 0.0;
        this._returnPct = 0.0;
        this._returnSum = 0.0;
        this._returnSquare = 0.0;
        this.returnMean = 0.0;
        this.returnStd = 0.0;

        this.annualReturnAcc = 0.0;
        this.annualReturnPct = 0.0;
        this._sumReturn = 0.0;
        this._downReturnSum = 0.0;
        this._excessSumReturn = 0.0;
        this._num = 0;
        this._downNum = 0;
        this.excessReturnAvg = 0.0;
        this._annualReturnSquare = 0.0;
        this._annualReturnDownSquare = 0.0;
        this._annualReturnStd = 0.0;
        this._annualReturnDownStd = 0.0;

        this.drawdown = 0.0;
        this.drawdownHighSpot = 0.0;
        this._newDrawdown = 0.0;
        this.sharpRatio = 0.0;
        this.sortinoRatio = 0.0;
        this.calmarRatio = 0.0;

        this.duration = 0;

        if (typeof tradeDate === 'string' && typeof net === 'number' && typeof rf === 'number') {
            this._tradeDate = tradeDate;
            this._initDate = new Date(tradeDate);
            this.initNet = net;
            this._net = net;
            this._maxNet = net;
            this._minNet = net;
            this.drawdownStartDate = tradeDate;
            this._lastMaxDate = tradeDate;
            this._lastMinDate = tradeDate;
            this.drawdownEndDate = tradeDate;
            this.drawdownRecoveryDate = tradeDate;
            this.rf = rf;
        } else if (Array.isArray(tradeDate) && Array.isArray(net)) {
            if (tradeDate.length !== net.length) {
                throw new Error("The length of tradeDate and net should be equal");
            }
            this._tradeDate = tradeDate[0];
            this._initDate = new Date(tradeDate[0]);
            this.initNet = net[0];
            this._net = net[0];
            this._maxNet = net[0];
            this._minNet = net[0];
            this.drawdownStartDate = tradeDate[0];
            this._lastMaxDate = tradeDate[0];
            this._lastMinDate = tradeDate[0];
            this.drawdownEndDate = tradeDate[0];
            this.drawdownRecoveryDate = tradeDate[0];
            if (typeof rf === 'number') {
                this.rf = rf;
                for (let i = 1; i < tradeDate.length; i++) {
                    this.update(tradeDate[i], net[i], rf);
                }
            } else if (Array.isArray(rf)) {
                if (rf.length !== tradeDate.length) {
                    throw new Error("The length of tradeDate and rf should be equal");
                }
                for (let i = 1; i < tradeDate.length; i++) {
                    this.update(tradeDate[i], net[i], rf[i]);
                }
            } else {
                throw new Error("Invalid rf type");
            }
        } else {
            throw new Error("Invalid input type");
        }
    }

    get tradeDate() {
        return this._tradeDate;
    }

    get net() {
        return this._net;
    }

    set tradeDate(value) {
        this.duration = this._calDuration(value);
        this._tradeDate = value;
    }

    set net(value) {
        // 计算日均收益均值
        this._num += 1;
        this.returnAcc = value / this.initNet - 1;
        this._returnPct = value / this._net - 1;
        this._returnSum += this._returnPct;
        this._returnSquare += this._returnPct ** 2;
        this.returnMean = this._returnSum / this._num;

        // 计算年化收益率
        this.annualReturnAcc = this._calAnnualReturn(this.returnAcc, this.duration);
        this.annualReturnPct = this._calAnnualReturn(this._returnPct, 1);

        // 计算超额收益率
        this._excessSumReturn += this.annualReturnPct - this.rf;
        this.excessReturnAvg = this._excessSumReturn / this._num;

        // 计算年化收益率、下行收益率和日均受益率的标准差
        this._annualReturnSquare += (this.annualReturnPct - this.rf) ** 2;
        if (this.annualReturnPct < this.rf) {
            this._annualReturnDownSquare += (this.annualReturnPct - this.rf) ** 2;
            this._downReturnSum += this.annualReturnPct - this.rf;
            this._downNum += 1;
        }
        if (this._num > 1) {
            this.returnStd = Math.sqrt((this._returnSquare - this._num * this.returnMean ** 2) / (this._num - 1));
            this._annualReturnStd = Math.sqrt((this._annualReturnSquare - this._num * this.excessReturnAvg ** 2) / (this._num - 1));
            this._annualReturnDownStd = Math.sqrt((this._annualReturnDownSquare - this._downReturnSum ** 2 / this._downNum) / (this._downNum - 1));
        }

        this._net = value;
    }

    _calDuration(tradeDate) {
        /** 计算当前日期距离初始日期的天数 */
        const today = new Date(tradeDate);
        return (today - this._initDate) / (1000 * 60 * 60 * 24);
    }

    _calAnnualReturn(ret, duration) {
        /** 计算年化收益率 */
        return ret * 252 / duration;
    }

    update(tradeDate, net, rf = null) {
        /**
         * 更新净值指标
         *
         * @param {string} tradeDate 交易日期
         * @param {number} net 净值
         * @param {number} [rf] 无风险利率
         */
        if (rf !== null) {
            this.rf = rf;
        }
        this.tradeDate = tradeDate;
        this.net = net;
        this.calDrawdown();
        this.calSharpRatio();
        this.calCalmarRatio();
        this.calSortinoRatio();
    }

    calDrawdown() {
        /**
         * 计算最大回撤
         * 当有多个最低点时取最早的
         * 当有多个最大回撤时取最近的
         */
        if (this.net >= this._maxNet) {
            this._maxNet = this.net;
            this._minNet = this.net;
            this._lastMaxDate = this.tradeDate;
        } else if (this.net < this._minNet) {
            this._minNet = this.net;
            this._lastMinDate = this.tradeDate;
            this._newDrawdown = (this._maxNet - this._minNet) / this._maxNet;
            if (this._newDrawdown > this.drawdown) {
                this.drawdown = this._newDrawdown;
                this.drawdownHighSpot = this._maxNet;
                this.drawdownStartDate = this._lastMaxDate;
                this.drawdownEndDate = this._lastMinDate;
                this.drawdownRecoveryDate = "";
            }
        }
        if (this.net === this.drawdownHighSpot) {
            this.drawdownRecoveryDate = this.tradeDate;
        }
    }

    calSharpRatio() {
        if (this._annualReturnSquare < 0) {
            throw new Error("Return square should be non-negative");
        }
        if (this._num > 1) {
            this.sharpRatio = this.excessReturnAvg / this._annualReturnStd;
        }
    }

    calCalmarRatio() {
        if (this.drawdown > 0) {
            this.calmarRatio = this.annualReturnAcc / this.drawdown;
        }
    }

    calSortinoRatio() {
        if (this._annualReturnSquare < 0) {
            throw new Error("Return square should be non-negative");
        }
        if (this._num > 0 && this._annualReturnDownSquare > 0) {
            this.sortinoRatio = this.excessReturnAvg / Math.sqrt(this._annualReturnDownSquare / this._downNum);
        } else {
            this.sortinoRatio = 0.0;
        }
    }
}

// Example usage:
// const indicator = new Indicator("2023-01-01", 1000, 0.02);
// indicator.update("2023-01-02", 1010);
// console.log(indicator.sharpRatio, indicator.sortinoRatio, indicator.calmarRatio);