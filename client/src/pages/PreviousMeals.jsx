import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMeals, groupByDay, dayLabel, sumMacro } from "../store.jsx";

export default function PreviousMeals() {
  const { meals, deleteMeal, clearAll } = useMeals();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meals;
    return meals.filter((m) => (m.mealName || "").toLowerCase().includes(q));
  }, [meals, query]);

  const days = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Previous meals</h1>
        <p>Everything you've logged, grouped by day.</p>
      </div>

      <div className="filter-bar">
        <input
          type="search"
          className="search-input"
          placeholder="Search meals…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search meals"
        />
        {meals.length > 0 && (
          <button
            className="btn btn-danger-outline"
            onClick={() => {
              if (confirm("Delete all logged meals? This can't be undone.")) clearAll();
            }}
          >
            Clear all
          </button>
        )}
      </div>

      {days.length === 0 ? (
        <section className="card">
          <div className="empty">
            <div className="icon">🍽️</div>
            <p>
              {query
                ? `No meals match “${query}”.`
                : "You haven't logged any meals yet."}
            </p>
            <Link to="/" className="btn primary" style={{ marginTop: 14, display: "inline-block" }}>
              Scan your first meal
            </Link>
          </div>
        </section>
      ) : (
        <div className="days">
          {days.map(([key, dayMeals]) => {
            const cals = sumMacro(dayMeals);
            const protein = sumMacro(dayMeals, "protein");
            const carbs = sumMacro(dayMeals, "carbs");
            const fat = sumMacro(dayMeals, "fat");

            return (
              <section key={key} className="card day-card">
                <div className="day-head">
                  <div>
                    <h2>{dayLabel(key)}</h2>
                    <span className="day-date">{key}</span>
                  </div>
                  <div className="day-totals">
                    <span className="day-kcal">{Math.round(cals)} kcal</span>
                    <span className="day-macros">
                      P {Math.round(protein)}g · C {Math.round(carbs)}g · F {Math.round(fat)}g
                    </span>
                  </div>
                </div>

                <ul className="history-list">
                  {dayMeals.map((meal) => (
                    <li key={meal.id}>
                      {meal.thumbnail && (
                        <img src={meal.thumbnail} alt={meal.mealName} />
                      )}
                      <div className="meta">
                        <strong>{meal.mealName}</strong>
                        <span>
                          {meal.time || new Date(meal.id).toLocaleTimeString()} ·{" "}
                          {meal.mode === "live" ? "Live" : "Demo"}
                        </span>
                      </div>
                      <span className="kcal">{Math.round(meal.totals?.calories ?? 0)} kcal</span>
                      <button
                        className="btn-icon"
                        title="Delete meal"
                        onClick={() => deleteMeal(meal.id)}
                      >
                        🗑️
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
