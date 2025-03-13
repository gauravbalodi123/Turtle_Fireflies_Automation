// require("dotenv").config();
// const axios = require("axios");

// const FIRELIES_API_KEY = process.env.FIRELIES_API_KEY;
// const FIRELIES_API_URL = "https://api.fireflies.ai/graphql";

// // GraphQL Query
// const FIRELIES_QUERY = `
//   query Transcripts($participantEmail: String, $limit: Int, $skip: Int) {
//     transcripts(participant_email: $participantEmail, limit: $limit, skip: $skip) {
//       id
//       title
//       organizer_email
//       date
//     }
//   }
// `;

// async function fetchFirefliesDate(participantEmail) {
//     try {
//         const response = await axios.post(
//             FIRELIES_API_URL,
//             { query: FIRELIES_QUERY, variables: { participantEmail, limit: 1, skip: 0 } },
//             {
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${FIRELIES_API_KEY}`,
//                 },
//             }
//         );

//         const transcripts = response.data?.data?.transcripts;
//         if (transcripts.length === 0) return null;

//         return transcripts[0].date;  // Extract first available date
//     } catch (error) {
//         console.error("Error fetching Fireflies data:", error.response?.data || error.message);
//         return null;
//     }
// }

// module.exports = { fetchFirefliesDate };
