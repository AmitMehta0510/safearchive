const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const http = require("http");
const https = require("https");
const readline = require("readline");

function getCredentialsPath() {
  return path.join(os.homedir(), ".safearchive", "credentials.json");
}

async function getStoredCredentials() {
  try {
    const credPath = getCredentialsPath();
    const raw = await fs.readFile(credPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveStoredCredentials(data) {
  const credPath = getCredentialsPath();
  await fs.mkdir(path.dirname(credPath), { recursive: true });
  await fs.writeFile(credPath, JSON.stringify(data, null, 2), "utf8");
}

async function clearStoredCredentials() {
  try {
    await fs.unlink(getCredentialsPath());
    return true;
  } catch {
    return false;
  }
}

async function getStoredToken() {
  if (process.env.SAFEARCHIVE_TOKEN) {
    return process.env.SAFEARCHIVE_TOKEN.trim();
  }
  const creds = await getStoredCredentials();
  return creds ? creds.token : null;
}

function fetchApi(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === "https:" ? https : http;
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + (url.search || ""),
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: "Bearer " + options.token } : {}),
        ...(options.headers || {}),
      },
    };

    const req = lib.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function promptToken() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question("Enter your Personal Access Token (PAT): ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function login(options = {}) {
  const apiUrl = (options.url || process.env.SAFEARCHIVE_API_URL || "http://localhost:3000").replace(/\/$/, "");
  let token = options.token ? options.token.trim() : null;

  if (!token) {
    token = await promptToken();
  }

  if (!token) {
    console.error("fatal: Personal Access Token is required to authenticate.");
    return;
  }

  console.log(`Authenticating with ${apiUrl}...`);

  try {
    const res = await fetchApi(`${apiUrl}/user/me`, { token });
    if (res.status === 200 && res.body?.user) {
      const user = res.body.user;
      await saveStoredCredentials({
        apiUrl,
        userId: user._id,
        username: user.username,
        email: user.email,
        token,
        authType: res.body.authType || "pat",
        savedAt: new Date().toISOString(),
      });

      console.log(`\x1b[32m✓\x1b[0m Successfully authenticated as \x1b[1m${user.username}\x1b[0m (${user.email})`);
      console.log(`Credentials securely saved to: ${getCredentialsPath()}`);
    } else {
      console.error("\x1b[31mAuthentication failed:\x1b[0m", res.body?.message || res.body?.error || "Invalid token");
    }
  } catch (err) {
    console.error("Failed to connect to SafeArchive server:", err.message);
  }
}

async function whoami() {
  const creds = await getStoredCredentials();
  if (!creds || !creds.token) {
    console.log("Not logged in.");
    console.log("Run 'safearchive login' with your Personal Access Token (PAT) to authenticate.");
    return;
  }

  console.log(`SafeArchive Server: \x1b[36m${creds.apiUrl}\x1b[0m`);
  console.log(`Authenticated as:   \x1b[32m${creds.username}\x1b[0m (${creds.email})`);
  console.log(`Token Prefix:       ${creds.token.slice(0, 10)}...`);
  console.log(`Session Saved:      ${new Date(creds.savedAt).toLocaleString()}`);
}

async function logout() {
  const cleared = await clearStoredCredentials();
  if (cleared) {
    console.log("\x1b[32m✓\x1b[0m Successfully logged out. Saved credentials cleared.");
  } else {
    console.log("No stored credentials found.");
  }
}

async function createTokenCLI(name, options = {}) {
  const creds = await getStoredCredentials();
  const token = creds ? creds.token : process.env.SAFEARCHIVE_TOKEN;
  const apiUrl = creds ? creds.apiUrl : (process.env.SAFEARCHIVE_API_URL || "http://localhost:3000").replace(/\/$/, "");

  if (!token) {
    console.error("fatal: You must be logged in to create a token. Run 'safearchive login' first.");
    return;
  }

  const tokenName = (name || options.name || "CLI Token").trim();
  const days = options.days ? parseInt(options.days) : 30;

  try {
    const res = await fetchApi(`${apiUrl}/user/tokens`, {
      method: "POST",
      token,
      body: { name: tokenName, expiresInDays: days, scopes: ["repo", "read", "write"] },
    });

    if (res.status === 201 && res.body?.token) {
      console.log(`\x1b[32m✓\x1b[0m Token '\x1b[1m${tokenName}\x1b[0m' created successfully!`);
      console.log(`\n\x1b[33m${res.body.token}\x1b[0m\n`);
      console.log("Make sure to copy your personal access token now. You won’t be able to see it again!");
    } else {
      console.error("Failed to create token:", res.body?.error || res.body?.message);
    }
  } catch (err) {
    console.error("Error creating token:", err.message);
  }
}

module.exports = {
  login,
  whoami,
  logout,
  createTokenCLI,
  getStoredCredentials,
  getStoredToken,
  fetchApi,
  getCredentialsPath,
};