import axios from "axios";
import * as Utils from "./utils/exporter.js";
import headers from "./utils/headers.js";
import * as Upils from "./utils/exporter.js";

// Function to perform the spin
async function doSpin(token, proxy) {
  const payload = {};
  let config = {
    headers: headers(token),
  };
  if (proxy) {
    const agent = new Upils.HttpsProxyAgent(proxy);
    config = {
      ...config,
      httpAgent: agent,
      httpsAgent: agent,
    };
  }
  try {
    const response = await axios.post(`https://zero-api.kaisar.io/lucky/spin`, payload, config);
    const data = response?.data?.data?.prize;
    const value = `${data?.amount} ${data?.symbol}`;
    // console.log(data);
    Utils.logger("Spin Results:", "info", value);
    return data;
  } catch (error) {
    Utils.logger("Error during spin:", "error", error.response?.data || error.message);
    return null;
  }
}

// Function to fetch user profile
async function profile(token, proxy) {
  let config = {
    headers: headers(token),
  };
  if (proxy) {
    const agent = new Upils.HttpsProxyAgent(proxy);
    config = {
      ...config,
      httpAgent: agent,
      httpsAgent: agent,
    };
  }
  try {
    const response = await axios.get(`https://zero-api.kaisar.io/user/balances?symbol=ticket`, config);
    return response.data.data;
  } catch (error) {
    Utils.logger("Error fetching profile:", "error", error.response?.data || error.message);
    return null;
  }
}

async function getReward(token, proxy) {
  let config = {
    headers: headers(token),
  };
  if (proxy) {
    const agent = new Upils.HttpsProxyAgent(proxy);
    config = {
      ...config,
      httpAgent: agent,
      httpsAgent: agent,
    };
  }
  try {
    const response = await axios.get(`https://zero-api.kaisar.io/lucky/reward`, config);
    return response.data.data;
  } catch (error) {
    Utils.logger("Error fetching reward:", "error", error.response?.data || error.message);
    return [];
  }
}

// Function to convert tickets
async function convert(token, amount, proxy) {
  const payload = { ticket: amount };
  let config = {
    headers: headers(token),
  };
  if (proxy) {
    const agent = new Upils.HttpsProxyAgent(proxy);
    config = {
      ...config,
      httpAgent: agent,
      httpsAgent: agent,
    };
  }
  try {
    const response = await axios.post(`https://zero-api.kaisar.io/lucky/convert`, payload, config);
    Utils.logger("Converted 10 Tickets:", "success", response.data.data);
    return response.data;
  } catch (error) {
    Utils.logger("Error converting tickets:", "error", error.response?.data || error.message);
    return null;
  }
}

async function handleSyncProfile(token, proxy) {
  let tickets = await profile(token, proxy);
  let points = tickets[0].balance;
  let ticket = tickets[1] ? tickets[1].balance : 0;
  let vusd = tickets[2] ? tickets[2].balance : 0;

  return { ticket: ticket, points: points, vusd: vusd };
}

function saveData(data) {
  try {
    fs.appendFileSync("reward.txt", data + "\n");
    console.log("Reward saved to reward.txt");
  } catch (error) {
    console.error("Error saving reward to file:", error.message || error);
  }
}
// Main execution function
async function main() {
  Utils.logger(Utils.banner, "debug");
  const tokens = Utils.getToken();
  const accounts = Utils.getData("data.txt");
  const proxies = Utils.getData("proxy.txt");

  let counter = 1;
  const isConvert = Utils.settings.AUTO_CONVERT_POINT_TO_TICKET;
  const amountConvert = Utils.settings.AMOUNT_TICKETS_CONVERT;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const account = accounts[i];
    const proxy = proxies[i];

    Utils.logger(`Processing account ${counter} of ${tokens.length}...`, "debug");
    var { ticket, points, vusd } = await handleSyncProfile(token, proxy);

    if (isConvert) {
      Utils.logger("Converting points to tickets...", "info");
      const ticketsConvetAvaliable = Math.min(Math.floor(points / 300), amountConvert);
      while (points > 300) {
        await convert(token, ticketsConvetAvaliable, proxy);
      }
    }

    let rewards = getReward(token, proxy);
    if (rewards) {
      rewards = Object.keys(rewards);
    }
    while (ticket > 0) {
      var { ticket, points, vusd } = await handleSyncProfile(token, proxy);
      ticket--;
      if (!ticket) {
        Utils.logger("Error retrieving ticket balance, skipping account...", "error");
        break;
      }

      Utils.logger(`Points: ${points} | USD: ${vusd} | Tickets Left: ${ticket}`);

      if (ticket > 0) {
        const res = await doSpin(token, proxy);

        if (res && res?.symbol === "vusdt") {
          const [email, password] = account?.split("|");
          const value = `${email} | ${res?.amount} ${res?.symbol}`;
          saveData(value);
          Utils.logger(`Save account ${email}: ${res.amount} ${res.symbol}`, "success");
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } else {
        Utils.logger("No tickets left and points are insufficient, skipping account...", "warn");
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    counter++;
  }
}

// Start the main function
main().catch((error) => {
  Utils.logger("Error in main execution:", "error", error.message);
});
