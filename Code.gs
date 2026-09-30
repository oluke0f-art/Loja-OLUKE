/**
 * OLUKE — Google Sheets como fonte única da loja.
 *
 * Use este arquivo em um projeto Apps Script CRIADO A PARTIR DA PRÓPRIA
 * PLANILHA: Google Sheets > Extensões > Apps Script.
 *
 * A planilha deve ter uma aba chamada "Produtos" e a primeira linha deve
 * conter exatamente os cabeçalhos definidos em REQUIRED_HEADERS.
 */

const CONFIG = Object.freeze({
  SHEET_NAME: "Produtos",
  REQUIRED_HEADERS: [
    "Nome",
    "Abreviação",
    "Categoria",
    "Preço",
    "Destaque",
    "Foto",
    "Descrição",
    "Link",
    "Ativo"
  ]
});

function doGet(e) {
  try {
    const action = String(e?.parameter?.action || "catalog").toLowerCase();

    if (action === "image") return serveImage_(e);

    return jsonOutput_(buildCatalog_());
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonOutput_({
      ok: false,
      error: "Não foi possível ler a planilha agora.",
      details: String(error && error.message ? error.message : error)
    });
  }
}

function buildCatalog_() {
  const sheet = getProductsSheet_();
  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), CONFIG.REQUIRED_HEADERS.length);

  if (lastRow < 1) {
    return { ok: true, categories: [], products: [], warnings: ["A aba Produtos está vazia."] };
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
    .map(h => String(h).trim());

  validateHeaders_(headers);

  const headerIndex = indexHeaders_(headers);
  const rowCount = Math.max(0, lastRow - 1);
  if (!rowCount) {
    return { ok: true, categories: [], products: [], warnings: ["Nenhum produto cadastrado."] };
  }

  const range = sheet.getRange(2, 1, rowCount, lastColumn);
  const values = range.getValues();
  const display = range.getDisplayValues();

  const products = [];
  const warnings = [];

  for (let i = 0; i < rowCount; i++) {
    const rowNumber = i + 2;
    try {
      const row = values[i];
      const shown = display[i];

      const name = text_(row[headerIndex.Nome]);
      const category = text_(row[headerIndex.Categoria]);
      const link = text_(row[headerIndex.Link]);
      const active = toBoolean_(row[headerIndex.Ativo], true);

      if (!name) continue;
      if (!active) continue;

      if (!category) {
        warnings.push(`Linha ${rowNumber}: produto "${name}" ignorado porque a Categoria está vazia.`);
        continue;
      }

      const price = toPrice_(row[headerIndex.Preço], shown[headerIndex.Preço]);
      if (price === null) {
        warnings.push(`Linha ${rowNumber}: produto "${name}" ignorado porque o Preco é inválido.`);
        continue;
      }

      if (!link) {
        warnings.push(`Linha ${rowNumber}: produto "${name}" ignorado porque o Link está vazio.`);
        continue;
      }

      const image = getCellImageMeta_(sheet.getRange(rowNumber, headerIndex.Foto + 1));

      products.push({
        id: `${rowNumber}-${slug_(name)}`,
        row: rowNumber,
        nome: name,
        abreviacao: text_(row[headerIndex.Abreviação]),
        categoria: category,
        valor: price,
        destaque: toBoolean_(row[headerIndex.Destaque], false),
        descricao: text_(row[headerIndex.Descrição]),
        link: link,
        imagem: image ? { row: rowNumber, available: true } : null,
        midias: image ? [{ nome: "Foto", tipo: "imagem", imageRow: rowNumber }] : []
      });
    } catch (error) {
      warnings.push(`Linha ${rowNumber}: produto ignorado por erro de leitura.`);
      console.error(error && error.stack ? error.stack : error);
    }
  }

  const categoryMap = new Map();
  products.forEach(product => {
    if (!categoryMap.has(product.categoria)) {
      categoryMap.set(product.categoria, {
        id: slug_(product.categoria),
        nome: product.categoria,
        imagem: null,
        ativo: true
      });
    }

    const category = categoryMap.get(product.categoria);
    if (!category.imagem && product.imagem) category.imagem = { row: product.row };
  });

  products.sort((a, b) => naturalCompare_(a.nome, b.nome));
  const categories = Array.from(categoryMap.values())
    .sort((a, b) => naturalCompare_(a.nome, b.nome));

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    categories,
    products,
    warnings
  };
}

function serveImage_(e) {
  const row = Number(e?.parameter?.row);
  if (!Number.isInteger(row) || row < 2) {
    return jsonOutput_({ ok: false, error: "Linha de imagem inválida." });
  }

  const sheet = getProductsSheet_();
  const headers = sheet.getRange(
    1, 1, 1, Math.max(sheet.getLastColumn(), CONFIG.REQUIRED_HEADERS.length)
  ).getDisplayValues()[0].map(h => String(h).trim());

  validateHeaders_(headers);

  const fotoColumn = indexHeaders_(headers).Foto + 1;
  const cell = sheet.getRange(row, fotoColumn);
  const image = getCellImage_(cell);

  if (!image) {
    return jsonOutput_({ ok: false, error: "Esta célula não contém uma imagem na célula." });
  }

  try {
    const contentUrl = image.getContentUrl();
    const response = UrlFetchApp.fetch(contentUrl, {
      muteHttpExceptions: true,
      followRedirects: true
    });

    const status = response.getResponseCode();
    if (status < 200 || status >= 300) {
      throw new Error(`Falha ao buscar imagem no Google (HTTP ${status}).`);
    }

    const blob = response.getBlob();
    const base64 = Utilities.base64Encode(blob.getBytes());
    const mime = blob.getContentType() || "image/png";

    return jsonOutput_({
      ok: true,
      mime,
      data: `data:${mime};base64,${base64}`
    });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonOutput_({
      ok: false,
      error: "A imagem foi encontrada, mas não pôde ser recuperada agora.",
      details: String(error && error.message ? error.message : error)
    });
  }
}

function getProductsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("O Apps Script precisa estar vinculado à planilha.");
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error(`A aba "${CONFIG.SHEET_NAME}" não existe.`);
  return sheet;
}

function validateHeaders_(headers) {
  CONFIG.REQUIRED_HEADERS.forEach(header => {
    if (!headers.includes(header)) throw new Error(`Cabeçalho obrigatório ausente: "${header}".`);
  });
}

function indexHeaders_(headers) {
  const out = {};
  CONFIG.REQUIRED_HEADERS.forEach(header => { out[header] = headers.indexOf(header); });
  return out;
}

function getCellImage_(cell) {
  try {
    const value = cell.getValue();
    if (value && typeof value === "object" &&
        value.valueType === SpreadsheetApp.ValueType.IMAGE &&
        typeof value.getContentUrl === "function") return value;
  } catch (error) {
    console.error(`Falha ao ler CellImage ${cell.getA1Notation()}:`, error);
  }
  return null;
}

function getCellImageMeta_(cell) {
  return getCellImage_(cell) ? { available: true } : null;
}

function toBoolean_(value, defaultValue) {
  if (typeof value === "boolean") return value;
  if (value === "" || value === null || value === undefined) return defaultValue;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "verdadeiro", "sim", "1", "yes"].includes(normalized)) return true;
  if (["false", "falso", "nao", "não", "0", "no"].includes(normalized)) return false;

  return defaultValue;
}

function toPrice_(value, displayed) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = String(displayed ?? value ?? "").trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function text_(value) {
  return String(value ?? "").trim();
}

function slug_(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function naturalCompare_(a, b) {
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
}

function jsonOutput_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
