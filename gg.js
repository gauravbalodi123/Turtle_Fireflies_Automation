// index2.js
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const axios = require("axios");
require("dotenv").config();
const router = express.Router();
router.use(bodyParser.json());
// const { createTableAndAddData } = require('./google');
const { fetchCompleteFinalData } = require('./vertexAI');


const FIRELIES_WEBHOOK_SECRET = process.env.FIRELIES_WEBHOOK_SECRET;
const FIRELIES_API_KEY = process.env.FIRELIES_API_KEY;

const url = "https://api.fireflies.ai/graphql";
const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${FIRELIES_API_KEY}`,
};

// console.log("bdkjb");

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
            // console.log("Updated storedTranscript:", storedTranscript);
            fetchCompleteFinalData(storedTranscript);
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

        // Transform the response: replace transcript with attributes array.
        if (response.data.data.transcript) {
            // Create an "attributes" property as an array containing the transcript data.
            response.data.data.transcripts = [response.data.data.transcript];
            // Remove the original "transcript" property.
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
        throw error;  // Rethrow the error after logging
    }

}


module.exports = {
    router,
    getStoredTranscript: () => storedTranscript, // Getter function to access storedTranscript
};
