import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useMeals, dayKey, groupByDay, dayLabel, sumMacro } from "../store.jsx";

const MACRO_TARGETS = { protein: 150, carbs: 250, fat: 65 };

export default function DailyGoals() {
  const { meals, goal, setGoal } = useMeals();

  const today = dayKey();
  const todayMeals = useMemo(
    () => meals.filter((m) => m.date === today),
    [meals, today]
  );

  const consumed = sumMacro(todayMeals);
  const safeGoal = goal > 0 ? goal : 1;
  const remaining = Math.max(0, safeGoal - consumed);
  const percent = Math.min(100, Math.round((consumed / safeGoal) * 100));
  const over = consumed > safeGoal;

  const macroTotals = {
    protein: sumMacro(todayMeals, "protein"),
    carbs: sumMacro(todayMeals, "carbs"),
    fat: sumMacro(todayMeals, "fat"),
  };

  // Last 7 days (oldest → newest) for the bar chart.
  const week = useMemo(() => {
    const byDay = new Map(groupByDay(meals).map(([k, v]) => [k, v]));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = dayKey(d);
      const dayMeals = byDay.get(key) || [];
      return {
        key,
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        calories: sumMacro(dayMeals),
        count: dayMeals.length,
      };
    });
  }, [meals]);

  const weekAvg = Math.round(week.reduce((s, d) => s + d.calories, 0) / week.length);
  const maxBar = Math.max(safeGoal, ...week.map((d) => d.calories), 1);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Daily goals</h1>
        <p>Your calorie report for {dayLabel(today).toLowerCase()}.</p>
      </div>

      <section className="card">
        <div className="goals-head">
          <div>
            <h2>Calorie goal</h2>
            <p className="sub" style={{ marginBottom: 0 }}>
              Used to calculate remaining calories and the weekly chart.
            </p>
          </div>
          <div className="goal-input">
            <input
              type="number"
              min="800"
              max="5000"
              step="50"
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value) || 0)}
              aria-label="Daily calorie goal"
            />
            <span>kcal / day</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Today's report</h2>
        <p className="sub">
          {todayMeals.length} meal{todayMeals.length === 1 ? "" : "s"} logged
        </p>

        <div className="ring-wrap">
          <CalorieRing percent={percent} over={over} />
          <div className="ring-stats">
            <div className="ring-stat">
              <span className="ring-value">{Math.round(consumed)}</span>
              <span className="ring-label">consumed</span>
            </div>
            <div className="ring-stat">
              <span className="ring-value">{Math.round(remaining)}</span>
              <span className="ring-label">remaining</span>
            </div>
            <div className="ring-stat">
              <span className="ring-value">{safeGoal}</span>
              <span className="ring-label">goal</span>
            </div>
          </div>
        </div>

        <div className="macros">
          {Object.entries(MACRO_TARGETS).map(([key, target]) => {
            const value = macroTotals[key];
            const p = Math.min(100, Math.round((value / target) * 100));
            return (
              <div className="macro macro-bar" key={key}>
                <div className="macro-top">
                  <span className="macro-name">{key[0].toUpperCase() + key.slice(1)}</span>
                  <span className="macro-count">
                    {Math.round(value)} / {target}g
                  </span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${p}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {over && (
          <p className="error" style={{ marginTop: 16 }}>
            ⚠️ You're {Math.round(consumed - safeGoal)} kcal over today's goal.
          </p>
        )}

        {todayMeals.length === 0 && (
          <div className="empty" style={{ marginTop: 8 }}>
            <div className="icon">🎯</div>
            <p>Nothing logged yet today.</p>
            <Link to="/" className="btn primary" style={{ marginTop: 14, display: "inline-block" }}>
              Log a meal
            </Link>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Last 7 days</h2>
        <p className="sub">
          Daily average: <strong>{weekAvg} kcal</strong> · goal line at {safeGoal} kcal
        </p>

        <div className="chart" role="img" aria-label="Calories over the last 7 days">
          <div className="chart-goal-line" style={{ bottom: `${(safeGoal / maxBar) * 100}%` }} />
          {week.map((d) => {
            const h = Math.max(4, (d.calories / maxBar) * 100);
            const isOver = d.calories > safeGoal;
            const isToday = d.key === today;
            return (
              <div className="chart-col" key={d.key}>
                <div className="chart-bar-wrap">
                  <div
                    className={`chart-bar ${isOver ? "over" : ""} ${isToday ? "today" : ""}`}
                    style={{ height: `${h}%` }}
                    title={`${d.label}: ${Math.round(d.calories)} kcal`}
                  />
                </div>
                <span className="chart-label">{d.label}</span>
                <span className="chart-value">{Math.round(d.calories)}</span>
              </div>
              );
          })}
        </div>
      </section>
    </div>
  );
}

function CalorieRing({ percent, over }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="ring">
      <svg viewBox="0 0 120 120" width="140" height="140">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#26355a" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={over ? "#ef4444" : "#22c55e"}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="ring-center">
        <span className="ring-percent">{percent}%</span>
        <span className="ring-sub">of goal</span>
      </div>
    </div>
  );
}
