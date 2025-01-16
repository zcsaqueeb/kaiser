import { logger } from "./logger.js";
async function getMiningData(apiClient, extensionId) {
  try {
    const response = await apiClient.get("/mining/current", {
      params: { extension: extensionId },
    });

    if (response.data && response.data.data) {
      const miningData = response.data.data;

      updateProgress(extensionId, miningData);
      updateMiningPoint(extensionId, miningData);

      if (miningData.ended === 1) {
        logger(`[${extensionId}] Mining has ended. Proceeding to claim mining points.`, "debug");
        await claim(apiClient, extensionId);
      }
    }
  } catch (error) {
    logger(`[${extensionId}] Error fetching mining data`, "error");
  }
}

function updateMiningPoint(extensionId, miningData) {
  const elapsedTimeInHours = (Date.now() - new Date(miningData.start).getTime() - miningData.miss) / 36e5;
  const points = elapsedTimeInHours * miningData.hourly;
  const miningPoint = Math.max(0, points);

  logger(`[${extensionId}] Points: ${points.toFixed(2)}, MiningPoints: ${miningPoint.toFixed(2)}, ElapsedTimeInHours: ${elapsedTimeInHours.toFixed(1)} hours`, "success");
}

function updateProgress(extensionId, miningData) {
  let currentTime = Date.now();
  let endTime = miningData.end;
  const remainingTime = Math.max(0, endTime - currentTime);
  endTime = new Date(endTime).toISOString();
  currentTime = new Date(currentTime).toISOString();

  const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

  logger(`[${extensionId}] Progress: endTime: ${endTime}, currentTime: ${currentTime}, remainingTime: ${hours} hours : ${minutes} minutes : ${seconds} seconds`, "info");
}

async function claim(apiClient, extensionId) {
  try {
    logger(`[${extensionId}] Claiming mining points...`);
    const { data } = await apiClient.post("/mining/claim", { extension: extensionId });
    logger(`[${extensionId}] Claimed successfully:`, "success", data);
  } catch (error) {
    logger(`[${extensionId}] Error during claim:`, "error", error.message || error);
  }
}
export { getMiningData };
