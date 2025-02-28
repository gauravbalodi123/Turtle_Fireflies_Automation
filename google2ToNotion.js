const axios = require("axios");
require("dotenv").config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ROW_WISE_TASK;

// Helper function: Convert a date string in dd/mm/yy(yy) format to ISO (yyyy-mm-dd)
function convertToISO(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr; // if unexpected format, return as-is
  let [day, month, year] = parts;
  // If year is two digits, assume it’s in the 2000s.
  if (year.length === 2) {
    year = "20" + year;
  }
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// Function to check if a meeting with the given Meeting ID already exists in Notion
async function checkIfMeetingExists(meetingId) {
  try {
    const response = await axios.post(
      "https://api.notion.com/v1/databases/" + NOTION_DATABASE_ID + "/query",
      {
        filter: {
          property: "Meeting ID",
          title: {
            equals: meetingId
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        }
      }
    );
    return response.data.results.length > 0;
  } catch (error) {
    console.error("Error checking Notion database:", error.response?.data || error.message);
    return false;
  }
}

// Function to add one task row to Notion
async function addTaskToNotion(meetingId, organizerEmail, participants, task, responsible, deadline, status = "Pending") {
  try {
    const payload = {
      parent: { database_id: NOTION_DATABASE_ID },
      properties: {
        "Meeting ID": {
          title: [{ text: { content: meetingId } }]
        },
        "Organizer Email": {
          email: organizerEmail
        },
        "Participants": {
          rich_text: [{ text: { content: participants } }]
        },
        "Task": {
          rich_text: [{ text: { content: task } }]
        },
        "Responsible": {
          rich_text: [{ text: { content: responsible } }]
        },
        "Deadline": {
          date: { start: convertToISO(deadline) }
        },
        "Status": {
          select: { name: status }
        }
      }
    };

    await axios.post("https://api.notion.com/v1/pages", payload, {
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      }
    });

    console.log(`✅ Added task "${task}" for Meeting ID ${meetingId} to Notion.`);
  } catch (error) {
    console.error("Error adding data to Notion:", error.response?.data || error.message);
  }
}

// Main function: Process a single transcript object and add each task as a separate row
async function syncTranscriptDataToNotion(transcript) {
  if (!transcript) {
    console.error("Invalid transcript data format.");
    return;
  }

  // Extract meeting-level details
  const meetingId = transcript.id;
  const organizerEmail = transcript.organizer_email;
  const participants = Array.isArray(transcript.participants)
    ? transcript.participants.join(", ")
    : transcript.participants;

  // Check if a meeting with this Meeting ID already exists
  const meetingExists = await checkIfMeetingExists(meetingId);
  if (meetingExists) {
    console.log(`Meeting ID ${meetingId} already exists in Notion. Skipping duplicate entry.`);
    return;
  }
  
  // Process each task in the action_items array
  if (transcript.action_items && Array.isArray(transcript.action_items)) {
    for (const item of transcript.action_items) {
      const task = item.task || "";
      const responsible = item.responsiblePerson || "";
      const deadline = item.deadline || "";
      // Status isn't provided in the data; default to "Pending"
      const status = "Pending";
      await addTaskToNotion(meetingId, organizerEmail, participants, task, responsible, deadline, status);
    }
  } else {
    console.log(`No action items found for Meeting ID ${meetingId}.`);
  }
}

module.exports = { syncTranscriptDataToNotion };
