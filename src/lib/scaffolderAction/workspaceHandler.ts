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

  logger.info(`Fetching workspace from URL ${url} (attempt ${attempts + 1}/6)`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.info('Failed to get workspace. ');
      logger.error(await response.text());
      logger.info('Retrying in 4 seconds.');
      await new Promise((resolve) => setTimeout(resolve, 4321));
      return await downloadFile(url, path, attempts + 1);
    }

    // Ensure directory exists
    await fs.ensureDir(path);

    const zipPath = `${path}.zip`;

    // Download the file with proper error handling
    await pipeline(response.body, fs.createWriteStream(zipPath));

    // Verify file exists and has content
    const stats = await fs.stat(zipPath);
    if (stats.size === 0) {
      logger.warn('Downloaded file is empty, retrying...');
      await fs.remove(zipPath);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return await downloadFile(url, path, attempts + 1);
    }

    logger.info(`Downloaded file size: ${stats.size} bytes`);

    // Extract with proper promise handling and error catching
    await new Promise<void>((resolve, reject) => {
      const extractStream = unzipper.Extract({ path: path });

      extractStream.on('error', (err) => {
        logger.error('Extraction failed:', err);
        reject(new Error(`Failed to extract ZIP file: ${err.message}`));
      });

      extractStream.on('close', () => {
        logger.info('File extracted successfully');
        resolve();
      });

      // Add timeout for extraction
      const timeout = setTimeout(() => {
        reject(new Error('Extraction timeout - file may be corrupted'));
      }, 60000); // 60 second timeout

      extractStream.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });

      const readStream = fs.createReadStream(zipPath);
      readStream.on('error', (err) => {
        logger.error('Read stream error:', err);
        reject(new Error(`Failed to read ZIP file: ${err.message}`));
      });

      readStream.pipe(extractStream);
    });

    // Clean up the zip file after successful extraction
    await fs.remove(zipPath);

    // Verify extraction was successful by checking if directory has content
    const extractedFiles = await fs.readdir(path);
    if (extractedFiles.length === 0) {
      throw new Error('Extraction completed but no files were extracted');
    }

    logger.info(
      `File downloaded and extracted successfully. Extracted ${extractedFiles.length} items.`,
    );
    return undefined;
  } catch (error: any) {
    logger.error(`Download attempt ${attempts + 1} failed:`, error);

    // Clean up any partial files
    try {
      await fs.remove(`${path}.zip`);
      await fs.remove(path);
    } catch (cleanupError) {
      logger.warn('Failed to cleanup partial files:', cleanupError);
    }

    if (attempts >= 5) {
      throw error;
    }

    // Wait before retry with exponential backoff
    const delay = Math.min(4321 * Math.pow(1.5, attempts), 30000);
    logger.info(`Retrying in ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));

    return await downloadFile(url, path, attempts + 1);
  }
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

    // AWS S3 produces etags that are wrapped in `"`. It's implemented according to spec and will never change
    // See: for example https://github.com/aws/aws-sdk-net/issues/815
    const etag = (response?.headers?.etag as string)?.replaceAll('"', '');
    logger.info(etag);
    return etag;
  } catch (error: any) {
    logger.info(`Error in generateAndStreamZipfileToS3 ::: ${error.message}`);
    return undefined;
  }
}
