// updateSelectClientData.js
const axios = require("axios");
require("dotenv").config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const COMPLETE_DB_ID = process.env.COMPLETE_MEETING_DATABASE_ID; // Complete Meeting Data database ID
const SELECT_DB_ID = process.env.SELECT_CLIENT_DATABASE_ID;       // Select a Client database ID

// The protected header page ID (do not delete or modify this page).
const PROTECTED_HEADER_ID = "1a3dd9e64e4880ac96c1f15c5ff9af66";

// Helper: Normalize an ID by removing hyphens and converting to lowercase.
function normalizeId(id) {
  return id.replace(/-/g, "").toLowerCase();
}

// Helper: Query a Notion database (returns an array of pages)
async function queryDatabase(databaseId) {
  try {
    const response = await axios.post(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {},
      {
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        }
      }
    );
    return response.data.results;
  } catch (error) {
    console.error("Error querying database:", error.response?.data || error.message);
    return [];
  }
}

// Helper: Archive (delete) a Notion page by setting archived: true
async function archivePage(pageId) {
  try {
    await axios.patch(
      `https://api.notion.com/v1/pages/${pageId}`,
      { archived: true },
      {
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        }
      }
    );
    console.log(`Archived page ${pageId}`);
  } catch (error) {
    console.error("Error archiving page:", error.response?.data || error.message);
  }
}

// Main function: Update the Select Client database based on the client email selected in the header page.
async function updateSelectClientData() {
  try {
    // Step 1: Query the Select Client database.
    const selectPages = await queryDatabase(SELECT_DB_ID);
    if (selectPages.length === 0) {
      console.log("No pages found in the Select Client database.");
      return;
    }

    // Find the header (protected) page using normalized ID.
    const normalizedProtectedHeaderId = normalizeId(PROTECTED_HEADER_ID);
    const headerPage = selectPages.find(page => normalizeId(page.id) === normalizedProtectedHeaderId);
    if (!headerPage) {
      console.log("Protected header page not found in the Select Client database.");
      return;
    }

    // Read the client email from the header page's "Client" property.
    let clientEmail = "";
    if (headerPage.properties && headerPage.properties["Client"] && headerPage.properties["Client"].select) {
      clientEmail = headerPage.properties["Client"].select.name;
    }
    if (!clientEmail) {
      console.log("No client email selected in the header page's Client dropdown.");
      return;
    }
    console.log(`Selected client email from header page: ${clientEmail}`);

    // Step 2: Archive all pages in the Select Client database except the header.
    for (const page of selectPages) {
      if (normalizeId(page.id) !== normalizedProtectedHeaderId) {
        await archivePage(page.id);
      }
    }
    console.log("Archived all pages (except the header) in the Select Client database.");

    // Step 3: Query the Complete Meeting Data database.
    const completePages = await queryDatabase(COMPLETE_DB_ID);
    console.log(`Found ${completePages.length} pages in the Complete Meeting Data database.`);

    // Determine if an "Order" property exists in the header page.
    const hasOrderProperty = headerPage.properties.hasOwnProperty("Order");

    // We'll start new rows with an order value of 2 (assuming header has order 1).
    let orderCounter = 2;

    // Step 4: Loop over each meeting page and copy if Participants include the clientEmail.
    for (const page of completePages) {
      // Extract Participants text from the page properties.
      let participantsText = "";
      const participantsProp = page.properties?.Participants;
      if (participantsProp && participantsProp.rich_text && Array.isArray(participantsProp.rich_text)) {
        participantsText = participantsProp.rich_text.map(rt => rt.plain_text).join(", ");
      }

      if (participantsText.toLowerCase().includes(clientEmail.toLowerCase())) {
        // Build properties payload.
        const propertiesPayload = {
          "Meeting ID": {
            title: [{ text: { content: page.properties["Meeting ID"].title[0].plain_text || "" } }]
          },
          "Title": {
            rich_text: [{ text: { content: page.properties["Title"].rich_text[0].plain_text || "" } }]
          },
          "Organizer Email": {
            email: page.properties["Organizer Email"].email || ""
          },
          "Participants": {
            rich_text: [{
              text: { content: participantsText }
            }]
          },
          "meeting_attendees": {
            rich_text: [{
              text: { content: page.properties["meeting_attendees"].rich_text[0]?.plain_text || "" }
            }]
          },
          "Date": {
            date: { start: page.properties["Date"].date.start }
          },
          "Speaker": {
            rich_text: [{
              text: { content: page.properties["Speaker"].rich_text[0]?.plain_text || "" }
            }]
          },
          "Summary": {
            rich_text: [{ text: { content: page.properties["Summary"].rich_text[0]?.plain_text || "" } }]
          },
          "Action Items": {
            rich_text: [{
              text: { content: page.properties["Action Items"].rich_text[0]?.plain_text || "" }
            }]
          },
          "Client": {
            select: { name: clientEmail }
          }
        };

        // If the database has an "Order" property, include it.
        if (hasOrderProperty) {
          propertiesPayload["Order"] = { number: orderCounter };
        }

        const payload = {
          parent: { database_id: SELECT_DB_ID },
          properties: propertiesPayload
        };

        await axios.post("https://api.notion.com/v1/pages", payload, {
          headers: {
            Authorization: `Bearer ${NOTION_API_KEY}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
          }
        });
        console.log(`Added meeting ${page.properties["Meeting ID"].title[0].plain_text} for client ${clientEmail}` +
                    (hasOrderProperty ? ` with order ${orderCounter}` : ""));
        orderCounter++;
      }
    }
    console.log("Select Client database update complete.");
  } catch (error) {
    console.error("Error updating Select Client database:", error.response?.data || error.message);
  }
}

updateSelectClientData();
module.exports = { updateSelectClientData };
