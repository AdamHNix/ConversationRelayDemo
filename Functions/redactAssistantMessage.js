export function redactAssistantMessage(conversation, utteranceUntilInterrupt) {
  if (!utteranceUntilInterrupt) return;
  for (let i = conversation.length - 1; i >= 0; i--) {
    if (conversation[i].role === "assistant") {
      const idx = conversation[i].content.indexOf(utteranceUntilInterrupt);
      if (idx !== -1) {
        conversation[i].content =
          conversation[i].content.substring(
            0,
            idx + utteranceUntilInterrupt.length
          ) + " [Interrupted]";
      }
      break;
    }
  }
}
