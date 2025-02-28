// createDatabase.js
const axios = require("axios");
require("dotenv").config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const PARENT_PAGE_ID = process.env.PARENT_PAGE_ID;

async function createCompleteMeetingDatabase() {
  try {
    const response = await axios.post(
      "https://api.notion.com/v1/databases",
      {
        parent: { type: "page_id", page_id: PARENT_PAGE_ID },
        title: [{ type: "text", text: { content: "Complete Fireflies Meeting Data" } }],
        properties: {
          "Meeting ID": { title: {} },
          "Title": { rich_text: {} },
          "Organizer Email": { email: {} },
          "Participants": { rich_text: {} },
          "meeting_attendees": { rich_text: {} },
          "Date": { date: {} },
          "Speaker": { rich_text: {} },
          "Summary": { rich_text: {} },
          "Action Items": { rich_text: {} }
        }
      },
      {
        headers: {
          "Authorization": `Bearer ${NOTION_API_KEY}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        }
      }
    );
    console.log("Database created:", response.data);
  } catch (error) {
    console.error("Error creating Notion database:", error.response?.data || error.message);
  }
}

createCompleteMeetingDatabase();
