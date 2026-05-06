import JSZip from "jszip"
import type { SlidesDeck, SlidesStructuredSlide } from "@/lib/slides/schema"

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function textShape(id: number, name: string, x: number, y: number, cx: number, cy: number, text: string, size: number, bold = false) {
  const lines = text.split("\n").filter(Boolean)
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>${lines.map((line) => `<a:p><a:r><a:rPr lang="en-US" sz="${size}"${bold ? " b=\"1\"" : ""}/><a:t>${esc(line)}</a:t></a:r></a:p>`).join("")}</p:txBody></p:sp>`
}

function slideXml(slide: SlidesStructuredSlide) {
  const bullets = slide.body.map((item) => `• ${item}`).join("\n")
  const proof = `${slide.proof.title}\n${slide.proof.description}${slide.proof.data.length ? `\n${slide.proof.data.map((item) => `${item.label}: ${item.value}`).join("\n")}` : ""}`
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="F7F4EE"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${textShape(2, "Slide title", 520000, 420000, 8200000, 940000, slide.title, 3300, true)}${textShape(3, "Claim", 520000, 1400000, 8200000, 980000, slide.claim, 2200, false)}${textShape(4, "Body", 620000, 2600000, 4300000, 2450000, bullets, 1500)}${textShape(5, "Proof", 5350000, 2600000, 3900000, 2450000, proof, 1350)}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`
}

export async function exportSlidesDeckToPptx(deck: SlidesDeck): Promise<Buffer> {
  const zip = new JSZip()
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>${deck.slides.map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}</Types>`)
  zip.folder("_rels")?.file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`)
  zip.folder("ppt")?.file("presentation.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="10058400" cy="5651500" type="wide"/><p:notesSz cx="6858000" cy="9144000"/><p:sldIdLst>${deck.slides.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 1}"/>`).join("")}</p:sldIdLst></p:presentation>`)
  zip.folder("ppt")?.folder("_rels")?.file("presentation.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${deck.slides.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`).join("")}</Relationships>`)
  const slidesFolder = zip.folder("ppt")?.folder("slides")
  deck.slides.forEach((slide, index) => slidesFolder?.file(`slide${index + 1}.xml`, slideXml(slide)))
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
}

function pdfEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\n/g, "\\n")
}

export function exportSlidesDeckToPdf(deck: SlidesDeck): Buffer {
  const objects: string[] = []
  const add = (body: string) => {
    objects.push(body)
    return objects.length
  }
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
  const pageIds: number[] = []
  const pageContents = deck.slides.map((slide) => {
    const lines = [slide.title, slide.claim, ...slide.body.map((item) => `- ${item}`), slide.proof.title, slide.proof.description].slice(0, 11)
    const content = `BT /F1 24 Tf 54 500 Td (${pdfEscape(lines[0] || deck.title)}) Tj /F1 14 Tf 0 -44 Td (${pdfEscape(lines[1] || "")}) Tj ${lines.slice(2).map((line) => `0 -26 Td (${pdfEscape(line)}) Tj`).join(" ")} ET`
    return add(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`)
  })
  let pagesId = 0
  deck.slides.forEach((_, index) => {
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 720 405] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${pageContents[index]} 0 R >>`))
  })
  pagesId = add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`)
  pageIds.forEach((id) => {
    objects[id - 1] = objects[id - 1].replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`)
  })
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)
  const chunks = ["%PDF-1.4\n"]
  const offsets: number[] = [0]
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(chunks.join("")))
    chunks.push(`${index + 1} 0 obj\n${body}\nendobj\n`)
  })
  const xref = Buffer.byteLength(chunks.join(""))
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`)
  return Buffer.from(chunks.join(""))
}
