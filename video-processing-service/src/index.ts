import express from 'express';
import ffmpeg from 'fluent-ffmpeg';

import {
  uploadProcessedVideo,
  downloadRawVideo,
  deleteRawVideo,
  deleteProcessedVideo,
  convertVideo,
  setupDirectories
} from './storage';

// Create directories for videos (local)
setupDirectories();

const app = express();
app.use(express.json());

app.post('/process-video', async (req, res) => {

  // get bucket and filename from cloud pub/sub message
  let data;
  try {
    const message = Buffer.from(req.body.message.data, 'base64').toString('utf8');
    data = JSON.parse(message);
    if (!data.name) {
      throw new Error('invalid message payload received.');
    }
  } catch (error) {
    console.error(error);
    res.status(400).send('bad request: missing filename.')
    return
  }

  const inputFileName = data.name;
  const outputFileName = `processed-${inputFileName}`;

  // download raw video from cloud storage
  await downloadRawVideo(inputFileName);

  // convert video into 360p
  try {
    await convertVideo(inputFileName, outputFileName);
  } catch (err) {
    await Promise.all([
      deleteRawVideo(inputFileName),
      deleteProcessedVideo(inputFileName)
    ]);
    res.status(500).send('processing failed');
    return
  }

  // upload video to the cloud
  await uploadProcessedVideo(outputFileName);

  // clean up local
  await Promise.all([
    deleteRawVideo(inputFileName),
    deleteProcessedVideo(outputFileName)
  ]);

  res.status(200).send('processing finished successfully');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
})
