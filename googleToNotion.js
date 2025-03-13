// addMeetingData.js
const axios = require("axios");
require("dotenv").config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.COMPLETE_MEETING_DATABASE_ID; // Your created database ID

// Helper: Convert a date input (timestamp or string) to ISO date (yyyy-mm-dd)
function convertDateToISO(dateInput) {
  if (!dateInput) return "";
  const dateObj = new Date(dateInput);
  return dateObj.toISOString().split("T")[0];
}

// Helper: Check if a meeting with the given Meeting ID already exists in Notion
async function checkIfMeetingExists(meetingId) {
  try {
    const payload = {
      filter: {
        property: "Meeting ID",
        title: {
          equals: meetingId
        }
      }
    };

    const response = await axios.post(
      `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        }
      }
    );
    
    return response.data.results && response.data.results.length > 0;
  } catch (error) {
    console.error("Error checking meeting existence in Notion:", error.response?.data || error.message);
    return false;
  }
}

async function createMeetingDataInNotion(transcriptData) {
  try {
    const meetingId = transcriptData.id;
    // Check if the meeting already exists based on the Meeting ID.
    const meetingExists = await checkIfMeetingExists(meetingId);
    if (meetingExists) {
      console.log(`Meeting ID ${meetingId} already exists. Skipping insertion.`);
      return;
    }
    
    const payload = {
      parent: { database_id: DATABASE_ID },
      properties: {
        "Meeting ID": {
          title: [{ text: { content: transcriptData.id || "" } }]
        },
        "Title": {
          rich_text: [{ text: { content: transcriptData.title || "" } }]
        },
        "Organizer Email": {
          email: transcriptData.organizer_email || ""
        },
        "Participants": {
          rich_text: [{
            text: { content: Array.isArray(transcriptData.participants)
              ? transcriptData.participants.join(", ")
              : transcriptData.participants || "" }
          }]
        },
        "meeting_attendees": {
          rich_text: [{
            text: { content: transcriptData.meeting_attendees
              ? transcriptData.meeting_attendees.map(att => att.email).join(", ")
              : "" }
          }]
        },
        "Date": {
          date: { start: convertDateToISO(transcriptData.date) }
        },
        "Speaker": {
          rich_text: [{
            text: { content: transcriptData.speakers
              ? transcriptData.speakers.map(s => s.name).join(", ")
              : "" }
          }]
        },
        "Summary": {
          rich_text: [{ text: { content: transcriptData.meeting_summary || "" } }]
        },
        "Action Items": {
          rich_text: [{
            text: { content: transcriptData.action_items
              ? transcriptData.action_items
                  .map(item => `Task: ${item.task}, Responsible: ${item.responsiblePerson}, Deadline: ${item.deadline}`)
                  .join("\n")
              : "" }
          }]
        }
      }
    };

    const response = await axios.post("https://api.notion.com/v1/pages", payload, {
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      }
    });

    console.log("✅ Meeting data added to Notion:", response.data);
    console.log("date from google to notion to check",transcriptData.date , convertDateToISO(transcriptData.date));
  } catch (error) {
    console.error("Error adding meeting data to Notion:", error.response?.data || error.message);
  }
}

module.exports = { createMeetingDataInNotion };
