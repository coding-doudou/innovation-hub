import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

const MAX_EXTRACTED_CHARS = 50_000;
const TEXT_EXTENSIONS = new Set(["txt", "md", "csv", "json", "log", "eml", "xml", "html", "htm", "srt", "vtt", "tsv"]);

function extension(name) {
  return (String(name || "").split(".").pop() || "").toLowerCase();
}

function cleanText(value) {
  return String(value || "").replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
}

async function extractPdf(file) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    if (text.trim()) pages.push(`[Page ${pageNumber}]\n${text.trim()}`);
    if (pages.join("\n\n").length >= MAX_EXTRACTED_CHARS) break;
  }
  return cleanText(pages.join("\n\n"));
}

async function extractDocx(file) {
  const module = await import("mammoth");
  const mammoth = module.default || module;
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return cleanText(result.value);
}

export function isSupportedDocument(file) {
  const ext = extension(file?.name);
  return ext === "pdf" || ext === "docx" || TEXT_EXTENSIONS.has(ext) || String(file?.type || "").startsWith("text/");
}

export async function extractTextFromFile(file) {
  const ext = extension(file.name);
  let text = "";
  if (ext === "pdf" || file.type === "application/pdf") text = await extractPdf(file);
  else if (ext === "docx" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") text = await extractDocx(file);
  else if (TEXT_EXTENSIONS.has(ext) || String(file.type || "").startsWith("text/")) text = cleanText(await file.text());
  else throw new Error("Unsupported format. Use PDF, DOCX, TXT, MD, CSV, JSON, EML, SRT, or VTT.");

  if (!text) throw new Error(ext === "pdf" ? "No selectable text found. This PDF may be a scan and needs OCR." : "No readable text found in this file.");
  const truncated = text.length > MAX_EXTRACTED_CHARS;
  return { text: text.slice(0, MAX_EXTRACTED_CHARS), truncated };
}
