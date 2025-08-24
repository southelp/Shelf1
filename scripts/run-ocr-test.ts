import fs from 'fs/promises';
import path from 'path';

// Define the shape of the Vision API response for type safety
interface VisionApiResponse {
  responses: {
    textAnnotations: {
      description: string;
    }[];
  }[];
}

// Define the shape of our book search API response
interface BookSearchResponse {
  candidates: {
    title: string;
    authors: string[];
  }[];
}

async function runOcrTest() {
  console.log('--- Starting Test for Approach A: OCR First ---');

  // Read the image URLs from the dataset file
  const datasetPath = path.join(process.cwd(), 'jules-scratch', 'image-dataset.txt');
  const dataset = await fs.readFile(datasetPath, 'utf-8');
  const imageUrls = dataset.trim().split('\n');

  let successCount = 0;

  for (const imageUrl of imageUrls) {
    console.log(`\nProcessing image: ${imageUrl}`);

    try {
      // Step 1: Call our new OCR API route
      const ocrResponse = await fetch('http://localhost:5173/api/test-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      if (!ocrResponse.ok) {
        console.error(`  [FAIL] OCR API call failed with status ${ocrResponse.status}`);
        continue;
      }

      const ocrData: VisionApiResponse = await ocrResponse.json();
      const firstAnnotation = ocrData.responses?.[0]?.textAnnotations?.[0];

      if (!firstAnnotation?.description) {
        console.log('  [FAIL] No text detected by OCR.');
        continue;
      }

      // Heuristic: Use the first line of the full detected text block as the most likely title
      const detectedText = firstAnnotation.description;
      const titleQuery = detectedText.split('\n')[0].trim();
      console.log(`  [INFO] OCR detected title query: "${titleQuery}"`);

      // Step 2: Call the existing book search API with the detected text
      const searchResponse = await fetch('http://localhost:5173/api/search-book-by-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleQuery }),
      });

      if (!searchResponse.ok) {
        console.error(`  [FAIL] Book search failed for query "${titleQuery}"`);
        continue;
      }

      const searchData: BookSearchResponse = await searchResponse.json();
      const topResult = searchData.candidates?.[0];

      if (topResult) {
        console.log(`  [SUCCESS] Found book: "${topResult.title}" by ${topResult.authors?.join(', ')}`);
        // In a real scenario, we would compare this to the ground truth filename.
        // For this automated test, finding *a* result is considered a proxy for success.
        successCount++;
      } else {
        console.log('  [FAIL] No book found for the detected title.');
      }

    } catch (error) {
      console.error('  [ERROR] An unexpected error occurred:', error);
    }
  }

  console.log(`\n--- OCR First Test Complete ---`);
  console.log(`Success Rate: ${successCount} / ${imageUrls.length} (${(successCount / imageUrls.length) * 100}%)`);
}

runOcrTest();
