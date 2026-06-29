import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import "./styles.css";

const DailExplorer = lazy(() => import("./components/DailExplorer.jsx"));
const SeanadExplorer = lazy(() => import("./components/SeanadExplorer.jsx"));

const chamberConfigs = [
  {
    key: "dail",
    label: "Dail Chamber",
    component: DailExplorer,
  },
  {
    key: "seanad",
    label: "Seanad Chamber",
    component: SeanadExplorer,
  },
];

const defaultChamberKey = chamberConfigs[0].key;

function getInitialChamberKey() {
  if (typeof window === "undefined") return defaultChamberKey;

  const params = new URLSearchParams(window.location.search);
  const chamber = params.get("chamber");

  return chamberConfigs.some((item) => item.key === chamber)
    ? chamber
    : defaultChamberKey;
}

export default function App() {
  const [activeChamberKey, setActiveChamberKey] = useState(getInitialChamberKey);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set("chamber", activeChamberKey);
    window.history.replaceState({}, "", url);
  }, [activeChamberKey]);

  const activeChamber = useMemo(
    () =>
      chamberConfigs.find((chamber) => chamber.key === activeChamberKey) ||
      chamberConfigs[0],
    [activeChamberKey],
  );

  const ActiveChamberComponent = activeChamber.component;

  return (
    <div className="app">
      <div className="section-nav-shell">
        <nav className="section-nav" aria-label="Chamber selection">
          <div className="section-nav__list">
            {chamberConfigs.map((chamber) => (
              <button
                key={chamber.key}
                type="button"
                className="section-nav__link"
                aria-current={
                  chamber.key === activeChamberKey ? "page" : undefined
                }
                onClick={() => setActiveChamberKey(chamber.key)}
              >
                {chamber.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      <Suspense
        fallback={
          <main className="layout layout--stacked">
            <section className="main-panel main-panel--full">
              <div className="panel panel--loading">Loading chamber map…</div>
            </section>
          </main>
        }
      >
        <ActiveChamberComponent />
      </Suspense>
    </div>
  );
}
