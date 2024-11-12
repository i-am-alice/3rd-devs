import Replicate from "replicate";
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const replicate = new Replicate();

const input = {
    image: "https://cloud.overment.com/Xnapper-2024-09-24-18.05.21-1727193974.png",
    query: "Alice app",
    box_threshold: 0.2,
    text_threshold: 0.2
};

async function processImage() {
  const output = await replicate.run("adirik/grounding-dino:efd10a8ddc57ea28773327e881ce95e20cc1d734c589f7dd01d2036921ed78aa", { input }) as any;

  // Define the paths relative to the script's directory
  const inputImagePath = path.join(__dirname, 'screenshot.png');
  const outputImagePath = path.join(__dirname, 'screenshot_cropped.png');
  const segmentedImagePath = path.join(__dirname, 'screenshot_segmented.png');

  // Download the image from the URL
  const downloadImage = async (url: string, filePath: string) => {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));
  };

  await downloadImage(input.image, inputImagePath);
  await downloadImage(output.result_image, segmentedImagePath);

  // Check if the input file exists
  if (!fs.existsSync(inputImagePath)) {
      console.error('Error: Input file is missing:', inputImagePath);
      process.exit(1);
  }


  // Find the bounding box with the highest confidence
  const highestConfidenceDetection = output.detections.reduce((max: any, detection: any) => 
    detection.confidence > max.confidence ? detection : max, output.detections[0]);
  const boundingBox = highestConfidenceDetection.bbox;
  // Calculate width and height from the bounding box
  const width = boundingBox[2] - boundingBox[0];
  const height = boundingBox[3] - boundingBox[1];

  // Crop the image
  try {
      await sharp(inputImagePath)
          .extract({ left: boundingBox[0], top: boundingBox[1], width: width, height: height })
          .toFile(outputImagePath);
      console.log('Image cropped and saved as', outputImagePath);
  } catch (err) {
      console.error('Error cropping image:', err);
  }
}

processImage();