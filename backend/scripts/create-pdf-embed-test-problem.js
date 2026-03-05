const fs = require("fs");
const path = require("path");
const os = require("os");
const tar = require("tar");
const fetch = require("node-fetch");
const FormData = require("form-data");

const API_URL = process.env.API_URL || "http://localhost:8787/api";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWD || "admin1234";
const PDF_URL =
  process.env.PDF_URL ||
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

const TEMPLATE_PATH = path.join(__dirname, "../docs/example/tps-example");
const PROBLEM_DIR_NAME = "pdf-embed-test-problem";
const PROBLEM_TITLE = "PDF Embed Viewer Test";

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function login() {
  const response = await fetch(`${API_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }
  return response.headers.get("set-cookie");
}

async function createProblem() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template path not found: ${TEMPLATE_PATH}`);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-embed-problem-"));
  const problemDir = path.join(tempDir, PROBLEM_DIR_NAME);

  try {
    copyDir(TEMPLATE_PATH, problemDir);

    const problemJsonPath = path.join(problemDir, "problem.json");
    const descriptionPath = path.join(problemDir, "statement/description.md");
    const tarPath = path.join(tempDir, `${PROBLEM_DIR_NAME}.tar.gz`);

    if (fs.existsSync(problemJsonPath)) {
      const problemJson = JSON.parse(fs.readFileSync(problemJsonPath, "utf-8"));
      problemJson.code = PROBLEM_DIR_NAME;
      problemJson.title = PROBLEM_TITLE;
      problemJson.tags = ["markdown", "pdf", "viewer", "embed"];
      fs.writeFileSync(problemJsonPath, JSON.stringify(problemJson, null, 4));
    }

    const desc = `# ${PROBLEM_TITLE}

This problem exists to test markdown PDF embedding in the description renderer.

## PDF Attachment

[Open the PDF statement](${PDF_URL})

## Expected Behavior

- The link above should render as an embedded PDF viewer.
- Users should still be able to open it in a new tab.
`;
    fs.writeFileSync(descriptionPath, desc);

    await tar.c(
      {
        gzip: true,
        file: tarPath,
        cwd: tempDir,
      },
      [PROBLEM_DIR_NAME]
    );

    const cookie = await login();
    const formData = new FormData();
    formData.append("problem", fs.createReadStream(tarPath), {
      filename: `${PROBLEM_DIR_NAME}.tar.gz`,
      contentType: "application/gzip",
    });

    const response = await fetch(`${API_URL}/problems`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Create problem failed: ${response.status} ${text}`);
    }

    console.log("Problem created successfully.");
    console.log(`Title: ${PROBLEM_TITLE}`);
    console.log(`Server response: ${text}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

createProblem().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
