from typing import Union, Iterable
from datetime import datetime


class Indicator:
    """
    计算净值指标的类

    对外暴露的接口有两个, 一个是初始化方法, 一个是update方法。
    初始化方法。如果传入的trade_date和net是数组, 则在实例化时会自动计算净值指标。
    update方法用于更新净值指标。
    """

    def __init__(
        self,
        trade_date: Union[str, Iterable],
        net: Union[float, Iterable],
        rf: Union[float, Iterable],
    ):
        """
        初始化方法。如果传入的trade_date和net是数组, 则在实例化时会自动计算净值指标。
        对外暴露的指标属性为：

        :return_acc: 累计收益率
        :annual_return_acc: 年化累计收益率
        :drawdown: 最大回撤
        :drawdown_start_date: 最大回撤开始日期
        :drawdown_end_date: 最大回撤结束日期
        :drawdown_recovery_date: 最大回撤恢复日期
        :sharp_ratio: 夏普比率
        :sortino_ratio: 索提诺比率
        :calmar_ratio: 卡玛比率
        ::return_mean: 日均收益率均值
        ::return_std: 日均收益率标准差
        :_annual_return_std: 年化收益率标准差
        :_annual_return_down_std: 年化下行收益率标准差
        """
        self.return_acc: float = 0.0
        self._return_pct: float = 0.0
        self._return_sum: float = 0.0
        self._return_square: float = 0.0
        self.return_mean: float = 0.0
        self.return_std: float = 0.0

        self.annual_return_acc: float = 0.0
        self.annual_return_pct: float = 0.0
        self._sum_return: float = 0.0
        self._down_return_sum: float = 0.0
        self._excess_sum_return: float = 0.0
        self._num: int = 0
        self._down_num: int = 0
        self.excess_return_avg: float = 0.0
        self._annual_return_square: float = 0.0
        self._annual_return_down_square: float = 0.0
        self._annual_return_std: float = 0.0
        self._annual_return_down_std: float = 0.0

        self.drawdown: float = 0.0
        self.drawdown_high_spot: float = 0.0
        self._new_drawdown: float = 0.0
        self.sharp_ratio: float = 0.0
        self.sortino_ratio: float = 0.0
        self.calmar_ratio: float = 0.0

        self.duration: int = 0
        if (
            isinstance(trade_date, str)
            and isinstance(net, float)
            and isinstance(rf, float)
        ):
            self._trade_date = trade_date
            self._init_date = datetime.strptime(trade_date, "%Y-%m-%d")
            self.init_net = net
            self._net = net
            self._max_net = net
            self._min_net = net
            self.drawdown_start_date = trade_date
            self._last_max_date = trade_date
            self._last_min_date = trade_date
            self.drawdown_end_date = trade_date
            self.drawdown_recovery_date = trade_date
            self.rf = rf
        elif isinstance(trade_date, Iterable) and isinstance(net, Iterable):
            assert len(trade_date) == len(
                net
            ), "The length of trade_date and net should be equal"
            self._trade_date = trade_date[0]
            self._init_date = datetime.strptime(trade_date[0], "%Y-%m-%d")
            self.init_net = net[0]
            self._net = net[0]
            self._max_net = net[0]
            self._min_net = net[0]
            self.drawdown_start_date = trade_date[0]
            self._last_max_date = trade_date[0]
            self._last_min_date = trade_date[0]
            self.drawdown_end_date = trade_date[0]
            self.drawdown_recovery_date = trade_date[0]
            if isinstance(rf, float):
                self.rf = rf
                for i in range(1, len(trade_date)):
                    self.update(trade_date[i], net[i], rf)
            elif isinstance(rf, Iterable):
                assert len(rf) == len(
                    trade_date
                ), "The length of trade_date and rf should be equal"
                for i in range(1, len(trade_date)):
                    self.update(trade_date[i], net[i], rf[i])
            else:
                raise ValueError("Invalid rf type")
        else:
            raise ValueError("Invalid input type")

    @property
    def trade_date(self):
        return self._trade_date

    @property
    def net(self):
        return self._net

    @trade_date.setter
    def trade_date(self, value):
        self.duration = self._cal_duration(value)
        self._trade_date = value

    @net.setter
    def net(self, value):
        # 计算日均收益均值
        self._num += 1
        self.return_acc = value / self.init_net - 1
        self._return_pct = value / self._net - 1
        self._return_sum += self._return_pct
        self._return_square += self._return_pct**2
        self.return_mean = self._return_sum / self._num

        # 计算年化收益率
        self.annual_return_acc = self._cal_annual_return(self.return_acc, self.duration)
        self.annual_return_pct = self._cal_annual_return(self._return_pct, 1)

        # 计算超额收益率
        self._excess_sum_return += self.annual_return_pct - self.rf
        self.excess_return_avg = self._excess_sum_return / self._num

        # 计算年化收益率、下行收益率和日均受益率的标准差
        self._annual_return_square += (self.annual_return_pct - self.rf) ** 2
        if self.annual_return_pct < self.rf:
            self._annual_return_down_square += (self.annual_return_pct - self.rf) ** 2
            self._down_return_sum += self.annual_return_pct - self.rf
            self._down_num += 1
        if self._num > 1:
            self.return_std = (
                (self._return_square - self._num * self.return_mean**2)
                / (self._num - 1)
            ) ** 0.5
            self._annual_return_std = (
                (self._annual_return_square - self._num * self.excess_return_avg**2)
                / (self._num - 1)
            ) ** 0.5
            self._annual_return_down_std = (
                (
                    self._annual_return_down_square
                    - self._down_return_sum**2 / self._down_num
                )
                / (self._down_num - 1)
            ) ** 0.5

        self._net = value

    def _cal_duration(self, trade_date: str) -> int:
        """计算当前日期距离初始日期的天数"""
        today = datetime.strptime(trade_date, "%Y-%m-%d")
        return (today - self._init_date).days

    def _cal_annual_return(self, ret: float, duration: int) -> float:
        """计算年化收益率"""
        return ret * 252 / duration

    def update(self, trade_date: str, net: float, rf: float | None = None):
        """
        更新净值指标

        :param trade_date: 交易日期
        :param net: 净值
        :param rf: 无风险利率
        """
        if rf is not None:
            self.rf = rf
        self.trade_date = trade_date
        self.net = net
        self.cal_drawdown()
        self.cal_sharp_ratio()
        self.cal_calmar_ratio()
        self.cal_sortino_ratio()

    def cal_drawdown(self):
        """
        计算最大回撤
        当有多个最低点时取最早的
        当有多个最大回撤时取最近的
        """
        if self.net >= self._max_net:
            self._max_net = self.net
            self._min_net = self.net
            self._last_max_date = self.trade_date

        elif self.net < self._min_net:
            self._min_net = self.net
            self._last_min_date = self.trade_date
            self._new_drawdown = (self._max_net - self._min_net) / self._max_net
            if self._new_drawdown > self.drawdown:
                self.drawdown = self._new_drawdown
                self.drawdown_high_spot = self._max_net
                self.drawdown_start_date = self._last_max_date
                self.drawdown_end_date = self._last_min_date
                self.drawdown_recovery_date = ""
        if self.net == self.drawdown_high_spot and self.drawdown_recovery_date == "":
            self.drawdown_recovery_date = self.trade_date

    def cal_sharp_ratio(self):
        assert self._annual_return_square >= 0, "Return square should be non-negative"
        if self._num > 1:
            self.sharp_ratio = (self.excess_return_avg) / self._annual_return_std

    def cal_calmar_ratio(self):
        if self.drawdown > 0:
            self.calmar_ratio = self.annual_return_acc / self.drawdown

    def cal_sortino_ratio(self):
        assert self._annual_return_square >= 0, "Return square should be non-negative"
        if self._num > 0 and self._annual_return_down_square > 0:
            self.sortino_ratio = (self.excess_return_avg) / (
                self._annual_return_down_square / (self._down_num)
            ) ** 0.5
        else:
            self.sortino_ratio = 0.0
