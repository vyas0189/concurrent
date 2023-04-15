import axios, { AxiosInstance, AxiosResponse } from "axios";
import express, { Response } from "express";


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

// Create an instance of axios with the common options
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 5000 // set a timeout of 5 seconds for API calls
});

async function postData(testData: TestData): Promise<Outcome> {
  const url = "/data";
  const response = await axiosInstance.post(url, testData);
  return response.data;
}

async function getOutcome(id: string): Promise<Outcome> {
  const url = `/outcome/${id}`;
  const response = await axiosInstance.get(url);
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
  try {
    const outcome = await postData(testData);
    const polledOutcome = await pollOutcome(outcome.id);

    res.write(`id: ${outcome.id}\n`);
    res.write(`data: ${JSON.stringify(polledOutcome)}\n\n`);
  } catch (error) {
    console.error(error);
    res.write(`error: ${error.message}\n\n`);
  }
}

async function processTestDataSet(testData: TestData[], res: Response) {
  const batchSize = 10; // set the batch size to 10
  let batchStart = 0;

  while (batchStart < testData.length) {
    const batchEnd = Math.min(batchStart + batchSize, testData.length);
    const batchData = testData.slice(batchStart, batchEnd);
    const promises = batchData.map((testData) => processTestData(testData, res));

    // Use Promise.all() to send multiple requests at once
    await Promise.all(promises);

    batchStart += batchSize;
  }

  res.end();
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
