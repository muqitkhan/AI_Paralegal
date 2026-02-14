/**
 * Download helper – generates a text file and triggers browser download.
 */
export function downloadTextFile(filename: string, content: string, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Build a human-readable text representation of a case */
export function caseToText(c: any, clientName?: string): string {
  const lines = [
    `CASE FILE`,
    `${"=".repeat(60)}`,
    `Title:             ${c.title || "N/A"}`,
    `Case Number:       ${c.case_number || "N/A"}`,
    `Type:              ${(c.case_type || "N/A").replace("_", " ")}`,
    `Status:            ${(c.status || "N/A").replace("_", " ")}`,
    `Client:            ${clientName || c.client_id || "N/A"}`,
    `Court:             ${c.court || "N/A"}`,
    `Judge:             ${c.judge || "N/A"}`,
    `Opposing Counsel:  ${c.opposing_counsel || "N/A"}`,
    `Filing Date:       ${c.filing_date ? new Date(c.filing_date).toLocaleDateString() : "N/A"}`,
    `Estimated Value:   ${c.estimated_value ? `$${Number(c.estimated_value).toLocaleString()}` : "N/A"}`,
    ``,
    `DESCRIPTION`,
    `${"-".repeat(60)}`,
    c.description || "(No description)",
    ``,
    `${"=".repeat(60)}`,
    `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
  ];
  return lines.join("\n");
}

/** Build a human-readable text representation of a document */
export function documentToText(doc: any, caseName?: string): string {
  const lines = [
    `LEGAL DOCUMENT`,
    `${"=".repeat(60)}`,
    `Title:    ${doc.title || "Untitled"}`,
    `Type:     ${doc.doc_type || "N/A"}`,
    `Version:  ${doc.version || 1}`,
    caseName ? `Case:     ${caseName}` : null,
    `Date:     ${doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : new Date().toLocaleDateString()}`,
    ``,
    `${"=".repeat(60)}`,
    ``,
    doc.content || "(No content)",
    ``,
    `${"=".repeat(60)}`,
    `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
  ].filter(Boolean);
  return lines.join("\n");
}

/** Build a human-readable text representation of an invoice */
export function invoiceToText(inv: any, clientName?: string, items?: any[]): string {
  const lines = [
    `INVOICE`,
    `${"=".repeat(60)}`,
    `Invoice #:  ${inv.invoice_number || "N/A"}`,
    `Status:     ${inv.status || "N/A"}`,
    `Client:     ${clientName || "N/A"}`,
    `Issue Date: ${inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "N/A"}`,
    `Due Date:   ${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "N/A"}`,
    ``,
  ];
  if (items && items.length > 0) {
    lines.push(`LINE ITEMS`, `${"-".repeat(60)}`);
    items.forEach((item, i) => {
      lines.push(`  ${i + 1}. ${item.description || "Item"} — Qty: ${item.quantity || 1} × $${Number(item.rate || 0).toFixed(2)} = $${Number(item.amount || 0).toFixed(2)}`);
    });
    lines.push(``);
  }
  lines.push(
    `${"-".repeat(60)}`,
    `Subtotal:  $${Number(inv.subtotal || 0).toFixed(2)}`,
    `Tax:       $${Number(inv.tax || 0).toFixed(2)}`,
    `TOTAL:     $${Number(inv.total || 0).toFixed(2)}`,
    ``,
  );
  if (inv.notes) lines.push(`Notes: ${inv.notes}`);
  lines.push(
    `${"=".repeat(60)}`,
    `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
  );
  return lines.filter(Boolean).join("\n");
}
