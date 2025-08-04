import "dotenv/config";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { createCanvas } from "canvas";
import { OpenAI } from "openai";
import { prisma } from "../lib/prisma";
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
  const prompt = `
Extract the following fields from this retail receipt:
- Store Name
- Transaction Date (YYYY-MM-DD)
- Total Amount
- Payment Method (if visible)
- Category (eg. Grocery, Dining, Fuel, Pharmacy, Electronics, etc)
- Description (short summary of the receipt, if possible)

Respond ONLY as JSON, e.g.:
{"store": "Costco", "date": "2025-07-31", "amount": 135.72, "paymentMethod": "Card", "category": "Wholesale", "description": "Weekly groceries and household items"}

If any field is not clear, write "Unknown" (or 0 for amount).
DO NOT invent information.
`;

  const base64Img = imageBuffer.toString("base64");
  const gptResponse = await openai.chat.completions.create({
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

  let parsed: any = {};
  try {
    const content = gptResponse.choices[0].message.content || "";
    const match = content.match(/```json\s*([\s\S]+?)```/i);
    const jsonStr = match ? match[1] : content;
    parsed = JSON.parse(jsonStr);
  } catch (e) {
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

// Get yesterday's date in RFC 3339 format for Gmail API search
function getYesterdayGmailQuery() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
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
      const query = `has:attachment filename:pdf newer_than:1d is:unread`;
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

                let parsedDate = new Date();
                if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                  parsedDate = new Date(date);
                }

                const ledger = await prisma.ledger.create({
                  data: {
                    date: parsedDate,
                    merchant: store || "Unknown",
                    amount: typeof amount === "number" && !isNaN(amount) ? amount : 0,
                    description: description || "",
                    paymentMethod: paymentMethod || "Unknown",
                    category: category || "Unknown",
                  }
                });

                await prisma.ingestLog.create({
                  data: {
                    status: "success",
                    message: `Parsed receipt for ${store || "Unknown"} on page ${i}`,
                    fileName: part.filename,
                    ledgerId: ledger.id,
                  }
                });
                
                console.log(`[${email}] Successfully processed page ${i} for ${store}`);
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
pollLoop();
