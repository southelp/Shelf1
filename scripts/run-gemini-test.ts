import fs from 'fs/promises';
import path from 'path';

// Define the shape of our Gemini API response
interface GeminiResponse {
  title: string;
  author?: string;
}

// Define the shape of our book search API response
interface BookSearchResponse {
  candidates: {
    title: string;
    authors: string[];
  }[];
}

async function runGeminiTest() {
  console.log('--- Starting Test for Approach B: Advanced Gemini Prompt ---');

  // Read the image URLs from the dataset file
  const datasetPath = path.join(process.cwd(), 'jules-scratch', 'image-dataset.txt');
  const dataset = await fs.readFile(datasetPath, 'utf-8');
  const imageUrls = dataset.trim().split('\n');

  let successCount = 0;

  for (const imageUrl of imageUrls) {
    console.log(`\nProcessing image: ${imageUrl}`);

    try {
      // Step 1: Fetch the image and convert it to base64
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');

      // Step 2: Call our new advanced Gemini API route with the base64 data
      const geminiResponse = await fetch('http://localhost:5173/api/test-gemini-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error(`  [FAIL] Advanced Gemini API call failed with status ${geminiResponse.status}. Details: ${errorText}`);
        continue;
      }

      const geminiData: GeminiResponse = await geminiResponse.json();
      const titleQuery = geminiData.title;

      if (!titleQuery) {
        console.log('  [FAIL] No title detected by Gemini.');
        continue;
      }

      console.log(`  [INFO] Gemini detected title query: "${titleQuery}"`);

      // Step 2: Call the existing book search API with the detected title
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
        successCount++;
      } else {
        console.log('  [FAIL] No book found for the detected title.');
      }

    } catch (error) {
      console.error('  [ERROR] An unexpected error occurred:', error);
    }
  }

  console.log(`\n--- Advanced Gemini Test Complete ---`);
  console.log(`Success Rate: ${successCount} / ${imageUrls.length} (${(successCount / imageUrls.length) * 100}%)`);
}

runGeminiTest();
