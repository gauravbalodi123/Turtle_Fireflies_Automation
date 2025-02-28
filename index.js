const express = require("express");
const bodyParser = require("body-parser");
const { router } = require("./index2"); // Import the router and the getter function
const { router: filterRouter } = require('./google3');
// const { createTableAndAddData } = require('./google');

const app = express();

// Middleware
app.use(bodyParser.json());

// Use the router from index2.js for the /fireflies-webhook route
app.use(router); // This applies the routes from index2.js to the main app
app.use(filterRouter);
// Then a route defined as /filter in the router remains /filter

// app.use(createTableAndAddData);
console.log("test bdskjb")
// Endpoint to get stored transcript data

app.get("/", (req, res) => {
    res.send("Welcome to the server");
});



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
