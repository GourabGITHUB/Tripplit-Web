Bill Share 

A simple web application for sharing and tracking expenses among a group, perfect for trips, roommates, or any shared event.

Features
Create Trips: Easily set up a new trip or event to track expenses.

Add Expenses: Log individual expenses with details like who paid and who it was for.

Split Bills: Automatically calculates who owes whom to simplify settling up.

Secure: Uses Firebase for a reliable and secure backend.

Setup and Installation
1. Clone the repository
git clone [YOUR_REPOSITORY_URL]
cd [YOUR_PROJECT_FOLDER]

2. Configure Firebase
This project uses Firebase for its backend. To connect the app to your Firebase project, you need to add your credentials.

Copy the example config file:

cp firebase-config.example.js firebase-config.js

Open firebase-config.js and replace the placeholder values with your actual Firebase project credentials. You can find these in your Firebase console under Project Settings > General > Your apps.

3. Install Firebase CLI
If you don't have the Firebase CLI installed, you can install it globally with npm.

npm install -g firebase-tools

4. Run the app locally
You can test the app on your local machine using the Firebase emulator.

firebase emulators:start

This will start a local web server, typically at http://localhost:5000.

Deployment
To deploy your app to Firebase Hosting, run the following commands from your project's root directory:

Initialize your project for Firebase Hosting (you only need to do this once per project). Follow the prompts, and make sure to select the public directory as your public folder.

firebase init

Deploy your app. The --only hosting flag ensures that only your web app is deployed, without affecting other Firebase services.

firebase deploy --only hosting

The output will give you the live URL for your web app.

Technologies Used
HTML5

CSS3 (with Tailwind CSS)

JavaScript

Firebase (Hosting and Firestore)
