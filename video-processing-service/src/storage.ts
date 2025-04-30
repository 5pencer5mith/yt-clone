import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

const storage = new Storage();

const rawVideoBucketName = "5p3nc3r-ytc-raw-videos"
const processedVideoBucketName = "5p3nc3r-ytc-processed-videos"

const localRawVideoPath = "./raw-videos"
const localProcessedVideoPath = "./processed-videos"

/**
 * creates local directories for all videos (raw and processed)
 */
export function setupDirectories() {
  ensureDirectoryExistence(localRawVideoPath);
  ensureDirectoryExistence(localProcessedVideoPath);
}

/**
 * @param rawVideoName - The name of the file to convert from {@link localRawVideoPath}.
 * @param processedVideoName - The name of the file to convert to {@link localProcessedVideoPath}.
 * @returns A promise that resovles when the video as been converted.
 */
export function convertVideo(rawVideoName: string, processedVideoName: string) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
      .outputOptions("-vf", "scale=-1:360") // conversion to 360p
      .on("end", function () {
        console.log("Processing finished successfully");
        resolve();
      })
      .on("error", function (err: any) {
        console.log("an error occurred: " + err.message);
        reject(err);
      })
      .save(`${localProcessedVideoPath}/${processedVideoName}`);
  });
}

/**
 * @param fileName - the name of the file to download from {@link rawVideoBucketName} bucket to the {@link localRawVideoPath} folder.
 * @returns a promise that resolves when the file has been downloaded
 */
export async function downloadRawVideo(fileName: string) {
  await storage.bucket(rawVideoBucketName)
  .file(fileName)
  .download({
    destination: `${localRawVideoPath}/${fileName}`,
  });

  console.log(
    `gs://${rawVideoBucketName}/${fileName} downloaded to ${localRawVideoPath}/${fileName}.`
  );
}

/**
 * @param fileName - the name of the file to upload from the 
 * {@link localProcessedVideoPath} folder into the {@link processedVideoBucketName}.
 * @returns a promise that resolves when the file has been uploaded
 */

export async function uploadProcessedVideo(fileName: string) {
  const bucket = storage.bucket(processedVideoBucketName);

  // upload video to the bucket
  await storage.bucket(processedVideoBucketName)
    .upload(`${localProcessedVideoPath}/${fileName}`, {
      destination: fileName,
    });
    
    console.log(
      `${localProcessedVideoPath}/${fileName} uploaded to gs://${processedVideoBucketName}/${fileName}.`
    );

    // Make the video publically readable 
    await bucket.file(fileName).makePublic();
}

/**
 * @param fileName - the name of the file to be deleted from the 
 * {@link localRawVideoPath} folder.
 * @returns a promise that resovles when the file has been deleted 
 */
export function deleteRawVideo(fileName: string) {
  return deleteFile(`${localRawVideoPath}/${fileName}`)
}

/**
 * @param fileName - name of the file to be deleted from the 
 * {@link localProcessedVideoPath} folder.
 * @returns a promise that resolves when the file has been deleted.
 */
export function deleteProcessedVideo(fileName: string) {
  return deleteFile(`${localProcessedVideoPath}/${fileName}`)
}

/**
 * @param filePath - path of the file to be deleted
 * @returns a promise that resolves when the file has been deleted
 */
function deleteFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`failed to delete file at ${filePath}`, err);
          reject(err);
        } else {
          console.log(`file deleted at ${filePath}`);
          resolve();
        }
      });
    } else {
      console.log(`file not found at ${filePath}, skipping delete.`)
      resolve();
    }
  });
}

function ensureDirectoryExistence(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true }); // recursive = true allows nested directories
    console.log(`Directory created at ${dirPath}`);
  }
}