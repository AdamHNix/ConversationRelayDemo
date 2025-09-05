import Fastify from "fastify";
import fastifyWs from "@fastify/websocket";
import dotenv from "dotenv";
import { WELCOME_GREETING, SYSTEM_PROMPT } from "./prompt.js";
import { aiResponseStream } from "./Functions/aiResponseStream.js";
import { redactAssistantMessage } from "./Functions/redactAssistantMessage.js";

dotenv.config();

const PORT = process.env.PORT || 8080;
const DOMAIN = process.env.NGROK_URL;
const TTS = process.env.TTS_PROVIDER || "ElevenLabs";
const VOICE = process.env.VOICE || "gUABw7pXQjhjt0kNFBTF";
const TRANSCRIPTION_PROVIDER = process.env.TRANSCRIPTION_PROVIDER || "deepgram";
const SPEECH_MODEL = process.env.SPEECH_MODEL || "telephony";
const WS_URL = `wss://${DOMAIN}/ws`;
const sessions = new Map();

const fastify = Fastify();
fastify.register(fastifyWs);
fastify.get("/twiml", async (request, reply) => {
  reply.type("text/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>
   <Response>
     <Connect>
       <ConversationRelay transcriptionProvider="${TRANSCRIPTION_PROVIDER}" speechModel="${SPEECH_MODEL}" url="${WS_URL}" ttsProvider="${TTS}" voice="${VOICE}" welcomeGreeting="${WELCOME_GREETING}" />
     </Connect>
   </Response>`
  );
});
fastify.register(async function (fastify) {
  fastify.get("/ws", { websocket: true }, (ws, req) => {
    ws.on("message", async (data) => {
      const message = JSON.parse(data);
      switch (message.type) {
        case "setup":
          const callSid = message.callSid;
          console.log("Setup for call:", callSid);
          ws.callSid = callSid;
          sessions.set(callSid, [{ role: "system", content: SYSTEM_PROMPT }]);
          break;
        case "prompt":
          console.log("Processing prompt:", message.voicePrompt);
          const conversation = sessions.get(ws.callSid);
          conversation.push({ role: "user", content: message.voicePrompt });
          console.log("Existing conversation:", conversation);
          const response = await aiResponseStream(conversation, ws);
          conversation.push({ role: "assistant", content: response });

          break;
        case "interrupt":
          console.log("Handling interruption.");
          ws.interrupted = true;
          ws.utteranceUntilInterrupt = message.utteranceUntilInterrupt;
          // Redact the last assistant message immediately upon interruption
          const interruptedConversation = sessions.get(ws.callSid);
          redactAssistantMessage(
            interruptedConversation,
            ws.utteranceUntilInterrupt
          );
          break;
        default:
          console.warn("Unknown message type received:", message.type);
          break;
      }
    });
    ws.on("close", () => {
      console.log("WebSocket connection closed");
      sessions.delete(ws.callSid);
    });
  });
});
try {
  fastify.listen({ port: PORT });
  console.log(
    `Server running at http://localhost:${PORT} and wss://${DOMAIN}/ws`
  );
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
