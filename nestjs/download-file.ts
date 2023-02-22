import { Controller, Get, Injectable, Res } from '@nestjs/common';
import { Response } from 'express';
import * as xlsx from 'xlsx';

function downloadJsonAsExcelFile(
  jsonData: any[],
  fileName: string,
  res: Response,
) {
  const workSheet = xlsx.utils.json_to_sheet(jsonData);
  const workBook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workBook, workSheet, 'Sheet 1');

  const buf = xlsx.write(workBook, {
    type: 'buffer',
  });

  res.setHeader(
    'Content-Type',
    `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet=${fileName}`,
  );
  res.attachment(fileName);
  res.send(buf);
}

@Injectable()
export class DownloadService {
  async getData() {
    return [
      {
        name: 'John',
        title: 'EM',
      },
      {
        name: 'Jane',
        title: 'SDE',
      },
    ];
  }
}

@Controller('download')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  @Get('/')
  async download(@Res() res: Response) {
    const data = await this.downloadService.getData();
    return downloadJsonAsExcelFile(data, 'your-filename.xlsx', res);
  }
}
