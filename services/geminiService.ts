import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateGameNarrative = async (
  wave: number, 
  score: number, 
  situation: 'start' | 'wave_complete' | 'game_over' | 'low_health'
): Promise<string> => {
  
  let prompt = "";
  
  switch (situation) {
    case 'start':
      prompt = "The player is starting a zombie survival game as a fitness enthusiast with a kitten. Give a short, dark but funny one-sentence intro.";
      break;
    case 'wave_complete':
      prompt = `The player just cleared Wave ${wave} with a score of ${score}. Give a one-sentence sarcastic compliment about their fitness gains or survival skills.`;
      break;
    case 'game_over':
      prompt = `Game Over. Wave reached: ${wave}. Score: ${score}. Give a one-sentence roast about how they skipped leg day or got eaten.`;
      break;
    case 'low_health':
      prompt = "The player is about to die. Give a very short, urgent command to exercise harder.";
      break;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a gritty, dark, sarcastic narrator for a video game. Keep responses under 20 words. Be funny but intense.",
        thinkingConfig: { thinkingBudget: 0 } // Speed over deep thought
      }
    });

    return response.text?.trim() || "Survive.";
  } catch (error) {
    console.error("Gemini Narrative Error:", error);
    return "The darkness consumes... (AI Error)";
  }
};