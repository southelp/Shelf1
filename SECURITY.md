
# Security Measures

This document outlines the security measures implemented to protect the application and its users.

## 1. Gemini API Protection

**Problem:** The application was previously making direct calls to the Gemini API from the client-side. This exposed the API endpoints to the public, allowing unauthorized users to discover and abuse them, leading to quota exhaustion and potential security risks.

**Solution:** A proxy pattern has been implemented to protect the Gemini API.

- **Proxy Endpoint:** A single server-side endpoint, `api/book-ai.ts`, now acts as a proxy between the client and the Gemini API.
- **Client-side:** The client-side code no longer calls the Gemini API directly. Instead, it makes a request to the `api/book-ai.ts` endpoint with the required action and payload.
- **Server-side:** The `api/book-ai.ts` endpoint receives the request, validates it, and then makes the actual call to the Gemini API using the server-side API key. This ensures that the Gemini API key and the actual API endpoint are never exposed to the client.

## 2. User Authentication

**Problem:** The AI features were accessible to anyone, including unauthenticated users. This could lead to abuse and unnecessary costs.

**Solution:** User authentication has been added to the `api/book-ai.ts` endpoint.

- **Supabase Authentication:** The endpoint now uses Supabase server-side authentication to verify the user's session.
- **Authorization Header:** The client-side code sends the user's Supabase access token in the `Authorization` header of the request.
- **Session Verification:** The server-side code verifies the access token to ensure that the request is coming from a logged-in user. If the user is not authenticated, the request is rejected with a 401 Unauthorized error.

## 3. Rate Limiting

**Problem:** A malicious user could still abuse the API by sending a large number of requests in a short period, even if they are authenticated.

**Solution:** A simple in-memory rate limiter has been implemented on the `api/book-ai.ts` endpoint.

- **Request Throttling:** The rate limiter tracks the number of requests per user.
- **Limit:** Each user is limited to 10 requests per minute.
- **Error:** If a user exceeds the limit, the request is rejected with a 429 Too Many Requests error.

These security measures help to protect the application from abuse, ensure that only authorized users can access the AI features, and prevent excessive usage of the Gemini API.
