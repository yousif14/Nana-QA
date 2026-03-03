// Competition/assets/config.js
// IMPORTANT: Replace these with your actual Firebase project config.
// Go to https://console.firebase.google.com → Create Project → Realtime Database → Web App → Copy config
window.COMP_CONFIG = {
  firebase: {
    apiKey: "AIzaSyBNuG48nvuch1rDb6K27qaFOwFEMQkiA-g",
    authDomain: "nana-qa.firebaseapp.com",
    databaseURL: "https://nana-qa-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "nana-qa",
    storageBucket: "nana-qa.firebasestorage.app",
    messagingSenderId: "308292770121",
    appId: "1:308292770121:web:9576fb07dfb5b024016298"
  },
  // Published Google Sheet CSV URL
  sheetCsvUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTG5-5-sLIMNDp9S41--8cKfWXp7xtr2IfUZdo70SIazOQFT1c_X8K-SJj0MOfjuQbBF9_lgE3ddCky/pub?output=csv",
  // Timer durations in seconds
  timers: {
    "Single-Choice": 30,
    "Open-Answer": 60
  },
  // Scoring: index-based (0=1st correct, 1=2nd, 2=3rd, rest=1)
  scoring: [7, 5, 3]
};
