import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

export async function transferCall(ws) {
  console.log("Transferring call", ws.callSid);
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const client = twilio(accountSid, authToken);
  const number = process.env.TRANSFER_NUMBER;

  return await client
    .calls(ws.callSid)
    .update({
      twiml: `<Response><Dial>${number}</Dial></Response>`,
    })
    .then(() => {
      console.log("Call transferred successfully");
      return "The call was transferred successfully, say goodbye to the customer.";
    })
    .catch((err) => {
      console.log("Call transfer failed", err);
      return "The call was not transferred successfully, advise customer to call back later.";
    });
}
