import "dotenv/config";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { createCanvas } from "canvas";
import { OpenAI } from "openai";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { decode } from "base64-arraybuffer";

// For GPT Vision API
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = require("pdfjs-dist/legacy/build/pdf.worker.js");

// Helper: Convert PDF page to PNG buffer
async function pdfPageToPngBuffer(pdfBuffer: Buffer, pageNum = 1) {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
  if (pageNum > doc.numPages) throw new Error("Page number out of range");
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2.5 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");
await page.render({ canvasContext: ctx as any, viewport }).promise;  return canvas.toBuffer("image/png");
}

// Call GPT Vision to extract fields
async function extractReceiptWithGpt(imageBuffer: Buffer) {
  const prompt = `Extract the following fields from this retail receipt image:
- store (string)
- date (YYYY-MM-DD)
- amount (number)
- paymentMethod (string, if visible)
- category (string, e.g. Grocery, Dining, Fuel, Pharmacy, Electronics, etc)
- description (string, short summary)

Respond ONLY with a single valid JSON object, with no extra text, explanation, or formatting. Do NOT include code block markers, comments, or any other text.
If any field is not clear, use "Unknown" (or 0 for amount).
Example response: {"store": "Costco", "date": "2025-07-31", "amount": 135.72, "paymentMethod": "Card", "category": "Wholesale", "description": "Weekly groceries and household items"}`;

  const base64Img = imageBuffer.toString("base64");
  let gptResponse;
  let parsed: Record<string, any> = {};
  try {
    gptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/png;base64,${base64Img}` } }
          ]
        }
      ],
      temperature: 0
    });
    let content = gptResponse.choices[0].message.content || "";
    // Log raw response for debugging
    console.log("GPT raw response:", content);
    // Remove code block markers if present
    content = content.replace(/^```json\s*|^```\s*|```$/gm, "").trim();
    // Try to extract JSON object from anywhere in the response
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    let jsonStr = '';
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = content.substring(firstBrace, lastBrace + 1);
    } else {
      jsonStr = content;
    }
    try {
      parsed = JSON.parse(jsonStr);
    } catch (jsonErr) {
      console.error("Failed to parse JSON from GPT response:", jsonErr, "Raw:", content);
      parsed = {};
    }
  } catch (e) {
    const err = e as any;
    if (err.status === 429) {
      console.error("OpenAI rate limit exceeded:", err.message);
    } else {
      console.error("OpenAI error:", err.message);
    }
    parsed = {};
  }
  return {
    store: typeof parsed["store"] === "string" ? parsed["store"] : "Unknown",
    date: typeof parsed["date"] === "string" ? parsed["date"] : "Unknown",
    amount: typeof parsed["amount"] === "number" ? parsed["amount"] : 0,
    paymentMethod: typeof parsed["paymentMethod"] === "string" ? parsed["paymentMethod"] : "Unknown",
    category: typeof parsed["category"] === "string" ? parsed["category"] : "Unknown",
    description: typeof parsed["description"] === "string" ? parsed["description"] : "",
  };
}

// -------- MAIN SCRIPT ----------
// Loops all users with Google connected, and polls their Gmail for PDFs
async function main() {
  // 1. Get all users who have a Google OAuth account linked (NextAuth Account model)
  const googleAccounts = await prisma.account.findMany({
    where: { provider: "google" },
    include: { user: true }
  });

  for (const acct of googleAccounts) {
    const { refresh_token, access_token } = acct;
    if (!refresh_token) {
      console.log(`[${acct.user.email}] No refresh token found, skipping...`);
      continue;
    }
    const email = acct.user.email;
    try {
      // 2. Authorize Gmail API with fresh token
      const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      // Set initial credentials
      oAuth2Client.setCredentials({ 
        refresh_token,
        access_token 
      });

      // Get a fresh access token
      console.log(`[${email}] Refreshing access token...`);
      const { credentials } = await oAuth2Client.refreshAccessToken();
      const freshAccessToken = credentials.access_token;
      
      if (!freshAccessToken) {
      console.log(`[${email}] Failed to get fresh access token`);
        continue;
      }

      // Set the fresh credentials
      oAuth2Client.setCredentials({ 
        access_token: freshAccessToken,
        refresh_token: refresh_token 
      });

      console.log(`[${email}] Access token refreshed successfully`);
      const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

      // 3. Search for unread emails with PDF attachments since yesterday
      const query = "has:attachment filename:pdf newer_than:1d is:unread";
      console.log(`[${email}] Searching for emails with query: ${query}`);
      
      const listRes = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 10
      });
      
      const messages = listRes.data.messages || [];
      console.log(`[${email}] Found ${messages.length} messages to process`);

      for (const msg of messages) {
        console.log(`[${email}] Processing message: ${msg.id}`);
        const msgDetail = await gmail.users.messages.get({ userId: "me", id: msg.id! });
        const parts = msgDetail.data.payload?.parts || [];
        
        for (const part of parts) {
          // Find PDF attachments
          if (
            part.filename &&
            part.filename.toLowerCase().endsWith(".pdf") &&
            part.body?.attachmentId
          ) {
            console.log(`[${email}] Processing PDF attachment: ${part.filename}`);
            
            // Download the attachment
            const att = await gmail.users.messages.attachments.get({
              userId: "me",
              messageId: msg.id!,
              id: part.body.attachmentId
            });
            
            const data = att.data.data;
            if (!data) continue;
            
            // Gmail API returns base64url, need to decode
            const pdfBuffer = Buffer.from(data, "base64");
            
            // For each page in PDF, process
            const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
            console.log(`[${email}] PDF has ${doc.numPages} pages`);
            
            for (let i = 1; i <= doc.numPages; ++i) {
              try {
                const imageBuffer = await pdfPageToPngBuffer(pdfBuffer, i);
                const result = await extractReceiptWithGpt(imageBuffer);
                const {
                  store = "Unknown",
                  date = "Unknown",
                  amount = 0,
                  paymentMethod = "Unknown",
                  category = "Unknown",
                  description = ""
                } = result;

                // Case logic for extraction
                const hasStore = store !== "Unknown" && store.trim() !== "";
                const hasDate = date !== "Unknown" && date.trim() !== "";
                const hasAmount = typeof amount === "number" && amount > 0;

                if (!hasStore && !hasDate && !hasAmount) {
                  // Case 3: Not a receipt
                  await prisma.ingestLog.create({
                    data: {
                      status: "not_receipt",
                      message: `File ${part.filename} is not a receipt (page ${i})`,
                      fileName: part.filename
                    }
                  });
                  console.log(`[${email}] File ${part.filename} on page ${i} is not a receipt.`);
                } else {
                  let parsedDate = new Date();
                  if (hasDate && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    parsedDate = new Date(date);
                  }
                  const ledger = await prisma.ledger.create({
                    data: {
                      date: parsedDate,
                      merchant: hasStore ? store : "Unknown",
                      amount: hasAmount ? amount : 0,
                      description: description || "",
                      paymentMethod: paymentMethod || "Unknown",
                      category: category || "Unknown",
                    }
                  });
                  if (hasStore && hasDate && hasAmount) {
                    // Case 1: All 3 found
                    await prisma.ingestLog.create({
                      data: {
                        status: "success",
                        message: `Parsed receipt for ${store} on page ${i}`,
                        fileName: part.filename,
                        ledgerId: ledger.id,
                      }
                    });
                    console.log(`[${email}] Successfully processed page ${i} for ${store}`);
                  } else {
                    // Case 2: Partial extraction
                    await prisma.ingestLog.create({
                      data: {
                        status: "partial",
                        message: `Partially extracted receipt for ${part.filename} (page ${i}): store=${hasStore ? store : 'Unknown'}, date=${hasDate ? date : 'Unknown'}, amount=${hasAmount ? amount : 0}`,
                        fileName: part.filename,
                        ledgerId: ledger.id,
                      }
                    });
                    console.log(`[${email}] Partially processed page ${i} for ${part.filename}`);
                  }
                }
              } catch (e) {
                console.log(`[${email}] Error processing page ${i}:`, e);
                await prisma.ingestLog.create({
                  data: {
                    status: "error",
                    message: `Failed to extract page ${i}: ${e}`,
                    fileName: part.filename
                  }
                });
              }
            }
          }
        }
        
        // Mark message as read
        try {
          await gmail.users.messages.modify({
            userId: "me",
            id: msg.id!,
            requestBody: { removeLabelIds: ["UNREAD"] }
          });
          console.log(`[${email}] Marked message ${msg.id} as read`);
        } catch (e) {
          console.log(`[${email}] Failed to mark message as read:`, e);
        }
      }
      
      console.log(`[${email}] Gmail poller finished successfully.`);
    } catch (err) {
      console.error(`[${email}] Gmail poller error:`, err);
      
      // Log the error to database
      await prisma.ingestLog.create({
        data: {
          status: "error",
          message: `Gmail poller error: ${err}`,
          fileName: null
        }
      });
    }
  }
}

// Poll forever for all users with Gmail connected
async function pollLoop() {
  while (true) {
    try {
      await main();
    } catch (err) {
      console.error("Poll error:", err);
    }
    await new Promise(res => setTimeout(res, 2 * 60 * 1000));
  }
}

// API endpoint handler
export async function GET(req: Request) {
  // ...existing code...
}

// Run main() once if executed directly
if (require.main === module) {
  main();
}