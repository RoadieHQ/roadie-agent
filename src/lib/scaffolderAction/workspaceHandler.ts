import fetch from 'node-fetch';
import fs from 'fs-extra';
import stream from 'stream';
import unzipper from 'unzipper';
import { promisify } from 'util';
import archiver from 'archiver';
import { getLogger } from '@/logger';
import * as https from 'https';

const pipeline = promisify(stream.pipeline);
const logger = getLogger('workspaceHandler');

export async function downloadFile(
  url: string,
  path: string,
  attempts = 0,
): Promise<any> {
  if (attempts > 5) {
    throw new Error('Failed to download workspace from dedicated URL. ');
  }

  logger.info(`Fetching workspace from URL ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    logger.info('Failed to get workspace. ');
    logger.error(await response.text());
    logger.info('Retrying in 4 seconds.');
    await new Promise((resolve) => setTimeout(resolve, 4321));
    return await downloadFile(url, path, attempts++);
  }
  await fs.ensureDir(path);
  await pipeline(response.body, fs.createWriteStream(`${path}.zip`));
  fs.createReadStream(`${path}.zip`).pipe(unzipper.Extract({ path: path }));

  logger.info('File downloaded successfully');
  return undefined;
}

function zipDirectory(sourceDir: string, outPath: string) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const stream = fs.createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on('error', (err) => reject(err))
      .pipe(stream);

    stream.on('close', () => resolve('Zipped successfully'));
    void archive.finalize();
  });
}

async function uploadWorkspace(
  url: string,
  workspacePath: string,
): Promise<{
  body: any;
  statusCode?: number;
  headers?: Record<string, string | string[] | undefined>;
}> {
  const fileBuffer = fs.readFileSync(workspacePath);
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'PUT',
        headers: { 'Content-Length': new Blob([fileBuffer]).size },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          resolve({
            body: responseBody,
            statusCode: res.statusCode,
            headers: res.headers,
          });
        });
      },
    );
    req.on('error', (err) => {
      reject(err);
    });
    req.write(fileBuffer);
    req.end();
  });
}

export async function generateAndStreamZipfileToS3(
  putPresignUrl: string,
  workspacePath: string,
) {
  try {
    await zipDirectory(workspacePath, `${workspacePath}.zip`);
    logger.info('Uploading zip to S3');
    const response = await uploadWorkspace(
      putPresignUrl,
      `${workspacePath}.zip`,
    );

    logger.info('File uploaded');
    const etag = (response?.headers?.etag as string)?.replaceAll('"', '');
    logger.info(etag);
    return etag;
  } catch (error: any) {
    logger.info(`Error in generateAndStreamZipfileToS3 ::: ${error.message}`);
    return undefined;
  }
}
