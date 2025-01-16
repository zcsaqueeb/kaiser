import * as Upils from "./utils/exporter.js";
import headers from "./utils/headers.js";
// import setup from "./setup.js";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { fileURLToPath } from "url"; // Import necessary functions for file URL conversion
import { dirname } from "path"; // Import necessary functions for path manipulation

const __filename = fileURLToPath(import.meta.url); // Get the current module's filename
const __dirname = dirname(__filename);

class Kaisar {
  constructor(queryId, accountIndex, proxy, extensionId) {
    this.queryId = queryId;
    this.accountIndex = accountIndex;
    this.extensionId = extensionId || null;
    this.proxy = proxy;
    this.proxyIp = "Unknown IP";
  }

  async pingAndUpdate(token, extensionId, proxy) {
    const agent = new Upils.HttpsProxyAgent(proxy);

    const apiClient = Upils.axios.create({
      baseURL: "https://zero-api.kaisar.io/",
      headers: headers(token),
      agent,
    });

    try {
      const response = await apiClient.post("/extension/ping", {
        extension: extensionId,
      });

      Upils.logger(`[${extensionId}] Ping response:`, "info", response.data.data);
      await Upils.getMiningData(apiClient, extensionId);
    } catch (error) {
      Upils.logger(`[${extensionId}] Ping error with proxy ${proxy}`, "error");
    }
  }

  async runAccount() {
    const lastExecution = {};

    const now = Date.now();
    const token = this.queryId;
    let extensionId = this.extensionId;
    const proxy = this.proxy;
    const ipProxy = proxy.split("@")[1];
    Upils.logger(`[${extensionId}] Starting ping for Account #${this.accountIndex + 1}, with proxy ${ipProxy}`);

    // if (!extensionId) {
    //   await new Promise((resolve) => setTimeout(resolve, 2000));
    //   extensionId = await setup(token);
    //   if (!extensionId) {
    //     Upils.logger(`You must put Manually your extension id in id.txt for Account #${this.accountIndex + 1}`, "warn");
    //     return;
    //   }
    // }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.pingAndUpdate(token, extensionId, proxy);

    if (!lastExecution[token] || now - lastExecution[token] >= 24 * 60 * 60 * 1000) {
      Upils.logger(`[${extensionId}] Checking tasks for Account #${this.accountIndex + 1}`);
      await Upils.checkAndClaimTask(extensionId, proxy, token);
      await Upils.dailyCheckin(extensionId, proxy, token);
      lastExecution[token] = now;
    }
  }
}

async function runWorker(workerData) {
  const { queryId, accountIndex, proxy, extensionId } = workerData;
  const to = new Kaisar(queryId, accountIndex, proxy, extensionId);
  try {
    await to.runAccount();
    parentPort.postMessage({
      accountIndex,
    });
  } catch (error) {
    parentPort.postMessage({ accountIndex, error: error.message });
  } finally {
    if (!isMainThread) {
      parentPort.postMessage("taskComplete");
    }
  }
}

async function main() {
  Upils.logger(Upils.banner, "warn");
  const tokens = Upils.getToken();
  const ids = Upils.getId();
  const proxies = Upils.getProxy();

  if (!tokens.length || !ids.length || !proxies.length) {
    Upils.logger("No tokens, IDs, proxy found. Exiting...", "error");
    return;
  }

  if (tokens.length > proxies.length) {
    console.error("Số lượng proxy và data phải bằng nhau.");
    console.log(`Data: ${tokens.length}`);
    console.log(`Proxy: ${proxies.length}`);
    process.exit(1);
  }
  let maxThreads = Upils.settings.MAX_THEADS;

  while (true) {
    let currentIndex = 0;
    const errors = [];

    while (currentIndex < tokens.length) {
      const workerPromises = [];
      const batchSize = Math.min(maxThreads, tokens.length - currentIndex);
      for (let i = 0; i < batchSize; i++) {
        const worker = new Worker(__filename, {
          workerData: {
            queryId: tokens[currentIndex],
            accountIndex: currentIndex,
            proxy: proxies[currentIndex % proxies.length],
            extensionId: ids[currentIndex % ids.length],
          },
        });

        workerPromises.push(
          new Promise((resolve) => {
            worker.on("message", (message) => {
              if (message === "taskComplete") {
                worker.terminate();
              }
              // if (settings.ENABLE_DEBUG) {
              //   console.log(message);
              // }
              resolve();
            });
            worker.on("error", (error) => {
              console.log(`Lỗi worker cho tài khoản ${currentIndex}: ${error.message}`);
              worker.terminate();
              resolve();
            });
            worker.on("exit", (code) => {
              worker.terminate();
              if (code !== 0) {
                errors.push(`Worker cho tài khoản ${currentIndex} thoát với mã: ${code}`);
              }
              resolve();
            });
          })
        );

        currentIndex++;
      }

      await Promise.all(workerPromises);

      if (errors.length > 0) {
        errors.length = 0;
      }

      if (currentIndex < tokens.length) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    Upils.logger(`[${new Date().toISOString()}] wait ${Upils.settings.TIME_PING_EACH_ROUND} minute...`);
    await new Promise((resolve) => setTimeout(resolve, Upils.settings.TIME_PING_EACH_ROUND * 60000));
  }
}

if (isMainThread) {
  main().catch((error) => {
    console.log("Lỗi rồi:", error);
    process.exit(1);
  });
} else {
  runWorker(workerData);
}
