import fs from "node:fs";
import Papa from "papaparse";

const svgPath = "./src/data/chamber.svg";
const csvPath = "./public/seatAssignments.csv";

const svg = fs.readFileSync(svgPath, "utf8");
const csv = fs.readFileSync(csvPath, "utf8");

const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true }).data;

let updated = svg;

for (const row of parsed) {
  const pathId = String(row.path_id || "").trim();
  const seatLabel = String(row.seat_label || "").trim();
  if (!pathId || !seatLabel) continue;

  const regex = new RegExp(`<path([^>]*?)id="path${pathId}"([^>]*?)\\/?>`, "g");

  updated = updated.replace(regex, (match, before, after) => {
    let attrs = `${before}id="path${pathId}"${after}`;
    attrs = attrs.replace(/\sclass="seat"/g, "");
    attrs = attrs.replace(/\sdata-seat="[^"]*"/g, "");
    return `<path${attrs} class="seat" data-seat="${seatLabel}" />`;
  });
}

updated = updated.replace(/ style="[^"]*"/g, "");

fs.writeFileSync(svgPath, updated, "utf8");
console.log("Stamped chamber.svg with data-seat values.");
