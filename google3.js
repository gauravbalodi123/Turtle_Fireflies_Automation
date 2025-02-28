const { google } = require('googleapis');
const fs = require('fs');
const express = require('express');
const router = express.Router();
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
const sheet2Name = process.env.SheetName2;         // Sheet2: source of all client data
const sheet5Name = process.env.SheetName5;         // Sheet5: destination (dropdown in row1, header in row2)

/**
 * This function does the following:
 * 1. Reads the selected email from Sheet5 cell E1 (dropdown in row1).
 * 2. Retrieves all data from Sheet2 and filters rows whose "Participants" column (assumed column D) contains the selected email.
 * 3. Clears existing data in Sheet5 starting from Row 3 (leaving row1 and row2 intact).
 * 4. Inserts blank rows at Row 3 equal to the number of matching data rows.
 * 5. Updates those newly inserted rows with the filtered data.
 */
async function filterSheet2ByDropdownEmail() {
  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

  try {
    // 1. Read the selected email from Sheet5's dropdown (cell E1)
    const dropdownResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheet5Name}!E1`
    });
    const dropdownValues = dropdownResponse.data.values;
    if (!dropdownValues || dropdownValues.length === 0) {
      console.log("No dropdown value found in Sheet5 cell E1.");
      return;
    }
    const selectedEmail = dropdownValues[0][0].trim();
    console.log("Selected Email from Dropdown:", selectedEmail);

    // 2. Retrieve all data from Sheet2.
    const sheet2Response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheet2Name}!A:Z`
    });
    const sheet2Rows = sheet2Response.data.values || [];
    if (sheet2Rows.length === 0) {
      console.log("Sheet2 is empty.");
      return;
    }

    // Assume the first row in Sheet2 is the header.
    // We'll only use the data rows (from row 2 onward in Sheet2).
    const headerRow = sheet2Rows[0];
    const dataRows = [];
    for (let i = 1; i < sheet2Rows.length; i++) {
      const row = sheet2Rows[i];
      // "Participants" is assumed to be in column D (index 3)
      if (row[3]) {
        const participantEmails = row[3].split(",").map(email => email.trim());
        if (participantEmails.includes(selectedEmail)) {
          dataRows.push(row);
        }
      }
    }
    console.log(`Found ${dataRows.length} matching row(s) for email ${selectedEmail}.`);

    // 3. Clear existing data rows in Sheet5 starting from row 3.
    // This leaves row1 (dropdown) and row2 (header) intact.
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheet5Name}!A3:Z`
    });
    console.log("Cleared previous data in Sheet5 starting from row 3.");

    if (dataRows.length === 0) {
      console.log("No matching data rows found; Sheet5 remains cleared (except for dropdown and header).");
      return;
    }

    // 4. Insert blank rows equal to the number of matching data rows.
    // Since the header is in row2, we want to insert starting at row3.
    // In zero-indexed terms, row 3 is index 2.
    const numRowsToInsert = dataRows.length;
    const spreadsheetMeta = await sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: false
    });
    const sheetMeta = spreadsheetMeta.data.sheets.find(s => s.properties.title === sheet5Name);
    const sheetId = sheetMeta.properties.sheetId;

    // Insert new rows at index 2 (i.e. row 3 in A1 notation)
    const insertRequest = {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: 2, // row3 in A1 (0-indexed 2)
              endIndex: 2 + numRowsToInsert,
            },
            inheritFromBefore: false
          }
        }
      ]
    };

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: insertRequest
    });
    console.log(`Inserted ${numRowsToInsert} blank row(s) starting at row 3 in Sheet5.`);

    // 5. Update the newly inserted rows with the filtered data.
    // Determine the last column letter based on the header from Sheet2.
    const numColumns = headerRow.length;
    const lastColumnLetter = String.fromCharCode("A".charCodeAt(0) + numColumns - 1);
    // Our update range starts at row 3 and spans numRowsToInsert rows.
    const updateRange = `${sheet5Name}!A3:${lastColumnLetter}${2 + numRowsToInsert}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: dataRows }
    });
    console.log(`Updated Sheet5 with ${dataRows.length} matching row(s).`);

  } catch (error) {
    console.error("Error filtering data by dropdown email:", error.message);
  }
}

router.post('/filter', async (req, res) => {
  try {
    await filterSheet2ByDropdownEmail();
    res.status(200).json({ message: 'Filtered data updated successfully.' });
  } catch (error) {
    console.error('Error filtering data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = { filterSheet2ByDropdownEmail, router };
