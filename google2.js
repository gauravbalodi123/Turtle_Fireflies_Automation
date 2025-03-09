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
const sheetName = process.env.SheetName3;        // e.g., "Sheet3"

// Define the header row with 'Days since last call'
const headerRow = [
  'Meeting ID',
  'Organizer Email',
  'Participants',
  'Date',       
  'Task',
  'Days since last call',  // New column
  'Responsible',
  'Deadline',
  'Status'
];

async function createTableAndAddData2(transcriptData) {
  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
  console.log("Spreadsheet ID:", spreadsheetId);

  // Build base values from transcriptData
  const newMeetingId = transcriptData.id;
  const newOrganizerEmail = transcriptData.organizer_email;
  const newParticipants = transcriptData.participants ? transcriptData.participants.join(", ") : '';
  const newDate = transcriptData.date || ''; // Date is in column D

  try {
    // 1. Retrieve the entire sheet data (columns A:Z)
    const sheetDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`
    });
    const allRows = sheetDataResponse.data.values || [];

    // 2. Check if the header exists
    let headerExists = allRows.length > 0 && allRows[0].some(cell => cell.trim() !== "");

    // 3. If no header exists, write the header first
    if (!headerExists) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headerRow] }
      });
      console.log("Sheet was empty. Added header row.");
    }

    // 4. Check if the meeting ID already exists
    for (let i = 1; i < allRows.length; i++) {
      if (allRows[i][0] && allRows[i][0].trim() === newMeetingId.trim()) {
        console.log(`Meeting ID ${newMeetingId} already exists in row ${i + 1}. Skipping insertion.`);
        return;
      }
    }

    // 5. Determine the last row index
    const lastRowIndex = allRows.length;
    console.log(`New rows will be inserted starting at row ${lastRowIndex + 1}.`);

    // 6. Retrieve the sheet's grid ID
    const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId, includeGridData: false });
    const sheetMeta = spreadsheetMeta.data.sheets.find(s => s.properties.title === sheetName);
    const sheetId = sheetMeta.properties.sheetId;

    // 7. Insert blank rows
    const insertRequest = {
      requests: [{
        insertDimension: {
          range: { sheetId, dimension: "ROWS", startIndex: lastRowIndex, endIndex: lastRowIndex + transcriptData.action_items.length },
          inheritFromBefore: true
        }
      }]
    };
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: insertRequest });

    console.log(`Inserted ${transcriptData.action_items.length} blank row(s).`);

    // 8. Build new rows with formulas
    const newRows = transcriptData.action_items.map((item, index) => {
      const rowNumber = lastRowIndex + index + 1; // Row number in the sheet (1-based)
      return [
        newMeetingId,
        newOrganizerEmail,
        newParticipants,
        newDate,  
        item.task,
        newDate ? `=TODAY()-D${rowNumber}` : "", // Formula for "Days since last call"
        item.responsiblePerson,
        item.deadline || '',
        "pending"
      ];
    });

    // 9. Update the new rows in the sheet
    const updateRange = `${sheetName}!A${lastRowIndex + 1}:I${lastRowIndex + newRows.length}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: newRows }
    });

    console.log(`Data inserted into rows ${lastRowIndex + 1} to ${lastRowIndex + newRows.length}.`);

    // 10. Apply dropdown validation for the Status column
    const dataValidationRequest = {
      requests: [{
        setDataValidation: {
          range: {
            sheetId,
            startRowIndex: lastRowIndex,
            endRowIndex: lastRowIndex + newRows.length,
            startColumnIndex: 8, // Column I (0-indexed)
            endColumnIndex: 9
          },
          rule: {
            condition: { type: "ONE_OF_LIST", values: [{ userEnteredValue: "pending" }, { userEnteredValue: "done" }, { userEnteredValue: "Assigned" }] },
            showCustomUi: true,
            strict: true
          }
        }
      }]
    };
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: dataValidationRequest });

    console.log("Dropdown applied to the Status column.");

  } catch (error) {
    console.error('Error writing to Google Sheets:', error.message);
  }
}

module.exports = { createTableAndAddData2 };
