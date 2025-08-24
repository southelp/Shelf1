# Book Cover Recognition Performance Analysis

## 1. Task Goal
The goal of this task was to research, test, and recommend an improved technical approach for recognizing book titles from cover images, specifically for challenging Korean-language books where the existing "Gemini title estimation" method fails.

## 2. Methodology
The plan was to investigate three distinct approaches, implement a test harness for each, and measure their success rate against a dataset of challenging book cover images.

- **Approach A: OCR First:** Use a dedicated OCR engine (Google Cloud Vision) to extract all text from the cover, then use that text to search for the book.
- **Approach B: Advanced Gemini Prompting:** Refine the prompt sent to the Gemini 1.5 Flash model to be more specific about the desired output (main title only, prioritized list).
- **Approach C: Multimodal Search:** Use an image search engine (Google Custom Search) to perform a "reverse image search" and find the book directly from the cover image.

## 3. Findings & Results

A quantitative comparison of the success rates was **not possible** due to persistent technical and configuration issues with the provided API keys and project setup. However, a thorough investigation into the feasibility and implementation of each approach was completed.

### Approach A: OCR First (Blocked)

- **Research:** The Google Cloud Vision REST API was researched. The correct endpoint for `TEXT_DETECTION` was identified, along with the required JSON request and response structure.
- **Implementation:** A new API route (`/api/test-ocr`) was created to handle the request to the Vision API. A test script (`/scripts/run-ocr-test.ts`) was written to automate the testing process.
- **Result:** This approach was **blocked**. Every attempt to call the Vision API resulted in a `404 Not Found` error.
- **Debugging Steps Taken:**
    1.  Called the global endpoint `https://vision.googleapis.com/v1/images:annotate`. Result: `404`.
    2.  Added the `PROJECT_ID` to the URL path. Result: `404`.
    3.  Added the `PROJECT_ID` as an `X-Goog-User-Project` header. Result: `404`.
    4.  Switched to a regional endpoint (`us-vision.googleapis.com`). Result: `404`.
- **Conclusion:** The persistent `404` error across all documented endpoint variations strongly suggests an issue with the Google Cloud project configuration or the API key's permissions, which cannot be resolved from the development environment.

### Approach B: Advanced Gemini Prompting (Blocked)

- **Implementation:** A new API route (`/api/test-gemini-advanced`) was created with the user's suggested advanced prompt and a modified response schema to handle a prioritized list of titles. A corresponding test script (`/scripts/run-gemini-test.ts`) was also created.
- **Result:** This approach was also **blocked**. Every attempt to call the Gemini API endpoint (`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`) resulted in a `404 Not Found` error.
- **Debugging Steps Taken:**
    1.  Isolated the API call by refactoring the test script to send a base64 image directly, ruling out any server-side image fetching issues. Result: `404`.
    2.  Reverted the prompt and response schema back to the original, known-working format from the existing application to ensure the endpoint was reachable at all. Result: `404`.
- **Conclusion:** As with the Vision API, this failure points to a probable configuration or permissions issue with the provided `GEMINI_API_KEY`.

### Approach C: Multimodal Search (Not Feasible)

- **Research:** The Google Custom Search JSON API was researched to determine its "search by image" capabilities.
- **Result:** This approach is **not technically feasible**.
- **Justification:** The official Google documentation and developer blogs confirm that the dedicated Google Image Search API was deprecated in 2011. The recommended alternative, the Custom Search JSON API, does **not** support reverse image search. It can be configured to return image results, but the search query itself must be text-based. This does not solve the core problem of identifying a book from an image alone.

## 4. Final Recommendation

While a performance-based recommendation is not possible, based on this technical investigation, the following conclusions can be drawn:

1.  **Abandon Approach C:** The underlying API functionality required for this approach does not exist in the Google Custom Search API. This path should be abandoned.

2.  **Pursue Approaches A and B:** Both the OCR-first and the advanced Gemini prompt methods remain the most promising solutions. The infrastructure to test both has been built and added to the repository in the `api/` and `scripts/` directories. **The immediate next step must be to resolve the API key and Google Cloud project configuration issues.**

3.  **Suggested Path Forward (Once unblocked):**
    *   A **hybrid approach** is likely to be most effective.
    *   **First Pass (Approach B):** Use the advanced Gemini prompt. It is fast and cheap, and when it works, it directly provides the desired information (the title).
    *   **Fallback (Approach A):** If Gemini fails or returns a low-confidence result, fall back to the more robust (but potentially more complex) OCR-first approach. Extracting all text with a powerful engine like Google Cloud Vision and then using heuristics or another LLM call to determine the most likely title from that text is a very strong, albeit more involved, strategy.

The new files (`api/test-*.ts`, `scripts/run-*.ts`) provide a ready-made testbed for these approaches once the external API access is fixed.
