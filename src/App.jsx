import React, { useEffect, useMemo, useRef, useState } from "react";
import { loadCsv } from "./lib/csv.js";
import { normaliseMemberApiRows, clean } from "./lib/joins.js";
import { partiesPalette } from "./data/partiesPalette.js";
import ChamberMap from "./components/ChamberMap.jsx";
import membersJson from "./data/members.json";
import "./styles.css";

function buildMemberUrl(memberCode) {
  if (!memberCode) return "";
  return `https://www.oireachtas.ie/en/members/member/${memberCode}/`;
}

function resolveSeatForDate(rows, memberCode, targetDate) {
  if (!memberCode || !targetDate) return null;

  const targetTime = new Date(targetDate).getTime();

  return rows.find((row) => {
    const rowMemberCode = clean(row.member_code ?? row.memberCode);

    if (rowMemberCode !== clean(memberCode)) return false;

    const start = new Date(row.start_date).getTime();
    const end = row.end_date ? new Date(row.end_date).getTime() : Infinity;

    return targetTime >= start && targetTime <= end;
  });
}

function useIframeResize() {
  useEffect(() => {
    function sendHeight() {
      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );

      window.parent.postMessage(
        {
          type: "chamber-party-map:resize",
          height,
        },
        "*",
      );
    }

    const timeoutId = setTimeout(sendHeight, 100);

    const resizeObserver = new ResizeObserver(() => {
      sendHeight();
    });

    if (document.body) {
      resizeObserver.observe(document.body);
    }

    window.addEventListener("load", sendHeight);
    window.addEventListener("resize", sendHeight);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener("load", sendHeight);
      window.removeEventListener("resize", sendHeight);
    };
  }, []);
}

export default function App() {
  useIframeResize();

  const mapRef = useRef(null);

  const [assignments, setAssignments] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [query, setQuery] = useState("");
  const [partyFilter, setPartyFilter] = useState(null);
  const [showMapMenu, setShowMapMenu] = useState(false);

  useEffect(() => {
    async function init() {
      const seatingRowsRaw = await loadCsv(
        `${import.meta.env.BASE_URL}seatAssignmentsHistory.csv`,
      );

      const seatingRows = seatingRowsRaw.map((row) => ({
        ...row,
        seat_label: clean(row.seat_label),
        deputy_name: clean(row.deputy_name ?? row.Deputy),
        member_code: clean(row.member_code ?? row.memberCode),
        path_id: clean(row.path_id),
      }));

      setAssignments(seatingRows);
      setMembers(normaliseMemberApiRows(membersJson));
      setSelectedSeat(null);
    }

    init();
  }, []);

  const seats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return members
      .map((member) => {
        const assignment = resolveSeatForDate(assignments, member.Code, today);

        if (!assignment?.seat_label) return null;

        return {
          seat_label: clean(assignment.seat_label),
          assignment,
          member,
        };
      })
      .filter(Boolean);
  }, [assignments, members]);

  const visibleSeats = useMemo(() => {
    return seats.filter((seat) => {
      const matchesQuery = [
        seat.seat_label,
        seat.member?.Deputy,
        seat.member?.Party,
        seat.member?.Constituency,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());

      const matchesParty =
        partyFilter === null || seat.member?.Party === partyFilter;

      return matchesQuery && matchesParty;
    });
  }, [seats, query, partyFilter]);

  const partySummary = useMemo(() => {
    const counts = new Map();

    seats.forEach((seat) => {
      const party = seat.member?.Party;
      if (!party) return;
      counts.set(party, (counts.get(party) || 0) + 1);
    });

    const paletteLookup = new Map(
      partiesPalette.map((party) => [party.name, party.value]),
    );

    const partyItems = Array.from(counts.entries())
      .map(([name, count]) => ({
        name,
        count,
        color: paletteLookup.get(name) || "#d6d3d1",
        active: partyFilter === name,
        isAll: false,
      }))
      .sort((a, b) => b.count - a.count);

    return [
      ...partyItems,
      {
        name: "All parties",
        count: seats.filter((seat) => seat.member?.Party).length,
        color: "#7f6c2e",
        active: partyFilter === null,
        isAll: true,
      },
    ];
  }, [seats, partyFilter]);

  function exportCurrentMapSvg() {
    const svgEl = mapRef.current?.querySelector(".map-svg-frame svg");
    if (!svgEl) return;

    const blob = new Blob([svgEl.outerHTML], {
      type: "image/svg+xml;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dail_party_strength_map.svg";
    a.click();
    URL.revokeObjectURL(url);
    setShowMapMenu(false);
  }

  function exportCurrentMapPng() {
    const svgEl = mapRef.current?.querySelector(".map-svg-frame svg");
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);

    const blob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svgEl.viewBox.baseVal.width || svgEl.clientWidth;
      canvas.height = svgEl.viewBox.baseVal.height || svgEl.clientHeight;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((pngBlob) => {
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "dail_party_strength_map.png";
        a.click();
        URL.revokeObjectURL(pngUrl);
      });

      URL.revokeObjectURL(url);
    };

    img.src = url;
    setShowMapMenu(false);
  }

  const selected =
    seats.find((seat) => seat.seat_label === selectedSeat) || null;
  const hasSelection = Boolean(selected);

  const selectedMember = selected?.member || null;
  const selectedMemberUrl = buildMemberUrl(
    selectedMember?.Code || selected?.assignment?.member_code,
  );

  return (
    <div className="app">
      <main className="layout layout--stacked">
        <section className="main-panel main-panel--full">
          <div className="map-actions">
            <button
              type="button"
              className="map-actions__toggle"
              onClick={() => setShowMapMenu((v) => !v)}
              aria-label="Download map"
              title="Download map"
            >
              ⋮
            </button>

            {showMapMenu ? (
              <div className="map-actions__menu">
                <button type="button" onClick={exportCurrentMapPng}>
                  Download PNG
                </button>
                <button type="button" onClick={exportCurrentMapSvg}>
                  Download SVG
                </button>
              </div>
            ) : null}
          </div>

          <div
            className={`party-summary${
              partyFilter ? " party-summary--has-active" : ""
            }`}
          >
            {partySummary.map((party) => (
              <button
                key={party.name}
                type="button"
                className={`party-summary__item${
                  party.active ? " party-summary__item--active" : ""
                }${party.isAll ? " party-summary__item--all" : ""}`}
                onClick={() => {
                  setPartyFilter(party.isAll ? null : party.name);
                  setSelectedSeat(null);
                }}
                aria-pressed={party.active}
              >
                <span
                  className="party-summary__dot"
                  style={{ backgroundColor: party.color }}
                />
                <span className="party-summary__name">{party.name}</span>
                <span className="party-summary__count">{party.count}</span>
              </button>
            ))}
          </div>

          <div
            className={
              hasSelection
                ? "chamber-toolbar chamber-toolbar--split"
                : "chamber-toolbar chamber-toolbar--single"
            }
          >
            <div className="panel panel--search-inline">
              <div className="search-input-wrap">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Deputy, party or constituency"
                  aria-label="Search Deputy, party or constituency"
                />
                {query ? (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => setQuery("")}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>

            {hasSelection && selectedMember ? (
              <aside className="panel panel--selected-mini">
                <a
                  href={selectedMemberUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="selected-mini-card"
                >
                  <div className="selected-mini-card__media">
                    {selectedMember.imageUrl ? (
                      <div
                        className="selected-mini-card__photo-ring"
                        style={{
                          borderColor:
                            partiesPalette.find(
                              (p) => p.name === selectedMember.Party,
                            )?.value || "#d6d3d1",
                        }}
                      >
                        <img
                          src={selectedMember.imageUrl}
                          alt={selectedMember.Deputy}
                          className="selected-mini-card__photo"
                        />
                      </div>
                    ) : (
                      <div className="selected-mini-card__photo-ring selected-mini-card__photo-ring--empty">
                        <div className="selected-mini-card__placeholder">
                          TD
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="selected-mini-card__body">
                    <div className="selected-mini-card__name">
                      {selectedMember.Deputy}
                    </div>
                    <div className="selected-mini-card__meta">
                      {selectedMember.Party || "—"}
                    </div>
                    <div className="selected-mini-card__meta">
                      {selectedMember.Constituency || "—"}
                    </div>
                    <div className="selected-mini-card__link">Profile ↗</div>
                  </div>
                </a>
              </aside>
            ) : null}
          </div>

          <div ref={mapRef}>
            <ChamberMap
              seats={visibleSeats}
              allSeats={seats}
              selectedSeat={selectedSeat}
              onSelect={setSelectedSeat}
              partyFilter={partyFilter}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
