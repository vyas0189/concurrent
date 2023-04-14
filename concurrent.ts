import axios, { AxiosInstance } from 'axios';
import axiosExtensions from 'axios-extensions';
import { Response } from 'express';
import Mutex from 'async-mutex/lib/Mutex';

interface TestData {
  [key: string]: any;
}

interface SSEData {
  outcome: string;
}

const http: AxiosInstance = axios.create({
  baseURL: 'http://api.example.com',
  adapter: axiosExtensions.httpAdapter,
  maxRedirects: 0,
  pool: {
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000,
    ttl: 60000,
  },
});

// Create a mutex to ensure thread safety
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

    let outcome = 'RUNNING';
    let retries = 0;

    while (outcome === 'RUNNING') {
      try {
        const promises = testData.map((data) => http.post('/api', data));
        const responses = await Promise.all(promises);

        for (const response of responses) {
          outcome = response.data.outcome;

          if (outcome === 'success' || outcome === 'failure') {
            sendSSE({ outcome });
          }
        }
      } catch (error) {
        console.error(error);

        if (retries >= 5) {
          // Maximum retries reached, aborting
          break;
        }

        // Calculate the exponential backoff delay
        const delay = Math.pow(2, retries) * 1000;
        retries++;

        console.log(`Retrying in ${delay} ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    res.end();
  } finally {
    // Release the mutex after the critical section is done
    release();
  }
};
