import "dotenv/config";

const settings = {
  TIME_PING_EACH_ROUND: process.env.TIME_PING_EACH_ROUND ? parseInt(process.env.TIME_PING_EACH_ROUND) : 5,
  MAX_THEADS: process.env.MAX_THEADS ? parseInt(process.env.MAX_THEADS) : 5,
  AUTO_CONVERT_POINT_TO_TICKET: process.env.AUTO_CONVERT_POINT_TO_TICKET ? process.env.AUTO_CONVERT_POINT_TO_TICKET.toLowerCase() === "true" : false,
  AMOUNT_TICKETS_CONVERT: process.env.AMOUNT_TICKETS_CONVERT ? parseInt(process.env.AMOUNT_TICKETS_CONVERT) : 1,
  USE_PROXY: process.env.USE_PROXY ? process.env.USE_PROXY.toLowerCase() === "true" : false,
  REF_ID: process.env.REF_ID ? process.env.REF_ID : "WhugTS374",
};

export { settings };
