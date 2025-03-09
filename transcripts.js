require("dotenv").config();
const axios = require("axios");

const API_KEY = process.env.FIRELIES_API_KEY;
const API_URL = "https://api.fireflies.ai/graphql";

// Define GraphQL query
// Define GraphQL query
const QUERY = `
  query Transcripts($organizerEmail: String, $participantEmail: String, $limit: Int, $skip: Int) {
    transcripts(organizer_email: $organizerEmail, participant_email: $participantEmail, limit: $limit, skip: $skip) {
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
  }
`;


// Define request variables
const variables = {
  organizerEmail: 'talk@turtlefinance.in',
  // participantEmail: "kamat.gautam@gmail.com",    
  // participantEmail: "kamat.gautam@gmail.com",   
  limit: 1,
  skip: 0,
};


// Function to format transcripts
// const formatTranscripts = (transcripts) => {
//   return transcripts
//     .flatMap((t) => t.sentences.map((s) => `${s.speaker_name}: ${s.text}`))
//     .join("\n");
// };


// const formatTranscripts = (transcripts) => {
//   return transcripts
//     .map((t, index) => `Transcript ${index + 1}:\n` + 
//       t.sentences.map((s) => `${s.speaker_name}: ${s.text}`).join("\n")
//     )
//     .join("\n\n"); 
// };

// Function to fetch and return formatted transcripts
async function fetchTranscripts() {
  try {
    const response = await axios.post(
      API_URL,
      { query: QUERY, variables: variables },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    const data = response.data;
    // console.log("Transcripts Data:\n", JSON.stringify(data, null, 2));

    // const transformedData = formatTranscripts(data);
    // console.log(transformedData);
    // return transformedData;
    return data;
  } catch (error) {
    console.error("Error fetching transcripts:", error.response ? error.response.data : error.message);
    return null;
  }
}
//what if i write formatdata function to vertexai.js and then use it ther for enrite transcripts data
// then in vertexai i will add the summary and the action items to the fireflies json i got and then send the entire data as one
// fetchTranscripts();


// example date is "date": 1738211400000,
module.exports = { fetchTranscripts };
