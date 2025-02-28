// createSelectClientDatabase.js
const axios = require("axios");
require("dotenv").config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const PARENT_PAGE_ID = process.env.PARENT_PAGE_ID; // The parent page under which to create the database

async function createSelectClientDatabase() {
  try {
    const response = await axios.post(
      "https://api.notion.com/v1/databases",
      {
        parent: { type: "page_id", page_id: PARENT_PAGE_ID },
        title: [{ type: "text", text: { content: "Select a Client" } }],
        properties: {
          "Meeting ID": { title: {} },
          "Title": { rich_text: {} },
          "Organizer Email": { email: {} },
          "Participants": { rich_text: {} },
          "meeting_attendees": { rich_text: {} },
          "Date": { date: {} },
          "Speaker": { rich_text: {} },
          "Summary": { rich_text: {} },
          "Action Items": { rich_text: {} },
          // This property is used for the dropdown selection.
          "Client": { 
            select: { 
              options: [
                { name: "kamat.gautam@gmail.com", color: "blue" },
                { name: "anuragdev114@gmail.com", color: "green" },
                { name: "balodigaurav0@gmail.com", color: "yellow" }
              ]
            }
          }
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
    console.log("Select a Client Database created:", response.data);
  } catch (error) {
    console.error("Error creating Select a Client database:", error.response?.data || error.message);
  }
}

createSelectClientDatabase();
