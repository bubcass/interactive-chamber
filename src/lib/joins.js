export function clean(value) {
  if (value == null) return "";
  return String(value).trim();
}

export function byKey(rows, key) {
  return Object.fromEntries(
    rows
      .map((row) => ({ ...row, [key]: clean(row[key]) }))
      .filter((row) => row[key] !== "")
      .map((row) => [row[key], row]),
  );
}

export function normaliseMemberApiRows(rows) {
  return rows.map((row) => {
    const Code = clean(row.Code ?? row.code ?? row.memberCode);

    return {
      Deputy: clean(row.Deputy ?? row.deputy ?? row.name),
      Party: clean(row.Party ?? row.party),
      Constituency: clean(row.Constituency ?? row.constituency),
      Code,
      imageUrl: Code
        ? `https://data.oireachtas.ie/ie/oireachtas/member/id/${Code}/image/large`
        : "",
      Committees: Array.isArray(row.Committees)
        ? row.Committees.filter(Boolean)
        : [],
    };
  });
}
