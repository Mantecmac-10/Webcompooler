import express from "express";
import Redis from "ioredis";
import { prisma } from "../../packages/db";

const app = express();
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

app.post("/submission", async function (req, res) {
  const code = req.body.code;
  const language = req.body.language;

  const response = await prisma.submissions.create({
    data: {
      language,
      code,
      status: "Processing",
    },
  });

  await redis.lpush(
    "problems",
    JSON.stringify({ submissionId: response.id, code, language }),
  );
  res.json({
    message: "processing..",
    id: response.id,
  });
});

app.get("/submission/:submissionId", async function (req, res) {
  const response = await prisma.submissions.findFirst({
    where: {
      id: req.params.submissionId,
    },
  });
  res.json({
    submission: response,
  });
});

app.listen(3000, () => {
  console.log("Server Started at http://localhost:3000");
});
