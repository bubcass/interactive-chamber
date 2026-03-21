import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import {
  normaliseMemberApiRows,
  clean as cleanFromJoins,
} from "../src/lib/joins.js";

const ROOT = process.cwd();

const PATHS = {
  svg: path.join(ROOT, "src/data/chamber.svg"),
  seatingCsv: path.join(ROOT, "public/seatAssignments.csv"),
  membersJson: path.join(ROOT, "src/data/members.json"),
  partiesPaletteJs: path.join(ROOT, "src/data/partiesPalette.js"),
  outputDir: path.join(ROOT, "output"),
  outputHtml: path.join(ROOT, "output/dail-chamber-static.html"),
};

function clean(value) {
  if (typeof cleanFromJoins === "function") return cleanFromJoins(value);
  return String(value ?? "").trim();
}

function buildMemberUrl(memberCode) {
  if (!memberCode) return "";
  return `https://www.oireachtas.ie/en/members/member/${memberCode}/`;
}

function buildImageUrl(memberCode) {
  if (!memberCode) return "";
  return `https://data.oireachtas.ie/ie/oireachtas/member/id/${memberCode}/image/large`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loadCsvRows(csvText) {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    console.warn("CSV parse warnings:", parsed.errors);
  }

  return parsed.data;
}

async function loadPartyPalette() {
  const mod = await import(`file://${PATHS.partiesPaletteJs}`);
  const palette = mod.partiesPalette ?? [];
  return Object.fromEntries(
    palette.map((d) => [d.name, d.value || d.color || "#d6d3d1"]),
  );
}

function buildSeatData(seatingRows, members) {
  const membersByCode = new Map(
    members.map((m) => [clean(m.Code ?? m.memberCode), m]),
  );

  const seatData = {};

  for (const row of seatingRows) {
    const seatLabel = clean(row.seat_label);
    const memberCode = clean(row.member_code ?? row.memberCode);

    if (!seatLabel) continue;

    const member = membersByCode.get(memberCode) || null;

    seatData[seatLabel] = {
      seat_label: seatLabel,
      memberCode,
      name: clean(member?.Deputy ?? row.deputy_name ?? row.Deputy),
      party: clean(member?.Party),
      constituency: clean(member?.Constituency),
      image: buildImageUrl(memberCode),
      url: buildMemberUrl(memberCode),
    };
  }

  return seatData;
}

function buildHtml({ svgMarkup, seatData, partyColorMap }) {
  const seatDataJson = JSON.stringify(seatData, null, 2);
  const partyMapJson = JSON.stringify(partyColorMap, null, 2);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Interactive Dáil chamber</title>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap");

    :root {
      --bg: #f4f2ea;
      --panel: #ffffff;
      --border: #e7e5e4;
      --text: #1c1917;
      --muted: #57534e;
      --muted-2: #78716c;
      --seat-default: #d6d3d1;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      color: var(--text);
      background: transparent;
    }

    .page {
      width: 100%;
      margin: 0;
      padding: 0;
    }

    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 12px;
    }

    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 14px;
    }

    .summary__item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid #ece7dc;
      border-radius: 999px;
      background: #fafaf9;
      font-size: 0.92rem;
      line-height: 1;
    }

    .summary__dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      flex: 0 0 auto;
    }

    .summary__name {
      font-weight: 500;
    }

    .summary__count {
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }

    .map-wrap {
      width: 100%;
      padding: 12px;
      border-radius: 4px;
      background: #fafaf9;
      position: relative;
      overflow: visible;
    }

    .map-frame {
      border-radius: 4px;
      overflow: hidden;
    }

    .map-frame svg {
      display: block;
      width: 100%;
      height: auto;
    }

    .seat path,
    .seat circle,
    .seat rect,
    .seat polygon,
    .seat ellipse {
      transition:
        fill 0.25s ease,
        opacity 0.2s ease,
        stroke 0.2s ease,
        filter 0.2s ease;
    }

    .seat:hover path,
    .seat:hover circle,
    .seat:hover rect,
    .seat:hover polygon,
    .seat:hover ellipse {
      filter: brightness(1.03) drop-shadow(0 0 6px rgba(17, 24, 39, 0.12));
      opacity: 0.95;
    }

    .tooltip {
      position: absolute;
      z-index: 50;
      min-width: 180px;
      max-width: 280px;
      padding: 0;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(6px);
      box-shadow: 0 14px 32px rgba(0, 0, 0, 0.10);
      pointer-events: none;
      opacity: 0;
      transform: translate(-50%, calc(-100% - 6px)) scale(0.96);
      animation: tooltipIn 120ms ease-out 40ms forwards;
      overflow: hidden;
    }

    @keyframes tooltipIn {
      from {
        opacity: 0;
        transform: translate(-50%, calc(-100% - 2px)) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translate(-50%, calc(-100% - 10px)) scale(1);
      }
    }

    .tooltip__card {
      display: grid;
      grid-template-columns: 52px minmax(0, 1fr);
      gap: 12px;
      align-items: center;
      padding: 12px;
    }

    .tooltip__avatar {
      width: 52px;
      height: 52px;
      border: 3px solid var(--seat-default);
      border-radius: 999px;
      background: #f5f5f4;
      object-fit: cover;
      display: block;
    }

    .tooltip__avatar--empty {
      display: grid;
      place-items: center;
      color: var(--muted-2);
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.06em;
    }

    .tooltip__body {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .tooltip__name {
      color: var(--text);
      font-size: 14px;
      font-weight: 600;
      line-height: 1.25;
    }

    .tooltip__party {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.25;
    }

    .tooltip__constituency {
      color: var(--muted-2);
      font-size: 12px;
      line-height: 1.3;
    }

    .tooltip__chip {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      flex: 0 0 auto;
    }

    @media (max-width: 639px) {
      .panel,
      .map-wrap,
      .map-frame {
        border-radius: 4px;
      }

      .summary {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .summary__item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        border-radius: 12px;
        font-size: 0.86rem;
        line-height: 1.1;
      }

      .tooltip {
        max-width: 240px;
      }

      .tooltip__card {
        grid-template-columns: 44px minmax(0, 1fr);
        gap: 10px;
        padding: 10px;
      }

      .tooltip__avatar {
        width: 44px;
        height: 44px;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="panel">
      <div id="party-summary" class="summary"></div>

      <div id="map-wrap" class="map-wrap">
        <div id="map-frame" class="map-frame">
${svgMarkup}
        </div>
      </div>
    </section>
  </div>

  <script>
    const partyColorMap = ${partyMapJson};
    const seatData = ${seatDataJson};

    const mapWrap = document.getElementById("map-wrap");
    const mapFrame = document.getElementById("map-frame");
    const partySummary = document.getElementById("party-summary");
    let tooltipEl = null;

    function getSeatFill(seat) {
      return partyColorMap[seat?.party] || "#d6d3d1";
    }

    function escapeHtml(str) {
      return String(str ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    function renderPartySummary() {
      const counts = new Map();

      Object.values(seatData).forEach((seat) => {
        if (!seat.party) return;
        counts.set(seat.party, (counts.get(seat.party) || 0) + 1);
      });

      const items = Array.from(counts.entries())
        .map(([name, count]) => ({
          name,
          count,
          color: partyColorMap[name] || "#d6d3d1"
        }))
        .sort((a, b) => b.count - a.count);

      partySummary.innerHTML = items
        .map(
          (item) => \`
            <div class="summary__item">
              <span class="summary__dot" style="background:\${item.color}"></span>
              <span class="summary__name">\${escapeHtml(item.name)}</span>
              <span class="summary__count">\${item.count}</span>
            </div>
          \`
        )
        .join("");
    }

    function createTooltip(seat, x, y) {
      destroyTooltip();

      const color = getSeatFill(seat);
      const hasImage = Boolean(seat.image);

      tooltipEl = document.createElement("div");
      tooltipEl.className = "tooltip";
      tooltipEl.style.left = \`\${x}px\`;
      tooltipEl.style.top = \`\${y}px\`;

      tooltipEl.innerHTML = \`
        <div class="tooltip__card">
          \${
            hasImage
              ? \`<img src="\${escapeHtml(seat.image)}" alt="" class="tooltip__avatar" style="border-color:\${color}">\`
              : \`<div class="tooltip__avatar tooltip__avatar--empty" style="border-color:\${color}">TD</div>\`
          }
          <div class="tooltip__body">
            <div class="tooltip__name">\${escapeHtml(seat.name || "")}</div>
            <div class="tooltip__party">
              <span class="tooltip__chip" style="background:\${color}"></span>
              \${escapeHtml(seat.party || "")}
            </div>
            \${
              seat.constituency
                ? \`<div class="tooltip__constituency">\${escapeHtml(seat.constituency)}</div>\`
                : ""
            }
          </div>
        </div>
      \`;

      mapWrap.appendChild(tooltipEl);
    }

    function moveTooltip(x, y) {
      if (!tooltipEl) return;
      tooltipEl.style.left = \`\${x}px\`;
      tooltipEl.style.top = \`\${y}px\`;
    }

    function destroyTooltip() {
      if (tooltipEl) {
        tooltipEl.remove();
        tooltipEl = null;
      }
    }

    function initSeats() {
      const svgRoot = mapFrame.querySelector("svg");
      if (!svgRoot) return;

      const seatEls = svgRoot.querySelectorAll(".seat[data-seat]");
      const shapeSelector = "path, ellipse, rect, polygon, circle";

      seatEls.forEach((el) => {
        const seatLabel = el.getAttribute("data-seat");
        const seat = seatData[seatLabel];
        const fill = getSeatFill(seat);

        const shapes =
          el.tagName.toLowerCase() === "g"
            ? el.querySelectorAll(shapeSelector)
            : [el];

        shapes.forEach((shape) => {
          shape.style.fill = fill;
        });

        if (seat?.name || seat?.party || seat?.constituency) {
          const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
          title.textContent = [seat.name, seat.party, seat.constituency]
            .filter(Boolean)
            .join(" — ");
          el.appendChild(title);
        }

        el.style.cursor = seat?.url ? "pointer" : "default";
      });

      const findSeatEl = (target) => {
        if (!(target instanceof Element)) return null;
        return target.closest(".seat[data-seat]");
      };

      svgRoot.addEventListener("pointermove", (event) => {
        const seatEl = findSeatEl(event.target);

        if (!seatEl) {
          destroyTooltip();
          return;
        }

        const seatLabel = seatEl.getAttribute("data-seat");
        const seat = seatData[seatLabel];
        if (!seat) {
          destroyTooltip();
          return;
        }

        const containerRect = mapWrap.getBoundingClientRect();
        const x = event.clientX - containerRect.left;
        const y = event.clientY - containerRect.top - 14;

        if (!tooltipEl) {
          createTooltip(seat, x, y);
        } else {
          moveTooltip(x, y);
        }
      });

      svgRoot.addEventListener("pointerleave", () => {
        destroyTooltip();
      });

      svgRoot.addEventListener("click", (event) => {
        const seatEl = findSeatEl(event.target);
        if (!seatEl) return;

        const seatLabel = seatEl.getAttribute("data-seat");
        const seat = seatData[seatLabel];
        if (!seat?.url) return;

        window.open(seat.url, "_blank", "noopener,noreferrer");
      });
    }

    renderPartySummary();
    initSeats();
  </script>
</body>
</html>`;
}

async function main() {
  for (const [label, filePath] of Object.entries(PATHS)) {
    if (label.startsWith("output")) continue;
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing required file: ${filePath}`);
    }
  }

  const svgMarkup = fs.readFileSync(PATHS.svg, "utf8");
  const seatingCsvText = fs.readFileSync(PATHS.seatingCsv, "utf8");
  const rawMembers = JSON.parse(fs.readFileSync(PATHS.membersJson, "utf8"));

  const members = normaliseMemberApiRows(rawMembers);

  const seatingRows = loadCsvRows(seatingCsvText).map((row) => ({
    ...row,
    seat_label: clean(row.seat_label),
    deputy_name: clean(row.deputy_name ?? row.Deputy),
    member_code: clean(row.member_code ?? row.memberCode),
    path_id: clean(row.path_id),
  }));

  const partyColorMap = await loadPartyPalette();
  const seatData = buildSeatData(seatingRows, members);

  fs.mkdirSync(PATHS.outputDir, { recursive: true });

  const debugPath = path.join(PATHS.outputDir, "seatData-debug.json");
  fs.writeFileSync(debugPath, JSON.stringify(seatData, null, 2), "utf8");

  const html = buildHtml({
    svgMarkup,
    seatData,
    partyColorMap,
  });

  fs.writeFileSync(PATHS.outputHtml, html, "utf8");

  console.log(`✅ Wrote ${PATHS.outputHtml}`);
  console.log(`✅ Wrote ${debugPath}`);
}

main().catch((err) => {
  console.error("❌ Export failed");
  console.error(err);
  process.exit(1);
});
