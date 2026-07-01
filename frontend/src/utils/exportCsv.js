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
  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;'
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
