export const partiesPalette = [
  { name: "Fianna Fáil", value: "#40b34e" },
  { name: "Sinn Féin", value: "#088460" },
  { name: "Fine Gael", value: "#303591" },
  { name: "Independent", value: "#666666" },
  { name: "Labour Party", value: "#c82832" },
  { name: "Social Democrats", value: "#782b81" },
  { name: "Independent Ireland", value: "#17becf" },
  { name: "People Before Profit-Solidarity", value: "#c5568b" },
  { name: "Aontú", value: "#ff7f0e" },
  { name: "100% RDR", value: "#985564" },
  { name: "Green Party", value: "#b4d143" },
];

export const partyColorMap = Object.fromEntries(
  partiesPalette.map((d) => [d.name, d.value]),
);
