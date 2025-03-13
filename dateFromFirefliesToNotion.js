require("dotenv").config();
const axios = require("axios");

const NOTION_API_KEY = process.env.NOTION_API_KEY2;
const NOTION_DATABASE_ID = "95a2d0f29c6844e9bab0b563496e2752";
const NOTION_API_URL = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`;
const NOTION_UPDATE_URL = "https://api.notion.com/v1/pages/";

// Find a Notion Client by Email
async function findNotionClientByEmail(email) {
    try {
        const response = await axios.post(
            NOTION_API_URL,
            {
                filter: {
                    property: "Email",
                    email: { equals: email },
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${NOTION_API_KEY}`,
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json",
                },
            }
        );

        const clients = response.data.results;
        if (clients.length === 0) return null;

        return clients[0].id;  // Return first matching page ID
    } catch (error) {
        console.error("Error fetching Notion client:", error.response?.data || error.message);
        return null;
    }
}

// Convert Fireflies Timestamp to Notion Date Format
function formatTimestampToDate(timestamp) {
    return new Date(timestamp).toISOString().split("T")[0]; // Convert to "YYYY-MM-DD"
}

// Update Notion "Date" column
async function updateNotionDate(pageId, timestamp) {
    try {
        const notionDate = formatTimestampToDate(timestamp); // Convert timestamp to date string

        await axios.patch(
            `${NOTION_UPDATE_URL}${pageId}`,
            {
                properties: {
                    Date: {
                        date: { start: notionDate }, // Notion expects a string in "YYYY-MM-DD"
                    },
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${NOTION_API_KEY}`,
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json",
                },
            }
        );

        console.log(`✅ Updated Notion Date for Page ${pageId}: ${notionDate}`);
    } catch (error) {
        console.error("Error updating Notion date:", error.response?.data || error.message);
    }
}

module.exports = { findNotionClientByEmail, updateNotionDate };
