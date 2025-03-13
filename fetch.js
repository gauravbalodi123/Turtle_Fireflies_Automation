// require("dotenv").config();
// const { fetchFirefliesDate } = require("./fetchFirefliesDate");
// const { findNotionClientByEmail, updateNotionDate } = require("./dateFromFirefliesToNotion");

// // Get emails from .env and convert to array
// const participantEmails = process.env.PARTICIPANT_EMAILS.split(",");

// // Function to introduce a delay
// const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// // Function to sync Fireflies Date to Notion with delay
// async function syncFirefliesToNotionWithDelay() {
//     for (const email of participantEmails) {
//         console.log(`🔍 Processing: ${email.trim()}`);

//         const date = await fetchFirefliesDate(email.trim());
//         if (!date) {
//             console.log(`❌ No date found for ${email.trim()}`);
//             continue;
//         }

//         console.log(`✅ Found Date: ${date}, Searching in Notion...`);

//         const pageId = await findNotionClientByEmail(email.trim());
//         if (!pageId) {
//             console.log(`❌ No Notion client found for ${email.trim()}`);
//             continue;
//         }

//         console.log(`✅ Found Notion Page. Updating Date...`);
//         await updateNotionDate(pageId, date);

//         console.log(`⏳ Waiting 10 seconds before processing the next email...`);
//         await delay(10000); // 10 seconds delay
//     }
// }

// // Run the function
// syncFirefliesToNotionWithDelay();
