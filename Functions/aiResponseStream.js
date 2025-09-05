import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function aiResponseStream(messages, ws) {
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages,
    stream: true,
  });

  let fullResponse = "";

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      fullResponse += content;
      ws.send(
        JSON.stringify({
          type: "text",
          token: content,
          last: false,
        })
      );
      console.log("Sent chunk:", content);
    }
  }
  console.log("Full response", fullResponse);
  return fullResponse;
}
