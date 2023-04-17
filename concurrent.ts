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

async function processTestData(testData: TestData): Promise<Outcome> {
  try {
    const outcome = await postData(testData);
    const polledOutcome = await pollOutcome(outcome.id);
    return polledOutcome;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function handleTestRequest(req: express.Request, res: Response) {
  const testData: TestData[] = req.body;
  res.setHeader("Content-Type", "text/event-stream");

  try {
    for (let i = 0; i < testData.length; i++) {
      const outcome = await processTestData(testData[i]);
      const event = outcome.outcome === "SUCCESS" ? "success" : "failure";
      const data = JSON.stringify(outcome);
      res.write(`event: ${event}\n`);
      res.write(`data: ${data}\n\n`);
    }
    res.end();
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
