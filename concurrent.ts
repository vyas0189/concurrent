import axios, { AxiosResponse } from "axios";
import express, { Response } from "express";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

const pool = new Pool();

interface TestData {
  id: string;
  data: string;
}

interface Outcome {
  id: string;
  outcome: string;
}

const API_URL = "https://example.com/api";
const RETRY_DELAY = 1000;
const MAX_RETRIES = 10;

async function postData(testData: TestData): Promise<Outcome> {
  const url = `${API_URL}/data`;
  const response = await axios.post(url, testData);
  return response.data;
}

async function getOutcome(id: string): Promise<Outcome> {
  const url = `${API_URL}/outcome/${id}`;
  const response = await axios.get(url);
  return response.data;
}

async function pollOutcome(id: string): Promise<Outcome> {
  let retries = 0;
  let outcome = await getOutcome(id);

  while (outcome.outcome === "RUNNING" && retries < MAX_RETRIES) {
    const backoffDelay = RETRY_DELAY * 2 ** retries;
    await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    outcome = await getOutcome(id);
    retries++;
  }

  return outcome;
}

async function processTestData(testData: TestData, res: Response) {
  const outcome = await postData(testData);
  const polledOutcome = await pollOutcome(outcome.id);

  res.write(`id: ${outcome.id}\n`);
  res.write(`data: ${JSON.stringify(polledOutcome)}\n\n`);

  res.flush();
}

async function processTestDataSet(testData: TestData[], res: Response) {
  try {
    const promises = testData.map((testData) => processTestData(testData, res));
    await Promise.all(promises);
  } catch (error) {
    console.error(error);
  } finally {
    res.end();
  }
}

async function handleTestRequest(req: express.Request, res: Response) {
  const testData: TestData[] = req.body;
  res.setHeader("Content-Type", "text/event-stream");

  try {
    await processTestDataSet(testData, res);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
}

const app = express();

app.use(express.json());

app.post("/test", handleTestRequest);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
