const fetch = require("node-fetch");
require("dotenv").config();

const NOTION_API_KEY = process.env.NOTION_API_KEY; // Your Notion API Key
const PARENT_PAGE_ID = process.env.PARENT_PAGE_ID; // Your Notion Page ID

async function createDatabase() {
    const response = await fetch("https://api.notion.com/v1/databases", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${NOTION_API_KEY}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        },
        body: JSON.stringify({
            parent: { type: "page_id", page_id: PARENT_PAGE_ID },
            title: [{ type: "text", text: { content: "Detailed Row Wise Task View" } }],
            properties: {
                "Meeting ID": { title: {} },
                "Organizer Email": { email: {} },
                "Participants": { rich_text: {} },
                "Task": { rich_text: {} },
                "Responsible": { rich_text: {} },
                "Deadline": { date: {} },
                "Status": { select: { options: [
                    { name: "Pending", color: "yellow" },
                    { name: "Done", color: "green" },
                    { name: "Assigned", color: "blue" }
                ]}}
            }
        })
    });

    const data = await response.json();
    console.log(data);
}

createDatabase();
