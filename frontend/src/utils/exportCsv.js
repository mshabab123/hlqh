const csvCell = (value) => {
  if (value === null || value === undefined) return '';
  let normalized = String(value).replace(/\r?\n/g, ' ');
  // Prevent CSV/formula injection: neutralize cells that a spreadsheet
  // would interpret as a formula by prefixing them with a single quote.
  if (/^[=+\-@\t\r]/.test(normalized)) {
    normalized = `'${normalized}`;
  }
  return `"${normalized.replace(/"/g, '""')}"`;
};

export function exportRowsToCsv(rows, filename) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  // Excel uses the Windows regional list separator by default. The `sep=,`
  // directive makes comma-separated exports open in distinct columns even on
  // Arabic systems whose configured separator is a semicolon. UTF-16LE with
  // its byte-order mark is detected reliably by desktop Excel and prevents
  // Arabic text from being decoded as the Windows ANSI code page.
  const content = `sep=,\r\n${csv}`;
  const bytes = new Uint8Array(2 + (content.length * 2));
  bytes[0] = 0xFF;
  bytes[1] = 0xFE;
  for (let index = 0; index < content.length; index += 1) {
    const codeUnit = content.charCodeAt(index);
    bytes[2 + (index * 2)] = codeUnit & 0xFF;
    bytes[3 + (index * 2)] = codeUnit >>> 8;
  }
  const blob = new Blob([bytes], {
    type: 'text/csv;charset=utf-16le;'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
