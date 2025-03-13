const { google } = require('googleapis');
const fs = require('fs');
require("dotenv").config();

// Load your service account credentials
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);


// Authenticate using the service account
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Configuration: adjust these values if needed
const spreadsheetId = process.env.spreadsheetId; // Your Google Sheet ID
const sheetName = process.env.SheetName2;          // e.g., "Sheet2"

// Define the header row and the data row
const headerRow = [
  'Meeting ID',
  'Title',
  'Organizer Email',
  'Participants',
  'meeting_attendees',
  'Date',
  'Speaker',
  'Summary',
  'Action Items'
];

async function createTableAndAddData(transcriptData) {
  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
  console.log("Spreadsheet ID:", spreadsheetId);

  // Build the data row from transcriptData
  const dataRow = [
    transcriptData.id,
    transcriptData.title,
    transcriptData.organizer_email,
    transcriptData.participants ? transcriptData.participants.join(", ") : '',
    transcriptData.meeting_attendees
      ? transcriptData.meeting_attendees.map(attendee => attendee.email).join(", ")
      : '',
    new Date(transcriptData.date).toLocaleString(),
    transcriptData.speakers ? transcriptData.speakers.map(speaker => speaker.name).join(", ") : '',
    transcriptData.meeting_summary,
    transcriptData.action_items
      ? transcriptData.action_items
          .map(item => `Task: ${item.task}, Responsible: ${item.responsiblePerson}, Deadline: ${item.deadline}`)
          .join("\n")
      : ''
  ];

  try {
    // 1. Retrieve the entire sheet data (columns A:Z)
    const sheetDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`
    });
    const allRows = sheetDataResponse.data.values || [];

    // 2. Check if the header exists by ensuring the first row has at least one nonempty cell.
    let headerExists = false;
    if (allRows.length > 0 && allRows[0].some(cell => cell && cell.trim() !== "")) {
      headerExists = true;
      console.log("Header row found:", allRows[0]);
    }

    // 3. If no header exists, write header and data row starting at A1.
    if (!headerExists) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headerRow, dataRow] }
      });
      console.log("Sheet was empty. Added header and data row at A1.");
      return;
    }
    
    // NEW CODE: Check if the meeting ID already exists.
    // Assuming each row contains only one meeting ID in column A.
    for (let i = 1; i < allRows.length; i++) {
      const meetingIdCell = allRows[i][0] || "";
      if (meetingIdCell.trim() === dataRow[0].trim()) {
        console.log(`Meeting ID ${dataRow[0]} already exists in row ${i + 1}. Stopping further processing.`);
        return;
      }
    }

    // 4. If header exists, insert a blank row after the last row.
    // Determine the last row index (0-indexed). For A1 notation, add 1.
    const lastRowIndex = allRows.length; // 0-indexed row count equals the number of rows
    console.log(`Current number of rows: ${allRows.length}. New row will be inserted at A1 row number ${lastRowIndex + 1}`);
    console.log(new Date(transcriptData.date).toLocaleString());
    // Retrieve the sheet's grid ID using the sheet name.
    const spreadsheetMeta = await sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: false
    });
    const sheetMeta = spreadsheetMeta.data.sheets.find(s => s.properties.title === sheetName);
    const sheetId = sheetMeta.properties.sheetId;

    // 5. Insert a blank row at the end using the insertDimension request.
    // Note: Insert at index = lastRowIndex (0-indexed). For example, if there are 3 rows (0,1,2), inserting at 3
    // creates a new row at A1 row number 4.
    const insertRequest = {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: lastRowIndex,
              endIndex: lastRowIndex + 1,
            },
            inheritFromBefore: true,
          }
        }
      ]
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: insertRequest
    });
    console.log(`Inserted a blank row at position ${lastRowIndex + 1}`);

    // 6. Update the newly inserted row with the data.
    // Using A1 notation: row number = lastRowIndex + 1. Here, columns A to I (9 columns) are updated.
    const updateRange = `${sheetName}!A${lastRowIndex + 1}:I${lastRowIndex + 1}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [dataRow] }
    });
    console.log(`Data inserted into row ${lastRowIndex + 1}.`);

  } catch (error) {
    console.error('Error writing to Google Sheets:', error.message);
  }
}

module.exports = { createTableAndAddData };
