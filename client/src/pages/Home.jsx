import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMeals, dayKey, sumMacro } from "../store.jsx";

export default function Home() {
  const { meals, addMeal } = useMeals();

  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef(null);

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  }, []);

  const onFile = useCallback((picked) => {
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, or WebP).");
      return;
    }
    setError(null);
    setFile(picked);
    setResult(null);
    setPreview(URL.createObjectURL(picked));
  }, []);

  const analyze = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("photo", file);

      const res = await fetch("/api/analyze", { method: "POST", body: form });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setResult(data);

      const loggedAt = new Date();
      addMeal({
        id: loggedAt.getTime(),
        date: dayKey(loggedAt),
        time: loggedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mealName: data.mealName,
        confidence: data.confidence,
        mode: data.mode,
        thumbnail: preview,
        items: data.items || [],
        totals: data.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [file, preview, addMeal]);

  const todayMeals = meals.filter((m) => m.date === dayKey());
  const todayCalories = sumMacro(todayMeals);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Snap your meal</h1>
        <p>Upload a photo and get an instant calorie &amp; macro estimate.</p>
      </div>

      <div className="stat-strip">
        <div className="stat">
          <span className="stat-value">{Math.round(todayCalories)}</span>
          <span className="stat-label">kcal logged today</span>
        </div>
        <Link to="/meals" className="stat stat-link">
          <span className="stat-value">{meals.length}</span>
          <span className="stat-label">meals logged</span>
        </Link>
        <Link to="/goals" className="stat stat-link">
          <span className="stat-value">🎯</span>
          <span className="stat-label">daily goals</span>
        </Link>
      </div>

      <div className="grid">
        <section className="card">
          <h2>1. Upload your meal</h2>
          <p className="sub">Drag &amp; drop or click below — JPG, PNG, or WebP up to 15 MB</p>

          <div
            className={`dropzone ${dragging ? "dragging" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onFile(e.dataTransfer.files?.[0]);
            }}
          >
            <div className="icon">📸</div>
            <strong>Click to upload a photo</strong>
            <small>or drag &amp; drop it here</small>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>

          {preview && (
            <div className="preview">
              <img src={preview} alt="Your meal" />
              <button className="clear" onClick={reset}>
                Remove
              </button>
            </div>
          )}

          <div className="actions">
            <button className="btn" onClick={reset} disabled={!file || loading}>
              Clear
            </button>
            <button className="btn primary" onClick={analyze} disabled={!file || loading}>
              {loading ? "Analyzing…" : "Analyze calories"}
            </button>
          </div>
        </section>

        <section className="card">
          <h2>2. Nutrition estimate</h2>
          <p className="sub">Powered by GPT-4o vision — estimates are approximate</p>

          {error && <p className="error">{error}</p>}

          {loading && (
            <div className="empty">
              <div className="spinner" />
              <p>Looking at your meal…</p>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="empty">
              <div className="icon">🥗</div>
              <p>Your results will appear here.</p>
            </div>
          )}

          {!loading && result && <Result result={result} />}
        </section>
      </div>
    </div>
  );
}

function Result({ result }) {
  const totals = result.totals || {};
  const items = result.items || [];

  return (
    <div>
      <div className="result-head">
        <h3>{result.mealName || "Unknown meal"}</h3>
        {result.confidence && (
          <span className={`confidence ${result.confidence}`}>
            {result.confidence} confidence
          </span>
        )}
      </div>

      <div className="calorie-hero">
        <div className="number">{Math.round(totals.calories ?? 0)}</div>
        <div className="label">total calories</div>
      </div>

      <div className="macros">
        <div className="macro">
          <div className="v">{Math.round(totals.protein ?? 0)}g</div>
          <div className="k">Protein</div>
        </div>
        <div className="macro">
          <div className="v">{Math.round(totals.carbs ?? 0)}g</div>
          <div className="k">Carbs</div>
        </div>
        <div className="macro">
          <div className="v">{Math.round(totals.fat ?? 0)}g</div>
          <div className="k">Fat</div>
        </div>
      </div>

      {items.length > 0 && (
        <ul className="items">
          {items.map((item, i) => (
            <li key={i}>
              <span className="name">{item.name}</span>
              <span className="kcal">{Math.round(item.calories)} kcal</span>
            </li>
          ))}
        </ul>
      )}

      {result.notes && <p className="notes">{result.notes}</p>}
    </div>
  );
}
