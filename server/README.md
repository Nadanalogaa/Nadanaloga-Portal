
# Nadanaloga Backend Server

## ⚠️ Important: Installing Dependencies

Any time you pull new changes from the repository, **check if the `package.json` file has been modified**. If it has, new packages (like `nodemailer` for sending emails) have been added. You **must** run the following command inside the `server` directory to install them:

```bash
npm install
```

Failing to do this will result in an `Error: Cannot find module '...'` crash when you try to start the server.

---

This folder contains the Express.js backend for the Nadanaloga Art Class Registration web application. It handles user registration, login, sessions, and contact form submissions, storing data in a MongoDB database.

## Prerequisites

-   [Node.js](https://nodejs.org/) (v14 or later recommended)
-   [npm](https://www.npmjs.com/) (comes with Node.js)
-   A [MongoDB](https://www.mongodb.com/) database. You can use a free cluster from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).

## Setup Instructions

### 1. Install Dependencies

Navigate to the `server` directory in your terminal and run the command shown in the "Important" section above.

```bash
npm install
```

### 2. Configure Environment Variables

The server requires a few environment variables to connect to the database and run securely.

-   In the `server` directory, create a file named `.env`.

-   Open the newly created `.env` file in a text editor and add the following variables:

    -   **`MONGO_URI`**: Replace the placeholder value with your actual MongoDB connection string. You can get this from your MongoDB Atlas dashboard.
    -   **`SESSION_SECRET`**: Replace the placeholder with a long, random, and secret string. This is crucial for securing user sessions.
    -   **`PORT`**: This is the port the backend server will run on. The default is `4000`.
    -   **`CLIENT_URL`**: **(Important for CORS)** The URL where your frontend is running. While the server has a whitelist of common development URLs (like `http://localhost:5173`), you should still set this variable if you are using a different port or deploying the application. Example: `CLIENT_URL=http://localhost:5173`

#### Email Configuration (Important!)
The server can send emails in two modes:

1.  **Testing Mode (Ethereal)**:
    -   This is the **default** if you do **not** provide `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` in your `.env` file.
    -   When the server starts, you will see a prominent warning in the console:
        ```
        --- ❗ EMAIL IS IN TEST MODE ❗ ---
        [Email] WARNING: SMTP environment variables (...) are missing in server/.env
        [Email] The server is using Ethereal, a *fake* email service for developers.
        [Email] >>> NO REAL EMAILS WILL BE SENT. <<<
        [Email] Instead, emails will be trapped and a "Preview URL" will be printed in this console.
        -------------------------------------
        ```
    -   **Ethereal emails are NOT sent to real inboxes.** Instead, when a notification is "sent", a "Preview URL" is printed in your server console. You must copy this link into your browser to see the email.
    -   **Example Console Log:** `[Email] ❗ TEST MODE: Email for student@example.com was INTERCEPTED. View it here: https://ethereal.email/message/...`

2.  **Live Mode (Real SMTP Server)**:
    -   To send real emails, you must provide your SMTP credentials in the `.env` file.
    -   **`SMTP_HOST`**: The hostname of your SMTP server (e.g., `smtp.gmail.com`).
    -   **`SMTP_PORT`**: The port for your SMTP server (e.g., `587` for TLS or `465` for SSL).
    -   **`SMTP_USER`**: Your SMTP username (usually your full email address).
    -   **`SMTP_PASS`**: Your SMTP password or an App-Specific Password (highly recommended for services like Gmail).
    -   **`SMTP_FROM_EMAIL`**: (Optional) The email address notifications will be sent from (e.g., `"Nadanaloga" <no-reply@nadanaloga.com>`).
    -   **Example Console Log:** `[Email] Notification sent to student@example.com. Message ID: <...>`

### 3. Start the Server

Once you have configured your `.env` file, you can start the server from within the `server` directory by running:

```bash
npm start
```

If everything is configured correctly, you will see messages in the console like:
`[Server] Node environment (NODE_ENV): not set (defaults to development)`
`[DB] MongoDB connected successfully.`

**Check the email configuration status in the console:**
-   If using a real SMTP server and the connection is successful, you will see: `[Email] ✅ SMTP connection verified.`
-   If the connection fails, you will see: `[Email] 🚨 EMAIL CONFIGURATION FAILED`. You must fix your `.env` settings for emails to work.
-   If in testing mode, you will see the explicit warning as shown above.

The backend is now ready, and the frontend application can communicate with it at `http://localhost:4000`.
