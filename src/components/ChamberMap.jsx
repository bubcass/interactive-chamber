import React, { useEffect, useRef, useState } from "react";
import chamberSvg from "../data/chamber.svg?raw";
import { partyColorMap } from "../data/partiesPalette.js";

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

    const visibleSeatLabels = new Set(seats.map((d) => d.seat_label));

    const paintSeat = (el) => {
      const seatLabel = el.getAttribute("data-seat");
      const seat = getSeatData(seatLabel);

      const fill = partyColorMap[seat?.member?.Party] || "#d6d3d1";
      const isSelected = seatLabel === selectedSeat;
      const isHovered = seatLabel === hoveredSeat;
      const passesSearch = visibleSeatLabels.has(seatLabel);
      const passesParty = !partyFilter || seat?.member?.Party === partyFilter;

      const dimmed = !passesSearch || !passesParty;

      const applyStateToShape = (shape) => {
        shape.style.fill = fill;
        shape.style.transition =
          "fill 0.25s ease, opacity 0.2s ease, stroke 0.2s ease, filter 0.2s ease";

        if (isSelected) {
          shape.style.stroke = "#111827";
          shape.style.strokeWidth = "1.4";
          shape.style.filter =
            "brightness(0.97) drop-shadow(0 0 6px rgba(17,24,39,0.10))";
          shape.style.opacity = "1";
        } else if (isHovered && !dimmed) {
          shape.style.stroke = "rgba(17,24,39,0.45)";
          shape.style.strokeWidth = "1.1";
          shape.style.filter =
            "brightness(0.99) drop-shadow(0 0 5px rgba(17,24,39,0.08))";
          shape.style.opacity = "0.92";
        } else {
          shape.style.stroke = "none";
          shape.style.strokeWidth = "0";
          shape.style.filter = "none";
          shape.style.opacity = dimmed ? "0.16" : "1";
        }
      };

      if (el.tagName.toLowerCase() === "g") {
        el.querySelectorAll(shapeSelector).forEach(applyStateToShape);
      } else {
        applyStateToShape(el);
      }

      el.style.cursor = "pointer";
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
      const passesParty = !partyFilter || seat?.member?.Party === partyFilter;

      if (!passesSearch || !passesParty) {
        setHoveredSeat(null);
        setTooltip(null);
        return;
      }

      if (hoveredSeat !== seatLabel) {
        setHoveredSeat(seatLabel);
      }

      if (!seat?.member) {
        setTooltip(null);
        return;
      }

      const containerRect = root.getBoundingClientRect();

      setTooltip({
        x: event.clientX - containerRect.left,
        y: event.clientY - containerRect.top - 14,
        name: seat.member.Deputy,
        party: seat.member.Party,
        constituency: seat.member.Constituency || "",
        color: partyColorMap[seat.member.Party] || "#666666",
        image: seat.member.imageUrl || "",
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
      const passesParty = !partyFilter || seat?.member?.Party === partyFilter;

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
              >
                TD
              </div>
            )}

            <div className="map-tooltip__card-body">
              <div className="map-tooltip__name">{tooltip.name}</div>

              <div className="map-tooltip__party">
                <span
                  className="map-tooltip__chip"
                  style={{ backgroundColor: tooltip.color }}
                />
                {tooltip.party}
              </div>

              {tooltip.constituency ? (
                <div className="map-tooltip__constituency">
                  {tooltip.constituency}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
