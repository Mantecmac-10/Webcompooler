import Redis from "ioredis";
import fs from "fs";
import { spawn } from "child_process";
import { prisma } from "../../packages/db";
import path from "path";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

async function processQueue() {
  while (1) {
    const response = await redis.rpop("problems");
    if (!response) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    const parsedResponse = JSON.parse(response);
    const code = parsedResponse.code;
    const language = parsedResponse.language;
    const submissionId = parsedResponse.submissionId;
    console.log("processing question for user");
    let finalOutput = "";

    if (language === "cpp") {
      console.log("Running user's C++ Code");

      const filePath = path.join(__dirname, "code", "a.cpp");
      const outputPath = path.join(__dirname, "code", "out.exe"); // Windows

      fs.writeFileSync(filePath, code);

      const responseCompiler = spawn("g++", [filePath, "-o", outputPath]);

      let exitCodeCompiler: number | null = null;

      responseCompiler.stderr.on("data", (chunk) => {
        const msg = chunk.toString();
        console.error(msg);
        finalOutput += msg;
      });

      responseCompiler.on("error", (err) => {
        console.error("Compiler error:", err);
      });

      await new Promise<void>((resolve) => {
        responseCompiler.on("exit", async (exitCode) => {
          exitCodeCompiler = exitCode;

          if (exitCode !== 0) {
            await prisma.submissions.update({
              where: {
                id: submissionId,
              },
              data: {
                status: "Faliure",
                output: finalOutput,
              },
            });
          }

          resolve();
        });
      });

      if (exitCodeCompiler !== 0) {
        continue;
      }

      finalOutput = "";

      const response = spawn(outputPath);

      response.stdout.on("data", (chunk) => {
        finalOutput += chunk.toString();
      });

      response.stderr.on("data", (chunk) => {
        finalOutput += chunk.toString();
      });

      response.on("error", (err) => {
        console.error("Execution error:", err);
      });

      await new Promise<void>((resolve) => {
        response.on("exit", async (exitCode) => {
          if (exitCode === 0) {
            await prisma.submissions.update({
              where: {
                id: submissionId,
              },
              data: {
                status: "Success",
                output: finalOutput,
              },
            });
          } else {
            await prisma.submissions.update({
              where: {
                id: submissionId,
              },
              data: {
                status: "Faliure",
                output: finalOutput,
              },
            });
          }

          resolve();
        });
      });
    }
    if (language === "js") {
      const filePath = path.join(__dirname, "code", "a.js");
      console.log("Running user's JS Code");
      fs.writeFileSync(filePath, code);
      const response = spawn("node", [filePath]);
      response.stdout.on("data", (chunk) => {
        finalOutput += chunk.toString();
      });
      await new Promise<void>((resolve) => {
        response.on("exit", async (exitCode) => {
          if (exitCode === 0) {
            await prisma.submissions.update({
              where: {
                id: submissionId,
              },
              data: {
                status: "Success",
                output: finalOutput,
              },
            });
          } else {
            await prisma.submissions.update({
              where: {
                id: submissionId,
              },
              data: {
                status: "Faliure",
              },
            });
          }
          resolve();
        });
      });
    }
    if (language === "python") {
      const filePath = path.join(__dirname, "code", "a.py");
      console.log("Running user's Python Code");
      fs.writeFileSync(filePath, code);
      const response = spawn("python3", [filePath]);
      response.stdout.on("data", (chunk) => {
        finalOutput += chunk.toString();
      });
      await new Promise<void>((resolve) => {
        response.on("exit", async (exitCode) => {
          if (exitCode === 0) {
            await prisma.submissions.update({
              where: {
                id: submissionId,
              },
              data: {
                status: "Success",
                output: finalOutput,
              },
            });
          } else {
            await prisma.submissions.update({
              where: {
                id: submissionId,
              },
              data: {
                status: "Faliure",
              },
            });
          }
          resolve();
        });
      });
    }
  }
}

await processQueue();
