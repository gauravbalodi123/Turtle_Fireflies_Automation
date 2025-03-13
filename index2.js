const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const axios = require("axios");
require("dotenv").config();
const router = express.Router();
router.use(bodyParser.json());
// const { createTableAndAddData } = require('./google');
const { fetchCompleteFinalData } = require("./vertexAI");

// ✅ Import Notion functions (Only Added This)
const { findNotionClientByEmail, updateNotionDate } = require("./dateFromFirefliesToNotion");

const FIRELIES_WEBHOOK_SECRET = process.env.FIRELIES_WEBHOOK_SECRET;
const FIRELIES_API_KEY = process.env.FIRELIES_API_KEY;

const url = "https://api.fireflies.ai/graphql";
const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${FIRELIES_API_KEY}`,
};

let storedTranscript = {}; // Modifiable variable

// Endpoint to receive webhook
router.post("/fireflies-webhook", async (req, res) => {
    const signature = req.headers["x-hub-signature"];
    if (!signature) return res.status(400).send("Missing signature header");

    const payload = JSON.stringify(req.body);
    const hash = "sha256=" + crypto.createHmac("sha256", FIRELIES_WEBHOOK_SECRET).update(payload).digest("hex");

    if (signature !== hash) return res.status(401).send("Invalid signature");

    const { meetingId, eventType } = req.body;
    if (eventType === "Transcription completed") {
        try {
            const transcript = await fetchTranscriptData(meetingId);
            storedTranscript = transcript;
            await fetchCompleteFinalData(storedTranscript);

            // ✅ Notion Update (Only Added This)

            const date = transcript.transcripts[0].date || null;
            const participants = transcript.transcripts[0].meeting_attendees || [];

            if (date && participants.length > 0) {
                for (const participant of participants) {
                    if (!participant.email) continue;

                    console.log(`🔍 Searching Notion for: ${participant.email}`);
                    const pageId = await findNotionClientByEmail(participant.email);

                    if (pageId) {
                        console.log(`✅ Found Notion Page for ${participant.email}. Updating Date...`);
                        await updateNotionDate(pageId, date);
                    } else {
                        console.log(`❌ No Notion client found for ${participant.email}`);
                    }

                    // Add a small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            }
            else{
                console.log("Meeting attendies not present");
            }
        } catch (error) {
            console.error("Error fetching summary:", error);
        }
    }

    res.status(200).send("Webhook received");
});

async function fetchTranscriptData(transcriptId) {
    const data = {
        query: `query Transcript($transcriptId: String!) {
        transcript(id: $transcriptId) {
          id
          title
          organizer_email
          participants
          date
      speakers {
        id
        name
      }
      meeting_info {
        fred_joined
        silent_meeting
        summary_status
      }
      transcript_url
      duration
      meeting_attendees {
        displayName
        email
        phoneNumber
        name
        location
      }
      sentences {
        speaker_name
        text 
      }    
        }
      }`,
        variables: { transcriptId },
    };

    try {
        const response = await axios.post(url, data, { headers: headers });

        if (response.data.data.transcript) {
            response.data.data.transcripts = [response.data.data.transcript];
            delete response.data.data.transcript;
        }

        return response.data;
    } catch (error) {
        if (error.response) {
            console.error("Error response:", error.response.data);
            console.error("Status code:", error.response.status);
        } else {
            console.error("Request failed:", error.message);
        }
        throw error;
    }
}

module.exports = {
    router,
    getStoredTranscript: () => storedTranscript, // Getter function to access storedTranscript
};
