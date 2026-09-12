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
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('البيانات', {
    views: [{ rightToLeft: true }]
  });
  worksheet.addRows(rows.map((row) => row.map(normalizeExcelValue)));

  for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex += 1) {
    const column = worksheet.getColumn(columnIndex);
    let width = 10;
    column.eachCell({ includeEmpty: false }, (cell) => {
      width = Math.max(width, String(cell.value ?? '').length + 2);
    });
    column.width = Math.min(width, 45);
    column.alignment = { horizontal: 'right', vertical: 'middle' };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = getXlsxFilename(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
