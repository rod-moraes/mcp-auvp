import type { AuvpFinancasClient } from "../core/http-client.js";

const MAP_DATA_PATH = "/dados/paises_dados_completos_final.csv";

export interface CountryRating {
  country: string;
  internationalName: string;
  mainIndex: string;
  americanEtfs: string[];
  ratings: {
    sp: string;
    moodys: string;
    fitch: string;
    riskLevel: string;
  };
  companies: Array<{
    name: string;
    ticker: string;
    sector: string;
  }>;
  geoJsonName: string;
}

export async function searchCountryRatings(
  client: AuvpFinancasClient,
  query = "",
  limit = 50,
): Promise<{ countries: CountryRating[]; total: number }> {
  const csv = await client.getCarteiraPageText(MAP_DATA_PATH);
  const rows = parseCsv(csv);
  const headers = rows.shift() ?? [];
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const countries = new Map<string, CountryRating>();

  for (const row of rows) {
    const country = row[indexes["País"] ?? -1]?.trim();
    if (!country) {
      continue;
    }

    const existing = countries.get(country) ?? {
      country,
      internationalName: row[indexes.Country ?? -1]?.trim() ?? "",
      mainIndex: row[indexes["Principal Índice"] ?? -1]?.trim() ?? "",
      americanEtfs: splitList(row[indexes["ETFs Americanos"] ?? -1]),
      ratings: {
        sp: row[indexes["S&P"] ?? -1]?.trim() ?? "",
        moodys: row[indexes["Moody's"] ?? -1]?.trim() ?? "",
        fitch: row[indexes.Fitch ?? -1]?.trim() ?? "",
        riskLevel: row[indexes["Nível de Risco"] ?? -1]?.trim() ?? "",
      },
      companies: [],
      geoJsonName: row[indexes["GeoJSON name"] ?? -1]?.trim() ?? "",
    };

    const company = row[indexes.Empresa ?? -1]?.trim();
    const ticker = row[indexes.Ticker ?? -1]?.trim();
    if (company || ticker) {
      existing.companies.push({
        name: company ?? "",
        ticker: ticker ?? "",
        sector: row[indexes.Setor ?? -1]?.trim() ?? "",
      });
    }
    countries.set(country, existing);
  }

  const normalizedQuery = normalize(query);
  const matches = [...countries.values()].filter((entry) => {
    if (!normalizedQuery) {
      return true;
    }
    return normalize(
      [
        entry.country,
        entry.internationalName,
        entry.mainIndex,
        ...entry.americanEtfs,
        ...entry.companies.flatMap((company) => [
          company.name,
          company.ticker,
          company.sector,
        ]),
      ].join(" "),
    ).includes(normalizedQuery);
  });

  return { countries: matches.slice(0, limit), total: matches.length };
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && csv[index + 1] === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((entry) => entry.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function splitList(value: string | undefined): string[] {
  return value
    ? value.split(",").map((entry) => entry.trim()).filter(Boolean)
    : [];
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

