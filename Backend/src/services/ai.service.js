const Groq = require("groq-sdk");
const { z } = require("zod");          // ✅ FIX 1: removed unused `config` import from zod
const puppeteer = require("puppeteer"); // ✅ FIX 2: removed unused `zodToJsonSchema` import

if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY is not set in environment variables");
    process.exit(1);
}

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "meta-llama/llama-4-scout-17b-16e-instruct",
];

const MODEL_MAX_TOKENS = {
    "llama-3.3-70b-versatile": 8192,
    "llama-3.1-8b-instant": 4096,
    "meta-llama/llama-4-scout-17b-16e-instruct": 8192,
};

let modelName = MODELS[0];
let isInitialized = false;

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function truncateText(text, maxChars = 3000) {
    if (!text || text.length <= maxChars) return text;
    return text.slice(0, maxChars) + "\n...[truncated]";
}

function isQuotaError(error) {
    const msg = error?.message || "";
    return (
        error?.status === 429 ||
        error?.status === 413 ||
        msg.includes("rate limit") ||
        msg.includes("quota") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("Request too large") ||
        msg.includes("tokens per minute") ||
        msg.includes("reduce your message size")
    );
}

function isModelNotFoundError(error) {
    const msg = error?.message || "";
    return (
        error?.status === 404 ||
        msg.includes("not found") ||
        msg.includes("NOT_FOUND") ||
        msg.includes("not supported") ||
        msg.includes("decommissioned") ||
        error?.error?.error?.code === "model_decommissioned"
    );
}

async function initializeGeminiAI() {
    console.log("→ Initializing Groq AI...");
    try {
        await client.chat.completions.create({
            model: modelName,
            max_tokens: 10,
            messages: [{ role: "user", content: "hi" }]
        });
        console.log("✓ Groq AI connected successfully");
        console.log(`✓ Active model: ${modelName}`);
        isInitialized = true;
        return true;
    } catch (error) {
        console.error("✗ Failed to connect to Groq AI:", error.message);
        isInitialized = false;
        return false;
    }
}

async function tryGenerateContent(model, prompt) {
    const response = await client.chat.completions.create({
        model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }]
    });
    return response.choices[0].message.content;
}

async function generateContent(prompt, retries = 3, retryDelay = 25000) {
    if (!prompt || typeof prompt !== "string") {
        throw new Error("Invalid prompt: must be a non-empty string");
    }
    if (!isInitialized) {
        throw new Error("Groq AI is not initialized. Check your API key.");
    }
    for (const model of MODELS) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`→ Trying model: ${model} (attempt ${attempt}/${retries})`);
                const text = await tryGenerateContent(model, prompt);
                modelName = model;
                return text;
            } catch (error) {
                if (isModelNotFoundError(error)) {
                    console.warn(`✗ Model not available: ${model}. Skipping...`);
                    break;
                } else if (isQuotaError(error)) {
                    if (attempt < retries) {
                        console.warn(`⚠ Rate limit on ${model}. Retrying in ${retryDelay / 1000}s...`);
                        await delay(retryDelay);
                    } else {
                        console.warn(`✗ All retries exhausted for ${model}. Trying next model...`);
                    }
                } else {
                    console.error(`✗ Unexpected error on ${model}:`, error.message);
                    throw error;
                }
            }
        }
    }
    throw new Error("All Groq models exhausted.");
}

function getActiveModel() { return modelName; }
function getIsInitialized() { return isInitialized; }

function extractAnswerString(answer) {
    if (typeof answer === 'string') return answer;
    if (typeof answer === 'object' && answer !== null) {
        const keys = Object.keys(answer);
        if (keys.length === 1) return keys[0];
        const values = Object.values(answer).filter(v => typeof v === 'string');
        if (values.length > 0) return values.join(' ');
        return JSON.stringify(answer);
    }
    if (Array.isArray(answer)) return answer.join(' ');
    return String(answer ?? '');
}

// --- Interview Report Schema ---
const interviewReportSchema = z.object({
    title: z.string(),
    matchScore: z.number().min(0).max(100),
    technicalQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string(),
    })),
    behaviouralQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string(),
    })),
    skillgaps: z.array(z.object({
        skill: z.string(),
        severity: z.enum(["low", "medium", "high"]),
    })),
    preparationPlan: z.array(z.object({
        day: z.coerce.number(),
        focus: z.string(),
        tasks: z.array(z.string()),
    })),
});

// Attempts to fix truncated JSON by closing open structures
function repairTruncatedJson(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        let repaired = str.trimEnd();

        repaired = repaired.replace(/,\s*\{[^}]*$/, '');
        repaired = repaired.replace(/,\s*"[^"]*":\s*[^,}\]]*$/, '');
        repaired = repaired.replace(/,\s*"[^"]*"$/, '');

        const openCurly = (repaired.match(/\{/g) || []).length;
        const closeCurly = (repaired.match(/\}/g) || []).length;
        const openSquare = (repaired.match(/\[/g) || []).length;
        const closeSquare = (repaired.match(/\]/g) || []).length;

        const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
        if (quoteCount % 2 !== 0) repaired += '"';

        repaired += ']'.repeat(Math.max(0, openSquare - closeSquare));
        repaired += '}'.repeat(Math.max(0, openCurly - closeCurly));

        try {
            return JSON.parse(repaired);
        } catch (e2) {
            return null;
        }
    }
}

async function tryGenerateInterviewReport(model, prompt) {
    const response = await client.chat.completions.create({
        model,
        max_tokens: MODEL_MAX_TOKENS[model] ?? 4096,
        messages: [
            {
                role: "system",
                content: `You are an expert interview coach. Analyze the provided resume, job description, and self description.

Return ONLY a valid JSON object with NO markdown, NO code fences, NO extra text outside the JSON.

The JSON must have exactly these fields:
- title: string
- matchScore: number (0-100)
- technicalQuestions: array of { question: string, intention: string, answer: string } — LIMIT TO 5 questions max
- behaviouralQuestions: array of { question: string, intention: string, answer: string } — LIMIT TO 5 questions max
- skillgaps: array of { skill: string, severity: "low" | "medium" | "high" } — LIMIT TO 5 items max
- preparationPlan: array of { day: number, focus: string, tasks: string[] } — LIMIT TO 7 days max

IMPORTANT:
- Every "answer" field must be a plain SHORT STRING (2-3 sentences max), not an object or array.
- Keep all text concise to avoid truncation.
- Do not add any text before or after the JSON.`
            },
            {
                role: "user",
                content: prompt
            }
        ]
    });

    const raw = response.choices[0].message.content;

    const finishReason = response.choices[0].finish_reason;
    if (finishReason === 'length') {
        console.warn(`⚠ Response truncated (finish_reason: length) on model: ${model}. Attempting JSON repair...`);
    }

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`No JSON found in model response: ${raw.slice(0, 200)}`);

    let parsed;
    try {
        parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
        const repaired = repairTruncatedJson(jsonMatch[0]);
        if (!repaired) {
            throw new Error(`Failed to parse JSON: ${jsonMatch[0].slice(0, 200)}`);
        }
        console.warn("⚠ Used repaired JSON — some data may be incomplete");
        parsed = repaired;
    }

    const unwrapped =
        parsed.matchScore !== undefined ? parsed
            : parsed.report ? parsed.report
                : parsed.interviewReport ? parsed.interviewReport
                    : parsed.data ? parsed.data
                        : Object.values(parsed)[0];

    const normalized = {
        ...unwrapped,
        title: String(unwrapped.title ?? ''),
        matchScore: Number(unwrapped.matchScore ?? 0),
        technicalQuestions: (unwrapped.technicalQuestions ?? []).map(q => ({
            question: String(q.question ?? ''),
            intention: String(q.intention ?? ''),
            answer: extractAnswerString(q.answer),
        })),
        behaviouralQuestions: (unwrapped.behaviouralQuestions ?? []).map(q => ({
            question: String(q.question ?? ''),
            intention: String(q.intention ?? ''),
            answer: extractAnswerString(q.answer),
        })),
        skillgaps: (unwrapped.skillgaps ?? unwrapped.skillGaps ?? unwrapped.skill_gaps ?? [])
            .map(gap => ({
                skill: String(gap.skill ?? ''),
                severity: String(gap.severity ?? 'low').toLowerCase(),
            })),
        preparationPlan: (unwrapped.preparationPlan ?? unwrapped.preparation_plan ?? [])
            .map((item, index) => ({
                day: parseInt(String(item.day).replace(/[^0-9]/g, '')) || (index + 1),
                focus: String(item.focus ?? item.focusArea ?? item.focus_area ?? ''),
                tasks: Array.isArray(item.tasks)
                    ? item.tasks.map(String)
                    : [String(item.task ?? '')].filter(Boolean),
            })),
    };

    return interviewReportSchema.parse(normalized);
}

async function generateInterviewReport(resume, jobDescribe, selfDescription, retries = 3, retryDelay = 25000) {
    const safeResume = truncateText(resume, 3000);
    const safeJobDesc = truncateText(jobDescribe, 1000);
    const safeSelfDesc = truncateText(selfDescription, 500);

    const prompt = `Analyze the following and generate a comprehensive interview report.

Candidate Resume:
${safeResume}

Job Description:
${safeJobDesc}

Self Description:
${safeSelfDesc}`;

    if (!isInitialized) {
        throw new Error("Groq AI is not initialized. Check your API key.");
    }

    for (const model of MODELS) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`→ [Report] Trying model: ${model} (attempt ${attempt}/${retries})`);
                const result = await tryGenerateInterviewReport(model, prompt);
                modelName = model;
                console.log(`✓ [Report] Generated successfully with model: ${model}`);
                return result;
            } catch (error) {
                if (isModelNotFoundError(error)) {
                    console.warn(`✗ [Report] Model not available: ${model}. Skipping...`);
                    break;
                } else if (isQuotaError(error)) {
                    if (attempt < retries) {
                        console.warn(`⚠ [Report] Rate limit on ${model}. Retrying in ${retryDelay / 1000}s...`);
                        await delay(retryDelay);
                    } else {
                        console.warn(`✗ [Report] All retries exhausted for ${model}. Trying next model...`);
                    }
                } else {
                    // ✅ FIX 6: was `throw error` — propagated crash instead of trying next model
                    console.warn(`✗ [Report] Unexpected error on ${model}:`, error.message);
                    break; // try next model instead of crashing
                }
            }
        }
    }

    throw new Error("All Groq models exhausted for report generation.");
}

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await page.addStyleTag({
    content: `
    body {
      line-height: 1.2; /* adjust this value */
    }
    `
});
    const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '10mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });
    await browser.close();
    return pdfBuffer;
}

async function detectResumeStyle(resumeText, model) {
    const prompt = `Analyze this resume text and detect its layout and style characteristics.

Resume Text:
${resumeText}

Return ONLY a valid JSON object with NO markdown, NO code fences:
{
  "layout": "single-column",
  "style": "minimal",
  "colorScheme": "monochrome",
  "sectionOrder": ["summary", "experience", "education", "skills", "projects"],
  "hasPhoto": false,
  "headerStyle": "centered",
  "skillsStyle": "categories",
  "bulletStyle": "dot",
  "fontStyle": "sans-serif",
  "density": "comfortable",
  "sidebarSections": []
}

Pick one value for each field from these options:
- layout: "single-column" | "two-column" | "hybrid"
- style: "minimal" | "modern" | "classic" | "creative" | "academic"
- colorScheme: "monochrome" | "blue-accent" | "dark-header" | "colored-sidebar" | "green-accent" | "red-accent"
- headerStyle: "centered" | "left-aligned" | "split"
- skillsStyle: "tags" | "list" | "categories" | "bar-ratings"
- bulletStyle: "dash" | "dot" | "arrow" | "none"
- fontStyle: "serif" | "sans-serif"
- density: "compact" | "comfortable" | "spacious"

sectionOrder: only include sections that actually exist in the resume, in the order they appear.
sidebarSections: only relevant if layout is two-column or hybrid.`;

    const response = await client.chat.completions.create({
        model,
        max_tokens: 512,
        messages: [
            {
                role: "system",
                content: "You are a resume design analyst. Detect layout and style from resume text. Return ONLY valid JSON."
            },
            { role: "user", content: prompt }
        ]
    });

    const raw = response.choices[0].message.content;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in style detection response");
    return JSON.parse(jsonMatch[0]);
}

async function extractResumeData(resumeText, model) {
    const prompt = `Extract all structured data from this resume. Return ONLY valid JSON, no markdown, no code fences.

Resume Text:
${resumeText}

Return this exact structure (use empty arrays [] or empty strings "" for missing fields):
{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin": "",
  "github": "",
  "portfolio": "",
  "website": "",
  "summary": "",
  "objective": "",
  "experience": [
    {
      "company": "",
      "role": "",
      "duration": "",
      "location": "",
      "points": []
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "duration": "",
      "gpa": "",
      "achievements": []
    }
  ],
  "skills": {
    "technical": [],
    "tools": [],
    "frameworks": [],
    "databases": [],
    "cloud": [],
    "soft": [],
    "other": []
  },
  "projects": [
    {
      "name": "",
      "tech": "",
      "link": "",
      "points": []
    }
  ],
  "certifications": [],
  "achievements": [],
  "languages": [],
  "publications": [],
  "volunteer": [],
  "interests": [],
  "references": ""
}`;

    const response = await client.chat.completions.create({
        model,
        max_tokens: MODEL_MAX_TOKENS[model] ?? 4096, // ✅ FIX 7: was hardcoded 4096 for all models
        messages: [
            {
                role: "system",
                content: "You are a resume parser. Extract all data accurately. Return ONLY valid JSON."
            },
            { role: "user", content: prompt }
        ]
    });

    const raw = response.choices[0].message.content;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in extraction response");
    return JSON.parse(jsonMatch[0]);
}

async function enhanceResumeData(extractedData, jobDescription, selfDescription, model) {
    // const prompt = `
    //     Enhance this resume data to better match the job description while keeping the candidate's authentic experience.

    //     Resume Data:
    //     ${JSON.stringify(extractedData, null, 2)}

    //     Job Description:
    //     ${jobDescription || "Not provided"}

    //     Self Description:
    //     ${selfDescription || "Not provided"}

    //     Rules:
    //     - Rewrite summary/objective to align with job description
    //     - Enhance experience bullet points with metrics/impact where logical
    //     - Reorder skills to highlight job-relevant ones first
    //     - Keep all original sections and data intact — only improve wording
    //     - Do NOT add fake experience or skills
    //     - Return ONLY valid JSON with the exact same structure as input. No markdown, no code fences.`;

//     const prompt = `
// Enhance and optimize this resume to be ATS-friendly, keyword-optimized, and professionally structured while preserving the candidate's authentic experience.

// Resume Data:
// ${JSON.stringify(extractedData, null, 2)}

// Job Description:
// ${jobDescription || "Not provided"}

// Self Description:
// ${selfDescription || "Not provided"}

// Goals:
// - Improve clarity, impact, and ATS compatibility
// - Align resume with job description using relevant keywords
// - Maintain truthfulness — DO NOT invent experience, tools, or skills

// Strict Rules:
// 1. Output must be ONLY valid JSON with the EXACT same structure as input
// 2. Do NOT add or remove sections
// 3. Do NOT fabricate experience, metrics, or skills
// 4. Improve wording, not meaning

// ATS Optimization Rules:
// - Use standard section titles (e.g., "Summary", "Experience", "Skills", "Education")
// - Avoid special characters, icons, or decorative formatting
// - Use simple, clean, recruiter-friendly language
// - Ensure consistent tense (past for previous roles, present for current role)

// Summary/Objective:
// - Rewrite to align strongly with the job description
// - Include 2–4 key skills or keywords from the job description
// - Keep it concise (3–4 lines max)
// - Focus on value proposition

// Experience Section:
// - Rewrite bullet points using this structure:
// → Action Verb + Task + Tool/Skill + Impact (with metrics if available or logically inferred)
// - Start each bullet with strong action verbs (e.g., Built, Led, Optimized, Developed)
// - Add measurable impact where reasonable (%, time saved, performance improvement)
// - Prioritize achievements over responsibilities

// Skills Section:
// - Reorder skills to match job description relevance
// - Group logically (e.g., Languages, Frameworks, Tools)
// - Ensure important keywords from job description appear if already present in resume

// Keyword Optimization:
// - Incorporate relevant keywords naturally from job description
// - Avoid keyword stuffing
// - Ensure ATS readability

// Final Output:
// - Return ONLY JSON
// - Keep formatting clean and consistent
// - No markdown, no explanations
// `;
    const prompt = `
        You are an ATS resume optimizer.

Your task:
Improve resume content but DO NOT design layout.

Return ONLY valid JSON matching this EXACT structure.
Do not add fields. Do not remove fields.

IMPORTANT:
This JSON will be rendered using a fixed ATS resume template.
Only improve wording and keyword optimization.

Input Resume JSON:
${JSON.stringify(extractedData, null, 2)}

Job Description:
${jobDescription || "Not provided"}

Self Description:
${selfDescription || "Not provided"}

Rules:

* Return ONLY JSON
* Keep exact structure
* No markdown
* No explanations
* No new sections
* No fake experience
* No special formatting

Content Rules:

Summary:

* 3–4 lines
* Include job description keywords
* Professional tone

Experience / Projects:
Rewrite bullets using:
Action Verb + Task + Tech + Impact

Skills:

* Reorder based on job description relevance
* Keep same skills only

Output:
Return ONLY JSON
    `

    const response = await client.chat.completions.create({
        model,
        max_tokens: MODEL_MAX_TOKENS[model] ?? 4096, // ✅ FIX 8: was hardcoded 4096 for all models
        messages: [
            {
                role: "system",
                content: "You are a professional resume writer. Enhance resume content for job fit. Return ONLY valid JSON with the same structure."
            },
            { role: "user", content: prompt }
        ]
    });

    const raw = response.choices[0].message.content;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in enhancement response");
    return JSON.parse(jsonMatch[0]);
}

async function buildHtmlFromStyle(resumeData, styleInfo, model) {
    const prompt = `You are an expert HTML/CSS resume designer. Build a pixel-perfect resume HTML that matches this exact style:

Style Requirements:
${JSON.stringify(styleInfo, null, 2)}

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Critical Rules:
1. Match the layout EXACTLY: ${styleInfo.layout} layout
2. Match the style: ${styleInfo.style}
3. Color scheme: ${styleInfo.colorScheme}
4. Header alignment: ${styleInfo.headerStyle}
5. Skills display: ${styleInfo.skillsStyle}
6. Font family: ${styleInfo.fontStyle}
7. Spacing: ${styleInfo.density}
8. Section order must be: ${(styleInfo.sectionOrder || []).join(' → ')}
${styleInfo.layout !== 'single-column' ? `9. Sidebar sections: ${(styleInfo.sidebarSections || []).join(', ')}` : ''}

Technical Rules:
- Use ONLY inline CSS (no <style> tags, no external CSS)
- Must fit on A4 page (210mm × 297mm)
- ATS-friendly: no text in images, no complex tables
- All font sizes between 10px-22px
- Include ALL sections from the resume data
- Return ONLY a JSON object: { "html": "<full html string>" }
- No markdown, no code fences, no extra text outside JSON`;

    const response = await client.chat.completions.create({
        model,
        max_tokens: MODEL_MAX_TOKENS[model] ?? 4096, // ✅ FIX 9: was hardcoded 8192, exceeds small model limits
        messages: [
            {
                role: "system",
                content: "You are an expert resume HTML builder. Recreate resume templates from style descriptions. Return ONLY valid JSON with an 'html' field."
            },
            { role: "user", content: prompt }
        ]
    });

    const raw = response.choices[0].message.content;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in HTML generation response");

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.html) throw new Error("AI returned empty HTML");
    return parsed.html;
}

// Helper to run a step with model fallback
async function runWithModelFallback(stepName, fn) {
    for (const model of MODELS) {
        try {
            console.log(`→ [ResumePDF][${stepName}] Trying model: ${model}`);
            const result = await fn(model);
            console.log(`✓ [ResumePDF][${stepName}] Success with: ${model}`);
            return result;
        } catch (error) {
            if (isModelNotFoundError(error)) {
                console.warn(`✗ Model not available: ${model}. Skipping...`);
                continue;
            }
            if (isQuotaError(error)) {
                console.warn(`✗ Rate limit on ${model}. Trying next...`);
                continue;
            }
            // ✅ FIX 10: was `throw error` — now logs and tries next model
            console.warn(`✗ [${stepName}] Error on ${model}:`, error.message, "Trying next...");
            continue;
        }
    }
    throw new Error(`All models exhausted for step: ${stepName}`);
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    if (!resume) throw new Error("Resume text is required for PDF generation");

    console.log("→ [ResumePDF] Starting parallel style detection + data extraction...");
    const [styleInfo, extractedData] = await Promise.all([
        runWithModelFallback("StyleDetect", (model) => detectResumeStyle(resume, model)),
        runWithModelFallback("ExtractData", (model) => extractResumeData(resume, model)),
    ]);

    console.log(`✓ [ResumePDF] Detected style: ${styleInfo.style} | layout: ${styleInfo.layout}`);

    const enhancedData = await runWithModelFallback(
        "Enhance",
        (model) => enhanceResumeData(extractedData, jobDescription, selfDescription, model)
    ).catch(() => {
        console.warn("⚠ Enhancement failed, using extracted data as-is");
        return extractedData;
    });

    const html = await runWithModelFallback(
        "BuildHTML",
        (model) => buildHtmlFromStyle(enhancedData, styleInfo, model)
    );

    console.log("→ [ResumePDF] Generating PDF with Puppeteer...");
    const pdfBuffer = await generatePdfFromHtml(html);
    console.log("✓ [ResumePDF] PDF generated successfully");

    return pdfBuffer;
}

module.exports = {
    initializeGeminiAI,
    generateContent,
    getActiveModel,
    getIsInitialized,
    generateInterviewReport,
    generateResumePdf
};