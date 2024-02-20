import fetch from 'node-fetch';
import fs from 'fs';
import stream from 'stream';
import unzipper from 'unzipper';
import { promisify } from 'util';

const pipeline = promisify(stream.pipeline);
import { GetObjectCommand, S3, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PassThrough } from 'node:stream';
import { Upload } from '@aws-sdk/lib-storage';
import archiver from 'archiver';

const AWS_S3_BUCKET = 'dev-scaffolder-workspace-bucket';

// TODO: Just directly download using unzipper.Open
// TODO: Remove the S3 object
export async function downloadFile(url: string, path: string) {
  console.log(`Fetching workspace from URL ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    console.error(await response.text());
  }
  await pipeline(response.body, fs.createWriteStream(`${path}.zip`));

  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true })
  }

  fs.createReadStream(`${path}.zip`)
    .pipe(unzipper.Extract({ path }));

  console.log('File downloaded successfully');
}

function getWritableStreamFromS3(zipFileS3Key: string) {
  const passThroughStream = new PassThrough();
  const s3 = new S3({});
  void new Upload({
    client: s3,
    params: {
      Bucket: AWS_S3_BUCKET,
      Key: zipFileS3Key,
      Body: passThroughStream,
    },
  }).done();
  return passThroughStream;
}

export async function generatePresignedURLforZip(zipFileS3Key: string) {
  console.log('Generating Presigned URL for the zip file.');
  const client = new S3Client({});
  const command = new GetObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: zipFileS3Key,
  });
  return await getSignedUrl(client, command, {
    expiresIn: 24 * 3600,
  });
}

// TODO: use a presigned URL received from the tenant
export async function generateAndStreamZipfileToS3(
  workspacePath: string,
  zipFileS3Key: string,
) {
  try {
    const s3WritableStream = getWritableStreamFromS3(zipFileS3Key);
    const archive = archiver('zip');
    archive.pipe(s3WritableStream);
    archive.directory(workspacePath, false);
    await archive.finalize();
    return generatePresignedURLforZip(zipFileS3Key);
  } catch (error: any) {
    console.log(`Error in generateAndStreamZipfileToS3 ::: ${error.message}`);
    return undefined;
  }
}
