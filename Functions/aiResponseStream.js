import OpenAI from "openai";
import dotenv from "dotenv";
import { transferConversationCallSchema } from "./openAiSchema.js";
import { transferCall } from "./handoff.js";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let fullResponse = "";

export async function aiResponseStream(messages, ws) {
  const stream = await openai.responses.create({
    model: "gpt-4o-mini",
    input: messages,
    stream: true,
    tools: [transferConversationCallSchema],
  });
  for await (const event of stream) {
    console.log("Event:", event);
    if (event.type === "response.output_text.delta") {
      const content = event.delta;
      fullResponse += content;
      ws.send(
        JSON.stringify({
          type: "text",
          token: content,
          last: false,
        })
      );
      process.stdout.write(event.delta); // prints tokens as they stream
    }
    if (event.item && event.item.type === "function_call") {
      // OpenAI wants to trigger transfer
      console.log("OpenAI triggered transfer!");

      //Call your Twilio transfer using your own parameters
      await transferCall(ws);

      ws.send(
        JSON.stringify({
          type: "end",
          handoffData:
            '{"reasonCode":"live-agent-handoff", "reason": "The caller wants to talk to a real person"}',
        })
      );
    } else if (event.type === "response.completed") {
      console.log("\n--- done ---");
    }
  }
  return fullResponse;
}
