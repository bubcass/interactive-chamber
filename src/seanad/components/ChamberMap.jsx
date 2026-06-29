import React, { useEffect, useRef, useState } from "react";
import chamberSvg from "../data/chamber.svg?raw";
import { partyColorMap } from "../data/partiesPalette.js";

const CHAIR_SEAT_LABEL = "F-01";
const CHAIR_ROLE = "Cathaoirleach";
const CHAIR_COLOR = "#7f6c2e";
const EMPTY_SEAT_TITLE = "Empty seat";
const EMPTY_SEAT_MESSAGE = "No representative is assigned to this seat.";
const EMPTY_SEAT_COLOR = "#d6d3d1";
const FILTERED_SEAT_COLOR = "#e7e5e4";

export default function ChamberMap({
  seats = [],
  allSeats = [],
  selectedSeat,
  onSelect,
  partyFilter = null,
}) {
  const ref = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [hoveredSeat, setHoveredSeat] = useState(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const svgRoot = root.querySelector(".map-svg-frame");
    if (!svgRoot) return;

    const seatEls = svgRoot.querySelectorAll(".seat[data-seat]");
    const shapeSelector = "path, ellipse, rect, polygon, circle";

    const getSeatData = (seatLabel) =>
      allSeats.find((d) => d.seat_label === seatLabel) || null;

    const isChairSeat = (seatLabel) => seatLabel === CHAIR_SEAT_LABEL;
    const isEmptySeat = (seat) => !seat?.member;
    const getSeatParty = (seat) =>
      isChairSeat(seat?.seat_label) ? null : seat?.member?.Party || null;
    const getSeatColor = (seat) =>
      isEmptySeat(seat)
        ? EMPTY_SEAT_COLOR
        : isChairSeat(seat?.seat_label)
          ? CHAIR_COLOR
          : partyColorMap[getSeatParty(seat)] || "#d6d3d1";

    const visibleSeatLabels = new Set(seats.map((d) => d.seat_label));

    const paintSeat = (el) => {
      const seatLabel = el.getAttribute("data-seat");
      const seat = getSeatData(seatLabel);

      const baseFill = getSeatColor(seat);
      const isSelected = seatLabel === selectedSeat;
      const isHovered = seatLabel === hoveredSeat;
      const passesSearch = visibleSeatLabels.has(seatLabel);
      const passesParty = !partyFilter || getSeatParty(seat) === partyFilter;

      const dimmed = !passesSearch || !passesParty;
      const fill = dimmed ? FILTERED_SEAT_COLOR : baseFill;

      const applyStateToShape = (shape) => {
        shape.style.fill = fill;
        shape.setAttribute("fill", fill);
        shape.style.transition =
          "fill 0.25s ease, opacity 0.2s ease, stroke 0.2s ease, filter 0.2s ease";
        shape.style.strokeLinejoin = "round";
        shape.style.strokeLinecap = "round";

        if (isSelected) {
          shape.style.stroke = "rgba(255,255,255,0.98)";
          shape.style.strokeWidth = "1.45";
          shape.style.filter =
            "brightness(0.995) drop-shadow(0 0 3px rgba(17,24,39,0.08))";
          shape.style.opacity = "1";
        } else if (isHovered && !dimmed) {
          shape.style.stroke = "rgba(255,255,255,0.88)";
          shape.style.strokeWidth = "0.95";
          shape.style.filter =
            "brightness(1.008) drop-shadow(0 0 3px rgba(17,24,39,0.05))";
          shape.style.opacity = "0.98";
        } else {
          shape.style.stroke = dimmed
            ? "rgba(255,255,255,0.24)"
            : "rgba(255,255,255,0.68)";
          shape.style.strokeWidth = dimmed ? "0.24" : "0.46";
          shape.style.filter = "none";
          shape.style.opacity = dimmed ? "0.55" : "1";
        }
      };

      if (el.tagName.toLowerCase() === "g") {
        el.querySelectorAll(shapeSelector).forEach(applyStateToShape);
      } else {
        applyStateToShape(el);
      }

      el.style.cursor = dimmed ? "default" : "pointer";
      el.style.pointerEvents = dimmed ? "none" : "auto";
    };

    seatEls.forEach(paintSeat);

    const findSeatEl = (target) => {
      if (!(target instanceof Element)) return null;
      return target.closest(".seat[data-seat]");
    };

    const handlePointerMove = (event) => {
      const seatEl = findSeatEl(event.target);

      if (!seatEl) {
        if (hoveredSeat !== null) setHoveredSeat(null);
        setTooltip(null);
        return;
      }

      const seatLabel = seatEl.getAttribute("data-seat");
      const seat = getSeatData(seatLabel);
      const passesSearch = visibleSeatLabels.has(seatLabel);
      const passesParty = !partyFilter || getSeatParty(seat) === partyFilter;

      if (!passesSearch || !passesParty) {
        setHoveredSeat(null);
        setTooltip(null);
        return;
      }

      if (hoveredSeat !== seatLabel) {
        setHoveredSeat(seatLabel);
      }

      const containerRect = root.getBoundingClientRect();

      setTooltip({
        x: event.clientX - containerRect.left,
        y: event.clientY - containerRect.top - 14,
        name: seat?.member?.Deputy || EMPTY_SEAT_TITLE,
        group: seat.assignment?.group || "",
        party: getSeatParty(seat),
        role: isChairSeat(seatLabel) ? CHAIR_ROLE : "",
        constituency: seat?.member?.Constituency || "",
        message: isEmptySeat(seat) ? EMPTY_SEAT_MESSAGE : "",
        color: getSeatColor(seat) || "#666666",
        image: seat?.member?.imageUrl || "",
      });
    };

    const handlePointerLeave = () => {
      setHoveredSeat(null);
      setTooltip(null);
    };

    const handleClick = (event) => {
      const seatEl = findSeatEl(event.target);
      if (!seatEl) return;

      const seatLabel = seatEl.getAttribute("data-seat");
      const seat = getSeatData(seatLabel);
      const passesSearch = visibleSeatLabels.has(seatLabel);
      const passesParty = !partyFilter || getSeatParty(seat) === partyFilter;

      if (!passesSearch || !passesParty) return;

      onSelect?.(seatLabel);
    };

    svgRoot.addEventListener("pointermove", handlePointerMove);
    svgRoot.addEventListener("pointerleave", handlePointerLeave);
    svgRoot.addEventListener("click", handleClick);

    return () => {
      svgRoot.removeEventListener("pointermove", handlePointerMove);
      svgRoot.removeEventListener("pointerleave", handlePointerLeave);
      svgRoot.removeEventListener("click", handleClick);
    };
  }, [seats, allSeats, selectedSeat, hoveredSeat, onSelect, partyFilter]);

  return (
    <div className="map-wrap map-wrap--interactive" ref={ref}>
      <div
        className="map-svg-frame"
        dangerouslySetInnerHTML={{ __html: chamberSvg }}
      />

      {tooltip ? (
        <div
          className="map-tooltip map-tooltip--card"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div className="map-tooltip__card">
            {tooltip.image ? (
              <img
                src={tooltip.image}
                alt=""
                className="map-tooltip__avatar map-tooltip__avatar--large"
                style={{ borderColor: tooltip.color }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div
                className="map-tooltip__avatar map-tooltip__avatar--large map-tooltip__avatar--empty"
                style={{ borderColor: tooltip.color }}
                aria-hidden="true"
              />
            )}

            <div className="map-tooltip__card-body">
              <div className="map-tooltip__name">{tooltip.name}</div>

              {tooltip.group ? (
                <div className="map-tooltip__constituency">{tooltip.group}</div>
              ) : null}

              {tooltip.role || tooltip.party ? (
                <div className="map-tooltip__party">
                  <span
                    className="map-tooltip__chip"
                    style={{ backgroundColor: tooltip.color }}
                  />
                  {tooltip.role || tooltip.party}
                </div>
              ) : null}

              {tooltip.constituency ? (
                <div className="map-tooltip__constituency">
                  {tooltip.constituency}
                </div>
              ) : null}

              {tooltip.message ? (
                <div className="map-tooltip__constituency">
                  {tooltip.message}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
