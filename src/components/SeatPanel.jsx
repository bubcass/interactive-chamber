import React from "react";
import { partyColorMap } from "../data/partiesPalette.js";

export default function SeatPanel({ seat }) {
  if (!seat) {
    return (
      <aside className="panel panel--member">
        <div className="panel-empty">
          <h2>No seat selected</h2>
          <p>Click a seat in the chamber.</p>
        </div>
      </aside>
    );
  }

  const name =
    seat.member?.Deputy || seat.assignment?.deputy_name || "Unassigned seat";
  const imageUrl = seat.member?.imageUrl || "";
  const party = seat.member?.Party || "";
  const constituency = seat.member?.Constituency || "";
  const memberId = seat.member?.Code || seat.assignment?.member_code || "";
  const memberUrl = memberId
    ? `https://www.oireachtas.ie/en/members/member/${memberId}/`
    : "";

  const borderColor = partyColorMap[party] || "#d6d3d1";

  return (
    <aside className="panel panel--member">
      <div className="member-card">
        <div className="member-card__top">
          {imageUrl ? (
            <div className="member-photo-ring" style={{ borderColor }}>
              <img
                src={imageUrl}
                alt={name}
                className="member-photo member-photo--round"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : (
            <div
              className="member-photo-ring member-photo-ring--empty"
              style={{ borderColor }}
            >
              <div className="member-photo-placeholder">TD</div>
            </div>
          )}

          <div className="member-card__identity">
            <div className="eyebrow">{seat.seat_label}</div>
            <h2>{name}</h2>

            {party ? (
              <div className="member-party">
                <span
                  className="member-party__chip"
                  style={{ backgroundColor: borderColor }}
                />
                <span>{party}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="member-meta">
          <div className="member-meta__item">
            <span className="member-meta__label">Constituency</span>
            <span className="member-meta__value">{constituency || "—"}</span>
          </div>

          {memberUrl ? (
            <div className="member-meta__item">
              <span className="member-meta__label">Profile</span>
              <a
                href={memberUrl}
                target="_blank"
                rel="noreferrer"
                className="member-link"
              >
                View member page
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
