export const partiesPalette = [
  { name: "Fianna Fáil", value: "#2c8737" },
  { name: "Sinn Féin", value: "#088460" },
  { name: "Fine Gael", value: "#303591" },
  { name: "Independent", value: "#666666" },
  { name: "Labour Party", value: "#c82832" },
  { name: "Social Democrats", value: "#782b81" },
  { name: "Independent Ireland", value: "#087b87" },
  { name: "People Before Profit-Solidarity", value: "#be417d" },
  { name: "Aontú", value: "#b35400" },
  { name: "100% RDR", value: "#985564" },
  { name: "Green Party", value: "#6c7e26" },
];

export const partyColorMap = Object.fromEntries(
  partiesPalette.map((d) => [d.name, d.value]),
);
