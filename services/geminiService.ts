import { Persona } from "../types";

// Static responses to mimic the previous AI behavior locally
const PERSONA_RESPONSES: Record<string, string[]> = {
  sysadmin: [
    "mv '{file}' '{dest}' # Executed successfully.",
    "File transfer complete. Don't make a habit of this.",
    "'{file}' moved to {dest}. Logs updated.",
    "Operation successful. I hope you put it in the right place."
  ],
  butler: [
    "I have carefully placed '{file}' into {dest} for you.",
    "Your file '{file}' has been safely transported to {dest}.",
    "As you requested, '{file}' is now residing in {dest}.",
    "Transfer complete. Is there anything else you require for '{file}'?"
  ],
  gamer: [
    "Pog! '{file}' just warped to {dest}.",
    "EZ! '{file}' moved to {dest}. No lag.",
    "Loot secured: '{file}' dropped in {dest}.",
    "Mission passed! '{file}' is now in {dest}."
  ]
};

export const generateMoveConfirmation = async (
  fileName: string, 
  destinationName: string,
  destinationPath: string,
  persona: Persona
): Promise<string> => {
  // Simulate a brief processing delay to maintain the "working" UI feel
  await new Promise(resolve => setTimeout(resolve, 600));

  const templates = PERSONA_RESPONSES[persona.id] || ["Moved '{file}' to {dest}."];
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  
  return randomTemplate
    .replace('{file}', fileName)
    .replace('{dest}', destinationName);
};