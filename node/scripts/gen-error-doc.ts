import { CLIENT_ERRORS } from '../src/common/error-constants';

function _markdownTableRow(data: any) {
  const formatted = data.join('|');
  return `|${formatted}|\n`;
}

function printMarkdownTable() {
  const headers = ['errorCode', 'message'];

  let markdownTable = '';
  markdownTable += _markdownTableRow(headers.map((h) => h.padEnd(14)));
  markdownTable += _markdownTableRow(headers.map((_h) => ':---')); // left aligned

  Object.keys(CLIENT_ERRORS).forEach((key) => {
    const row = (CLIENT_ERRORS as any)[key] as any;
    markdownTable += _markdownTableRow(headers.map((h) => row[h as any]));
  });

  console.log(markdownTable);
}

printMarkdownTable();
