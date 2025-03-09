require("dotenv").config();
const axios = require("axios");
const { GoogleAuth } = require("google-auth-library");
const { fetchTranscripts } = require("./transcripts");
const { createTableAndAddData } = require('./google');
const { createTableAndAddData2 } = require('./google2');
const { syncTranscriptDataToNotion } = require('./google2ToNotion');
const { createMeetingDataInNotion } = require('./googleToNotion');

const PROJECT_ID = process.env.PROJECT_ID;
const MODEL_NAME = "gemini-1.5-pro"; // Use "gemini-1.5-flash" for a cheaper, faster model
// const API_URL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${MODEL_NAME}:streamGenerateContent`;
const API_URL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/${MODEL_NAME}:generateContent`;

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

// Helper function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Use your service account JSON file
async function getAccessToken() {
  const auth = new GoogleAuth({
    credentials, // Path to your JSON file
    scopes: "https://www.googleapis.com/auth/cloud-platform",  
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function summarizeTranscript(transcription, formattedDate) {
  const token = await getAccessToken();

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Here is a transcript of a meeting along with the date:

            ${transcription}
            ${formattedDate}

            **Task:**  
            1️⃣ Provide a summary of the entire meeting transcript as a separate JSON object, meeting summary should be plain text not in points and name the attribute meetingSummary only , also do not make the summay too long .  
            2️⃣ List action items as an array of JSON objects with the following attributes, name the attribute actionItems only:  
               - **task**: Brief description of the task 
               - **responsiblePerson**: Who is assigned to the task  
               - **deadline**: Due date .
               only in case deadline is missing, give a deadline of one week from the current date that is provided, for example if the date provided is 14/2/25 give a deadline of 21/2/25, keep the deadline in the format dd/mm/yy strictly .
               Don't give any other response anything else except the above.
            `
          },
        ],
      },
    ],
  };

  // - in case task, responsiblePerson, deadline all three are missing, then respond no action items in this call.

  try {
    const response = await axios.post(API_URL, requestBody, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    let responseText = response.data.candidates[0].content.parts[0].text;
    responseText = responseText.replace(/```json\n/, "").replace(/\n```/, "");
    
    // Convert the string response into a proper JSON object
    const responseJSON = JSON.parse(responseText);  // This will parse the string to JSON
    
    // console.log("Meeting Summary:", responseJSON.meetingSummary);
    // console.log("Action Items:", JSON.stringify(responseJSON.actionItems, null, 2));
    // console.log(responseJSON);
    
    return responseJSON;  // Returning the structured result as JSON

  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
  }
}


const formatTranscripts = (transcripts) => {
  return transcripts
    .map((t, index) => `Transcript ${index + 1}:\n` + 
      (t.sentences && Array.isArray(t.sentences) && t.sentences.length > 0
        ? t.sentences.map((s) => `${s.speaker_name}: ${s.text}`).join("\n")
        : "This meeting is empty")
    )
    .join("\n\n"); 
};



async function fetchCompleteFinalData(storedTranscript) {
  const response = storedTranscript; 
  // const response = await fetchTranscripts(); // Get transcripts response
  const transcripts = response.data.transcripts; // Extract transcript array

  if (!transcripts || transcripts.length === 0) {
    console.log("No transcripts found.");
    return response;
  }

  // Format transcripts properly
  const formattedTranscripts = formatTranscripts(transcripts);

  // Split formatted transcript text into individual transcript segments
  const transcriptArray = formattedTranscripts.split(/\n\nTranscript \d+:\n/).filter(Boolean);

  if (transcriptArray.length !== transcripts.length) {
    console.warn("Mismatch between transcript array and data array length.");
  }

  for (let i = 0; i < transcriptArray.length; i++) {
    // Get the raw date from the transcript object.
    const transcriptDate = response.data.transcripts[i].date;
    // Convert it to "dd/mm/yy" format using the en-GB locale.
    const formattedDate = new Date(transcriptDate).toLocaleDateString('en-GB', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    });

    console.log(`Processing: ${transcriptArray[i].substring(0, 50)}...`); // Show preview

    // Pass both the transcript text and the formatted date to summarizeTranscript.
    const summaryResult = await summarizeTranscript(transcriptArray[i], formattedDate);

    // Add summary and action items to the corresponding transcript object inside response
    if (response.data.transcripts[i]) {
      response.data.transcripts[i].meeting_summary = summaryResult.meetingSummary;
      response.data.transcripts[i].action_items = summaryResult.actionItems;
      //  console.log(response.data.transcripts[i]);
      // code from google.js to add summary and task item for all clients
      await createTableAndAddData(response.data.transcripts[i]);
      // code from google2.js where all the task of each client are concatenated together
      await createTableAndAddData2(response.data.transcripts[i]);

      // googleToNotion code
      await createMeetingDataInNotion(response.data.transcripts[i]);
      // google2ToNotion code
      await syncTranscriptDataToNotion(response.data.transcripts[i]);
    }

    // Add a fixed 10-second delay before processing the next transcript (if any)
    if (i < transcriptArray.length - 1) {
      console.log("Delaying for 70 seconds before processing the next transcript...");
      await delay(70000);
    }
  }
  // Optionally log or return the updated response.
  // console.log("Updated Fireflies Data:\n", JSON.stringify(response, null, 2));
  // return response; 
}


fetchCompleteFinalData();


// Export the function for use in other files
module.exports = { fetchCompleteFinalData };
