import { Controller, Get, Injectable, Res } from '@nestjs/common';
import { Response } from 'express';
import * as xlsx from 'xlsx';

// utility to download json as excel from controller
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

// sample controller
@Controller('download')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  @Get('/json')
  async download(@Res() res: Response) {
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
    return downloadJsonAsExcelFile(data, 'your-filename.xlsx', res);
  }
}

// util to parse downloaded file to json
export async function getExcelFromServerDownload(
  server: HttpServer,
  opts: {
    url: string;
    method: 'get' | 'post';
    headers: any;
  },
) {
  const { url, method, headers } = opts;
  const response = await request(server)
    [method](url)
    .buffer()
    .parse((res, callback) => {
      res.setEncoding('binary');
      (res as any).data = '';
      res.on('data', (chunk) => {
        (res as any).data += chunk;
      });
      res.on('end', () => {
        callback(null, Buffer.from((res as any).data, 'binary'));
      });
    })
    .set(headers);

  const data = XLSX.read(response.body, {
    type: 'buffer',
  });

  const json = XLSX.utils.sheet_to_json(data.Sheets[data.SheetNames[0]]);

  return json;
}


// e2e test case
describe('Test Download', () => {
  let server;
  
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, HttpModule],
      providers: [IntegrationTestUtils],
    }).compile();

    const app = moduleFixture.createNestApplication();

    server = app.getHttpServer();
  })
  
  it('should download the file', async () => {
    const response = await getExcelFromServerDownload(server, {
      url: '/download/json',
      method: 'get',
    });
    expect(response).toEqual([
      {
        name: 'John',
        title: 'EM',
      },
      {
        name: 'Jane',
        title: 'SDE',
      },
    ]);
  });
})
