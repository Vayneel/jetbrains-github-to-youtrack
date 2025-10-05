# 🚀 GitHub → YouTrack Synchronization

This tool provides **one-way or live synchronization** from **GitHub issues** to **YouTrack issues** using webhooks.  
It supports both **initial bulk imports** and **real-time updates** when issues are edited on GitHub.

---

## ⚙️ Setup

### 1. Choose How to Run

You can run this project in two ways:

#### 🟢 Option A (Recommended): GitHub Codespaces
The easiest and fastest way to get started — **no local setup needed**.

GitHub provides a live public URL for webhooks automatically.

**Steps:**
1. Open the repository on GitHub.
2. Click **“Code → Open with Codespaces → New Codespace”**.
3. Wait for your environment to initialize.
4. Your Codespace will run on a public URL like:
   ```
   https://your-codespace-id-3000.app.github.dev
   ```

#### ⚙️ Option B: Run Locally
If you prefer local development:
```bash
git clone https://github.com/<your-username>/github-to-youtrack.git
cd github-to-youtrack
npm install
```

💡 For local setups, you’ll need a tunneling service (e.g., **ngrok**),  
but **Codespaces is simpler and preferred**.

---

### 2. Configure Environment Variables

Duplicate the provided example file and fill in your credentials:

```bash
cp .env.example .env
```

Then open `.env` and set the required values:

```bash
# 🔐 Required configuration — must be provided for the app to function
GITHUB_TOKEN=github_pat_...             # GitHub personal access token (see below)
GITHUB_OWNER=YourGitHubUsername         # Your GitHub username or organization
GITHUB_REPO=YourRepositoryName          # Repository to sync from
YOUTRACK_BASE_URL=https://example.youtrack.cloud  # Your YouTrack base URL
YOUTRACK_TOKEN=perm-...                 # YouTrack permanent token (see below)
GITHUB_WEBHOOK_SECRET=supersecret       # Secret for verifying GitHub webhooks

# ⚠️ Conditional configuration — at least one of these must be set
YOUTRACK_PROJECT_SHORTNAME=ABC          # YouTrack project short name (e.g., "ABC")
YOUTRACK_PROJECT_ID=0-1                 # OR YouTrack project ID (e.g., "0-1")

# 🧪 Optional configuration
WEBHOOK_PORT=3000                       # Default webhook port
GITHUB_API_URL="https://api.github.com" # Default GitHub API endpoint
```

---

### 3. Generate Required Tokens

#### 🔹 GitHub Personal Access Token (PAT)

1. Go to **[GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)**.  
2. Click **“Generate new token (classic)”**.
3. Select the following scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `read:org` (if working with organization repositories)
   - ✅ `issues`
4. Copy your token and paste it into `.env` as `GITHUB_TOKEN`.

#### 🔹 YouTrack Permanent Token

1. In YouTrack, click your profile icon → **Profile → Authentication**.
2. Under **Permanent Tokens**, click **New Token**.
3. Choose **Scope:** *YouTrack → All permissions* (or at least issue read/write).
4. Copy the generated token and set it as `YOUTRACK_TOKEN` in `.env`.

---

### 4. Install Dependencies

Install all required packages:

```bash
npm install
```

If you plan to make code changes:

```bash
npm run prepare
```

This sets up **Husky** for linting and pre-commit hooks.

---

## 🏃 Running the Program

You can run the synchronization in different modes:

| Command | Description |
|----------|-------------|
| `npm run start` | One-time import — transfers all existing GitHub issues to YouTrack |
| `npm run webhook` | Starts a webhook server for real-time sync when issues are created or updated |
| `npm run webhook:dev` | Same as above, but with automatic restarts (useful during development) |

---

## 🔗 Connecting the Webhook (GitHub → YouTrack)

If you’re running the program inside **GitHub Codespaces**, your webhook endpoint will already be publicly accessible.

1. Go to your **GitHub repository → Settings → Webhooks → Add webhook**.  
2. Set the following values:

   | Field | Value |
   |--------|-------|
   | **Payload URL** | `https://<your-codespace-id>-3000.app.github.dev/webhook` |
   | **Content type** | `application/json` |
   | **Secret** | same as `GITHUB_WEBHOOK_SECRET` in your `.env` |
   | **Events** | Select **“Issues”** |
   | **Active** | ✅ Checked |

3. Save the webhook.

---

## 🧪 Checking Functionality

1. Run the server (recommended mode):

   ```bash
   npm run webhook
   ```

2. In your GitHub repository (the one defined in `.env`), **create a new issue** or **edit an existing one**.
3. You should see logs similar to:
   ```
   [INFO] Received GitHub webhook: issues
   [INFO] Created new YouTrack issue for GitHub issue #5
   ```
4. Verify that the issue appears in your YouTrack project.

To confirm your server is healthy, open in your browser:
```
GET https://<your-codespace-id>-3000.app.github.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "youtrackProjectId": "X-X"
}
```

---

## 🔍 How It Works

1. **External ID Mapping:** Each GitHub issue is assigned an external ID like  
   `github:owner/repo#issue_number`.
2. **Lookup:** On every webhook event, the system checks YouTrack for an existing issue by external ID.
3. **Create or Update:**  
   - If the issue exists → it’s **updated**.  
   - Otherwise → a **new issue** is created.

---

## 🔒 Security

- Every webhook request is verified using **HMAC-SHA256 signatures**.  
- Always use a **strong `GITHUB_WEBHOOK_SECRET`**.  
- Never commit your `.env` file or share your tokens.

---

✅ **Quick Summary**

1. Open project in **GitHub Codespaces** (recommended).  
2. Copy `.env.example` → `.env` and fill required values.  
3. Run:
   ```bash
   npm install
   npm run webhook
   ```
4. Add a webhook in GitHub pointing to  
   `https://<your-codespace-id>-3000.app.github.dev/webhook`.  
5. Test by creating or editing issues.  
6. Confirm synchronization and check `/health`.

---