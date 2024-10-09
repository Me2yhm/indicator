class Indicator {
    constructor(tradeDate, net, rf) {
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

    set tradeDate(value) {
        this.duration = this._calDuration(value);
        this._tradeDate = value;
    }

    get net() {
        return this._net;
    }

    set net(value) {
        this._num += 1;
        this._returnPct = value / this._net - 1;
        this._returnSum += this._returnPct;
        this._returnSquare += this._returnPct ** 2;
        this.returnMean = this._returnSum / this._num;

        this.annualReturnAcc = this._calAnnualReturn(value / this.initNet - 1, this.duration);
        this.annualReturnPct = this._calAnnualReturn(this._returnPct, 1);

        this._excessSumReturn += this.annualReturnPct - this.rf;
        this.excessReturnAvg = this._excessSumReturn / this._num;

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
        const today = new Date(tradeDate);
        return (today - this._initDate) / (1000 * 60 * 60 * 24);
    }

    _calAnnualReturn(ret, duration) {
        return ret * 252 / duration;
    }

    update(tradeDate, net, rf = null) {
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