const http = require("http");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

const PORT = 8787;
const MODEL = "gemini-3.6-flash";

function loadKey() {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY.trim();
  }

  try {
    return fs.readFileSync(path.join(__dirname, "api-key.txt"), "utf8").trim();
  } catch {
    return "";
  }
}

function askKey() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("Gemini API key: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });

  res.end(JSON.stringify(data));
}

function cleanCode(text) {
  return String(text)
    .replace(/^```(?:cpp|c\+\+)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .replace(/^\s*\n/, "")
    .trimEnd();
}

async function askGemini(apiKey, prompt, currentCode) {
  const systemPrompt = `
Ты скрытый AI-помощник внутри C++ компилятора Abysa.

ТВОЯ ГЛАВНАЯ ЗАДАЧА:

Пользователь пишет команду:

//ai <запрос>

Ты должен выполнить этот запрос и вернуть код.

СТРОГИЕ ПРАВИЛА ОТВЕТА:

1. Возвращай ТОЛЬКО C++ код.
2. Никогда не пиши объяснения.
3. Не используй Markdown.
4. Не используй \`\`\`cpp.
5. Не пиши обычный текст до или после кода.
6. Не повторяй команду //ai.
7. Если пользователь просит функцию — верни функцию.
8. Если пользователь просит программу — верни программу.

СТИЛЬ:

Очень внимательно изучи существующий код пользователя.

Пиши код максимально похожим стилем:

- отступы делай 4 пробелами: первая строка без отступа, вложенные блоки на 4 пробела глубже;
- такие же скобки;
- такие же названия переменных;
- такой же стиль циклов;
- такой же стиль if/else;
- такой же уровень сложности;
- используй int, long long, string, vector так, как использует пользователь;
- если пользователь использует using namespace std — тоже используй;
- не добавляй сложные конструкции без необходимости;
- не переписывай существующий код без причины.

ТЕКУЩИЙ КОД ПОЛЬЗОВАТЕЛЯ:

${currentCode}
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },

      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: systemPrompt,
            },
          ],
        },

        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],

        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || `Gemini API error: ${response.status}`,
    );
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];

  let result = "";

  for (const part of parts) {
    if (part.text) {
      result += part.text;
    }
  }

  if (!result.trim()) {
    throw new Error("Gemini вернул пустой ответ");
  }

  return cleanCode(result);
}

async function main() {
  console.log("");
  console.log("=================================");
  console.log("        ABYSA AI SERVER");
  console.log("=================================");
  console.log("");

  const apiKey = loadKey() || (await askKey());

  if (!apiKey) {
    console.log("");
    console.log("Ошибка: API key пустой.");
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      });

      res.end();

      return;
    }

    if (req.method !== "POST" || req.url !== "/api/ai") {
      sendJSON(res, 404, {
        error: "Not found",
      });

      return;
    }

    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);

        const prompt = String(data.prompt || "").trim();

        const currentCode = String(data.code || "");

        if (!prompt) {
          sendJSON(res, 400, {
            error: "Пустой запрос",
          });

          return;
        }

        const code = await askGemini(apiKey, prompt, currentCode);

        sendJSON(res, 200, {
          code: code,
        });
      } catch (error) {
        console.error(error);

        sendJSON(res, 500, {
          error: error.message,
        });
      }
    });
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log("");
    console.log("AI сервер запущен!");
    console.log("");
    console.log(`http://127.0.0.1:${PORT}`);
    console.log("");
    console.log("Теперь НЕ закрывай этот Terminal.");
    console.log("");
  });
}

main();