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
const sheetName = process.env.SheetName3;          // e.g., "Sheet3"

// Define the header row with separate columns for task details and a status dropdown
const headerRow = [
  'Meeting ID',
  'Organizer Email',
  'Participants',
  'Task',
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

  // Build new rows—one for each action item.
  // Each row is: [Meeting ID, Organizer Email, Participants, Task, Responsible, Deadline, Status]
  // "pending" is set as the default value for Status.
  const newRows = (transcriptData.action_items || []).map(item => [
    newMeetingId,
    newOrganizerEmail,
    newParticipants,
    item.task,
    item.responsiblePerson,
    item.deadline, // Ensure deadline is formatted correctly
    "pending"
  ]);

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

    // 3. If no header exists, write header and new rows starting at A1.
    if (!headerExists) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headerRow, ...newRows] }
      });
      console.log("Sheet was empty. Added header and new rows at A1.");
      return;
    }

    // 4. Check if the meeting ID from transcriptData is already present in any row (excluding the header)
    for (let i = 1; i < allRows.length; i++) {
      if (allRows[i][0] && allRows[i][0].trim() === newMeetingId.trim()) {
        console.log(`Meeting ID ${newMeetingId} already exists in row ${i + 1}. Aborting insertion.`);
        return;
      }
    }

    // 5. If header exists and the meeting ID is not found, determine the last row index (0-indexed).
    const lastRowIndex = allRows.length; // New rows will be inserted starting at this index.
    console.log(`Current number of rows: ${allRows.length}. New rows will be inserted starting at row ${lastRowIndex + 1}.`);

    // 6. Retrieve the sheet's grid ID using the sheet name.
    const spreadsheetMeta = await sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: false
    });
    const sheetMeta = spreadsheetMeta.data.sheets.find(s => s.properties.title === sheetName);
    const sheetId = sheetMeta.properties.sheetId;

    // 7. Insert blank rows at the end for all new rows.
    const insertRequest = {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: lastRowIndex,                  // 0-indexed: first new row
              endIndex: lastRowIndex + newRows.length,     // Insert as many rows as needed
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
    console.log(`Inserted ${newRows.length} blank row(s) at position ${lastRowIndex + 1}.`);

    // 8. Update the newly inserted rows with the new data.
    const updateRange = `${sheetName}!A${lastRowIndex + 1}:G${lastRowIndex + newRows.length}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: newRows }
    });
    console.log(`Data inserted into rows ${lastRowIndex + 1} to ${lastRowIndex + newRows.length}.`);

    // 9. Set up data validation (dropdown) for the Status column (Column G; 0-indexed column 6) for the new rows.
    // This creates a dropdown with options: "pending", "done", and "Assigned".
    const dataValidationRequest = {
      requests: [
        {
          setDataValidation: {
            range: {
              sheetId: sheetId,
              startRowIndex: lastRowIndex,                // 0-indexed: first new row
              endRowIndex: lastRowIndex + newRows.length,   // End row (exclusive)
              startColumnIndex: 6,                          // Column G (0-indexed)
              endColumnIndex: 7
            },
            rule: {
              condition: {
                type: "ONE_OF_LIST",
                values: [
                  { userEnteredValue: "pending" },
                  { userEnteredValue: "done" },
                  { userEnteredValue: "Assigned" }
                ]
              },
              showCustomUi: true,
              strict: true
            }
          }
        }
      ]
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: dataValidationRequest
    });
    console.log("Data validation (dropdown) applied to the Status column for the new rows.");

  } catch (error) {
    console.error('Error writing to Google Sheets:', error.message);
  }
}

module.exports = { createTableAndAddData2 };
