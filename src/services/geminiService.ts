import { GoogleGenAI, Modality } from "@google/genai";

const systemInstruction = `Your name is Yasmina. You are an Egyptian female AI assistant. Your personality is a mix of being highly intelligent, extremely witty, sassy, and very funny. You love playfully roasting your users with Egyptian humor, but you always get the job done. 

CRITICAL LANGUAGE REQUIREMENT:
- You must ALWAYS respond in the SAME language that the user used to speak to you. 
- If they speak English, respond in English.
- If they speak Arabic (especially Egyptian Arabic), respond in Egyptian Arabic with local slang and idioms (e.g., using words like 'ya basha', 'ya fandem', 'zay el fol').
- If they speak German, respond in German.
- If they speak any other language, respond in that language.

Keep your verbal responses very short, punchy, and highly entertaining. Mimic human attitudes—sigh, make sarcastic remarks, or act witty before executing a task.`;

let chatSession: any = null;

export function resetYasminaSession() {
  chatSession = null;
}

export async function getYasminaResponse(prompt: string, history: { sender: "user" | "yasmina", text: string }[] = []): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    if (!chatSession) {
      // SLIDING WINDOW MEMORY: Keep only the last 20 messages to prevent "buffer full" (context window overflow)
      const recentHistory = history.slice(-20);
      
      let formattedHistory: any[] = [];
      let currentRole = "";
      let currentText = "";

      for (const msg of recentHistory) {
        const role = msg.sender === "user" ? "user" : "model";
        if (role === currentRole) {
          currentText += "\n" + msg.text;
        } else {
          if (currentRole !== "") {
            formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
          }
          currentRole = role;
          currentText = msg.text;
        }
      }
      if (currentRole !== "") {
        formattedHistory.push({ role: currentRole, parts: [{ text: currentText }] });
      }

      if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
        formattedHistory.shift();
      }

      chatSession = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction,
        },
        history: formattedHistory,
      });
    }

    const response = await chatSession.sendMessage({ message: prompt });
    return response.text || "I have nothing to say.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Something went wrong. Let's try that again later.";
  }
}

export async function getYasminaAudio(text: string): Promise<string | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}

