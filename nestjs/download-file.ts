import { Controller, Get, Put, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as xlsx from 'xlsx';

@Controller('download')
export class DownloadController {
  @Get('/')
  download(@Res() res: Response) {
    const data = [
      {
        name: 'John',
        title: 'EM',
      },
      {
        name: 'Jane',
        title: 'SDE',
      },
    ];

    const workSheet = xlsx.utils.json_to_sheet(data);
    const workBook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workBook, workSheet, 'Sheet 1');

    const buf = xlsx.write(workBook, {
      type: 'buffer',
    });

    const filename = `your-file-name.xlsx`;
    res.setHeader(
      'Content-Type',
      `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet=${filename}`,
    );
    res.attachment(filename);
    res.send(buf);
  }
}
