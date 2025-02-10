// import setup from "./setup.js";
import * as Upils from "./utils/exporter.js";
import headers from "./utils/headers.js";
// import settings from "./config.js";

async function pingAndUpdate(token, extensionId) {
  const apiClient = Upils.axios.create({
    baseURL: "https://zero-api.kaisar.io/",
    headers: headers(token),
  });

  try {
    const response = await apiClient.post("/extension/ping", {
      extension: extensionId,
    });

    Upils.logger(`[${extensionId}] Ping response:`, "info", response.data.data);
    await Upils.getMiningData(apiClient, extensionId);
  } catch (error) {
    Upils.logger(`[${extensionId}] Ping error: ${error.message}`, "error");
  }
}

(async () => {
  Upils.logger(Upils.banner, "warn");
  const tokens = Upils.getToken();
  const ids = Upils.getId();

  if (!tokens.length) {
    Upils.logger("No tokens, Exiting...", "error");
    return;
  }

  const lastExecution = {};

  while (true) {
    const now = Date.now();

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      let extensionId = ids[i % ids.length];
      const proxy = null;

      Upils.logger(`[${extensionId}] Starting ping for Account #${i + 1}`);

      // if (!extensionId) {
      //   await new Promise((resolve) => setTimeout(resolve, 2000));
      //   extensionId = await setup(token);
      //   if (!extensionId) {
      //     Upils.logger(`You must put Manually your extension id in id.txt for Account #${i + 1}`, "warn");
      //     continue;
      //   }
      // }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      await pingAndUpdate(token, extensionId, proxy);

      if (!lastExecution[token] || now - lastExecution[token] >= 24 * 60 * 60 * 1000) {
        Upils.logger(`[${extensionId}] Checking tasks for Account #${i + 1}`);
        await Upils.checkAndClaimTask(extensionId, proxy, token);
        await Upils.dailyCheckin(extensionId, proxy, token);

        lastExecution[token] = now;
      }
    }

    Upils.logger(`[${new Date().toISOString()}] wait 1 minute...`);
    await new Promise((resolve) => setTimeout(resolve, 1 * 60000));
  }
})();
