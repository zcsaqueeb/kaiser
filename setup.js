import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import headers from "./utils/headers.js";
import { logger } from "./utils/logger.js";

function generateUUID() {
  return crypto.randomUUID();
}

function getTokensFromFile() {
  try {
    let tokens = fs
      .readFileSync("tokens.txt", "utf-8")
      .split("\n")
      .filter((token) => token.trim() !== "");
    tokens = tokens.map((token) => token.replace("Bearer%20", "").trim());

    return tokens;
  } catch (error) {
    console.error("Error reading tokens.txt:", error.message || error);
    return [];
  }
}

function saveUUIDToFile(uuid) {
  try {
    fs.appendFileSync("id.txt", uuid + "\n");
    console.log("Extension ID saved to id.txt");
  } catch (error) {
    console.error("Error saving Extension ID to file:", error.message || error);
  }
}

async function startFarmingWithToken(token) {
  const extensionId = generateUUID();
  const apiClient = axios.create({
    baseURL: "https://zero-api.kaisar.io/",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  let miningData = null;

  async function startFarming() {
    try {
      console.log("Created", { extensionId }, "Trying to start farming");
      saveUUIDToFile(extensionId);
      const response = await apiClient.post("/mining/start", {
        extension: extensionId,
      });
      if (response.status === 200) {
        console.log("Mining started successfully:");
      }
    } catch (error) {
      if (error.response) {
        const { status, data } = error.response;
        console.error("Error starting mining (HTTP Error):", {
          status,
        });

        if (status === 412) {
          console.log("Mining already started with another ID.\nYou must put Manually your extension id in id.txt");
          return;
        }
      } else {
        console.error("Error starting mining try again later");
      }
    }
  }
  await startFarming();
}
(async () => {
  const tokens = getTokensFromFile();
  for (let i = 0; i < tokens.length; i++) {
    await startFarmingWithToken(tokens[i], i);
  }
})();
