import express, { Request, Response } from 'express';
import axios, { AxiosInstance } from 'axios';
import Bottleneck from 'bottleneck';
import { Mutex } from 'async-mutex';

type TestData = {
  id: number;
  data: string;
};

type SSEData = {
  outcome: 'success' | 'failure';
};

const app = express();
const http: AxiosInstance = axios.create({ baseURL: 'http://localhost:3000' });
const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 1000 });
const mutex = new Mutex();

const postTestDataToApi = async (testData: TestData[], res: Response) => {
  // Acquire the mutex before executing the critical section
  const release = await mutex.acquire();

  try {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const sendSSE = (data: SSEData) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const retryRequest = async (data: TestData, retries = 0) => {
      try {
        const response = await http.post('/api', data);
        const outcome = response.data.outcome;

        if (outcome === 'success' || outcome === 'failure') {
          sendSSE({ outcome });
        } else if (outcome === 'RUNNING') {
          if (retries < 5) {
            console.log(`Request ${data.id} is still RUNNING, retrying in ${Math.pow(2, retries) * 1000} ms`);
            setTimeout(() => retryRequest(data, retries + 1), Math.pow(2, retries) * 1000);
          } else {
            console.log(`Request ${data.id} is still RUNNING after maximum retries reached, aborting`);
          }
        } else {
          console.log(`Request ${data.id} failed with outcome ${outcome}`);
        }
      } catch (error) {
        console.error(error);

        if (retries < 5) {
          console.log(`Request ${data.id} failed, retrying in ${Math.pow(2, retries) * 1000} ms`);
          setTimeout(() => retryRequest(data, retries + 1), Math.pow(2, retries) * 1000);
        } else {
          console.log(`Request ${data.id} failed after maximum retries reached, aborting`);
        }
      }
    };

    const batches = limiter.schedule(() => {
      const chunkSize = 10;
      const chunks = [];

      for (let i = 0; i < testData.length; i += chunkSize) {
        chunks.push(testData.slice(i, i + chunkSize));
      }

      return chunks.map((chunk) => Promise.all(chunk.map((data) => retryRequest(data))));
    });

    await Promise.all(batches);

    res.end();
  } finally {
    // Release the mutex after the critical section is done
    release();
  }
};

app.use(express.json());

app.post('/batch', async (req: Request, res: Response) => {
  const testData: TestData[] = req.body;

  try {
    await postTestDataToApi(testData, res);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000
