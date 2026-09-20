import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "caloriesnap_meals_v1";
const GOAL_KEY = "caloriesnap_goal_v1";

const MealContext = createContext(null);

/**
 * Central store for logged meals + the daily calorie goal.
 * Meals are persisted to localStorage so history survives reloads.
 *
 * Meal shape:
 * { id, date (YYYY-MM-DD), time (HH:MM), mealName, confidence, mode,
 *   thumbnail, items[], totals { calories, protein, carbs, fat } }
 */
export function MealProvider({ children }) {
  const [meals, setMeals] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const [goal, setGoal] = useState(() => {
    const stored = Number(localStorage.getItem(GOAL_KEY));
    return stored > 0 ? stored : 2000;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meals.slice(0, 200)));
  }, [meals]);

  useEffect(() => {
    localStorage.setItem(GOAL_KEY, String(goal));
  }, [goal]);

  const addMeal = useCallback((meal) => {
    setMeals((prev) => [meal, ...prev].slice(0, 200));
  }, []);

  const deleteMeal = useCallback((id) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearAll = useCallback(() => setMeals([]), []);

  const value = useMemo(
    () => ({ meals, goal, setGoal, addMeal, deleteMeal, clearAll }),
    [meals, goal, addMeal, deleteMeal, clearAll]
  );

  return <MealContext.Provider value={value}>{children}</MealContext.Provider>;
}

export function useMeals() {
  const ctx = useContext(MealContext);
  if (!ctx) {
    throw new Error("useMeals must be used inside a MealProvider");
  }
  return ctx;
}

/** Format a Date as a local YYYY-MM-DD key. */
export function dayKey(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Sum calories (or any macro key) across a list of meals. */
export function sumMacro(meals, key = "calories") {
  return meals.reduce((total, m) => total + (m.totals?.[key] ?? 0), 0);
}

/** Group meals into { 'YYYY-MM-DD': meals[] }, newest day first. */
export function groupByDay(meals) {
  const groups = new Map();
  for (const meal of meals) {
    const key = meal.date || dayKey(new Date(meal.id));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(meal);
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
}

/** Human-friendly label for a YYYY-MM-DD key, e.g. "Today" or "Mon 21 Sep". */
export function dayLabel(key) {
  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return new Date(key + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
