const normalizeExcelValue = (value) => {
  if (value === null || value === undefined) return '';
  const normalized = String(value).replace(/\r?\n/g, ' ');
  return /^[=+\-@\t\r]/.test(normalized) ? `'${normalized}` : normalized;
};

const getXlsxFilename = (filename) => {
  const requestedName = filename || 'export.xlsx';
  if (/\.csv$/i.test(requestedName)) return requestedName.replace(/\.csv$/i, '.xlsx');
  if (/\.xlsx$/i.test(requestedName)) return requestedName;
  return `${requestedName}.xlsx`;
};

// Keep the existing function name so all report buttons automatically switch
// from CSV to a native Excel workbook.
export async function exportRowsToCsv(rows, filename) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const data = rows.map((row) => row.map((value) => ({
    value: normalizeExcelValue(value),
    align: 'right',
    verticalAlign: 'center',
  })));
  const columnCount = Math.max(0, ...rows.map((row) => row.length));
  const columns = Array.from({ length: columnCount }, (_, index) => ({
    width: Math.min(45, Math.max(10, ...rows.map((row) => String(row[index] ?? '').length + 2)))
  }));

  await writeExcelFile(data, {
    sheet: 'البيانات',
    columns,
    rightToLeft: true,
  }).toFile(getXlsxFilename(filename));
}
