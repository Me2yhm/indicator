from numpy import isclose
import pandas as pd
from matplotlib import pyplot as plt
from indicator import Indicator

data = pd.read_csv("test_data.csv").sort_values("day", ignore_index=True)

indicator = Indicator(data.iloc[0]["day"], data.iloc[0]["net_value"], 0.02)

for i in range(1, len(data)):
    indicator.update(data.iloc[i]["day"], data.iloc[i]["net_value"], 0.02)


def calculate_max_drawdown(data: pd.DataFrame):
    max_drawdown = 0.0
    drawdown_start_date = None
    drawdown_end_date = None

    peak = data.iloc[0]["net_value"]
    peak_date = data.iloc[0]["day"]

    for i in range(1, len(data)):
        current_net = data.iloc[i]["net_value"]
        current_date = data.iloc[i]["day"]

        if current_net >= peak:
            peak = current_net
            peak_date = current_date

        drawdown = (peak - current_net) / peak
        if drawdown >= max_drawdown:
            max_drawdown = drawdown
            drawdown_start_date = peak_date
            drawdown_end_date = current_date

    return max_drawdown, drawdown_start_date, drawdown_end_date


def calculate_sharpe_ratio(data: pd.DataFrame, risk_free_rate: float = 0.0):
    returns = data["net_value"].pct_change().dropna()
    returns = returns.apply(indicator._cal_annual_return, duration=indicator.duration)
    excess_returns = returns - risk_free_rate
    mean_excess_return = excess_returns.mean()
    std_dev = excess_returns.std()
    if std_dev == 0:
        return 0.0
    return mean_excess_return / std_dev


def calculate_sortino_ratio(data: pd.DataFrame, risk_free_rate: float = 0.0):
    returns = data["net_value"].pct_change().dropna()
    excess_returns = returns - risk_free_rate
    mean_excess_return = excess_returns.mean()
    downside_returns = excess_returns[excess_returns < 0]
    downside_std_dev = ((downside_returns**2).mean()) ** 0.5
    if downside_std_dev == 0:
        return 0.0
    return mean_excess_return / downside_std_dev


def calculate_calmar_ratio(data: pd.DataFrame):
    cumulative_return = (data["net_value"].iloc[-1] / data["net_value"].iloc[0]) - 1
    cumulative_return = indicator._cal_annual_return(
        cumulative_return, indicator.duration
    )
    max_drawdown, _, _ = calculate_max_drawdown(data)
    if max_drawdown == 0:
        return 0.0
    return cumulative_return / max_drawdown


def test_drawdown():
    assert indicator.drawdown >= 0, "Drawdown should be non-negative"
    assert indicator.drawdown <= 1, "Drawdown should be less than or equal to 1"
    assert (
        indicator.drawdown_start_date <= indicator.drawdown_end_date
    ), "Drawdown start date should be before or equal to end date"


def test_annual_return_acc():
    assert indicator.annual_return_acc >= 0, "Accumulated return should be non-negative"


def test_calmar_ratio():
    if indicator.drawdown > 0:
        assert (
            indicator.calmar_ratio == indicator.annual_return_acc / indicator.drawdown
        ), "Calmar ratio calculation is incorrect"


def test_drawdown_calculation():
    max_drawdown, drawdown_start_date, drawdown_end_date = calculate_max_drawdown(data)
    assert isclose(
        max_drawdown, indicator.drawdown, 1e-5
    ), "Drawdown calculation is incorrect"
    assert (
        drawdown_start_date == indicator.drawdown_start_date
    ), "Drawdown start date is incorrect"
    assert (
        drawdown_end_date == indicator.drawdown_end_date
    ), "Drawdown end date is incorrect"


def test_sharpe_ratio():
    sharpe_ratio = calculate_sharpe_ratio(data, indicator.rf)
    assert isclose(
        sharpe_ratio, indicator.sharp_ratio, 1e-5
    ), "Sharpe ratio is incorrect"


def test_sortino_ratio():
    sortino_ratio = calculate_sortino_ratio(data, indicator.rf)
    assert isclose(
        sortino_ratio, indicator.sortino_ratio, 1e-5
    ), "Sortino ratio is incorrect"


def test_calmar_ratio_calculation():
    calmar_ratio = calculate_calmar_ratio(data)
    assert isclose(
        calmar_ratio, indicator.calmar_ratio, 1e-5
    ), "Calmar ratio calculation is incorrect"


if __name__ == "__main__":
    # data.plot(x="day", y="net_value")
    # plt.show()
    print(calculate_sharpe_ratio(data, indicator.rf))
    print(indicator.sharp_ratio)
    print(calculate_sortino_ratio(data, indicator.rf))
    print(indicator.sortino_ratio)
