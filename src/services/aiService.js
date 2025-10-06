import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

export async function extractDetailsFromResume(resumeText) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Extract the following details from this resume text. Return ONLY a JSON object with no additional text:

Resume Text:
${resumeText}

Return format:
{
  "name": "Full Name or null",
  "email": "email@example.com or null",
  "phone": "phone number or null"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      return {
        name: extracted.name || null,
        email: extracted.email || null,
        phone: extracted.phone || null
      };
    }

    return { name: null, email: null, phone: null };
  } catch (error) {
    console.error('Error extracting details with Gemini:', error);
    return { name: null, email: null, phone: null };
  }
}

export async function generateQuestion(difficulty, questionNumber, topic = "Full Stack Development (React/Node.js)") {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Generate 1 ${difficulty} level interview question for ${topic}. 
Question should be practical and test real-world knowledge.
Return ONLY the question text, no numbering or extra formatting.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating question:', error);
    const fallbackQuestions = {
      easy: [
        "Explain the difference between let, const, and var in JavaScript.",
        "What is the Virtual DOM in React and why is it important?",
        "How do you handle asynchronous operations in Node.js?"
      ],
      medium: [
        "Explain how you would implement JWT authentication in a MERN application.",
        "What are React Hooks and why were they introduced?",
        "How would you optimize database queries in a Node.js application?"
      ],
      hard: [
        "Design a scalable real-time notification system for 1 million users.",
        "How would you handle state management in a large React application?",
        "Explain how you would implement database sharding for a high-traffic application."
      ]
    };
    return fallbackQuestions[difficulty][questionNumber % 3];
  }
}

export async function evaluateAnswer(question, answer, difficulty) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Evaluate this interview answer on a scale of 0-10.

Question (${difficulty} level): ${question}
Answer: ${answer}

Consider:
- Correctness and accuracy
- Depth of understanding
- Practical knowledge
- Communication clarity

Return ONLY a number between 0-10, nothing else.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const scoreText = response.text().trim();
    const score = parseInt(scoreText.match(/\d+/)?.[0] || '5');
    return Math.min(Math.max(score, 0), 10);
  } catch (error) {
    console.error('Error evaluating answer:', error);
    if (answer.length < 20) return 3;
    if (answer.length < 50) return 5;
    return 7;
  }
}

export async function generateSummary(candidateData) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const { answers, name } = candidateData;
    const avgScore = answers.reduce((sum, a) => sum + a.score, 0) / answers.length;

    const prompt = `Create a brief 2-3 sentence professional summary for candidate ${name}.

Average Score: ${avgScore.toFixed(1)}/10
Questions answered: ${answers.length}

Performance breakdown:
${answers.map((a, i) => `Q${i + 1} (${a.difficulty}): ${a.score}/10`).join('\n')}

Write a concise professional assessment.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating summary:', error);
    const avgScore = candidateData.answers.reduce((sum, a) => sum + a.score, 0) / candidateData.answers.length;
    if (avgScore >= 8) return "Excellent candidate with strong technical knowledge and problem-solving abilities.";
    if (avgScore >= 6) return "Good candidate with solid fundamentals and room for growth.";
    if (avgScore >= 4) return "Average candidate with basic understanding, requires further training.";
    return "Needs significant improvement in technical skills and fundamentals.";
  }
}

export async function extractDetailsFromResumeWithClaude(resumeText) {
  try {
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Extract name, email, and phone from this resume. Return only JSON: ${resumeText}`
        }
      ]
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { name: null, email: null, phone: null };
  } catch (error) {
    console.error('Error with Claude:', error);
    return { name: null, email: null, phone: null };
  }
}

export function extractDetailsWithRegex(resumeText) {
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

  const lines = resumeText.split('\n').filter(line => line.trim());
  let name = null;

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+){1,3}$/.test(line) && line.length < 50) {
      name = line;
      break;
    }
  }

  const emailMatch = resumeText.match(emailRegex);
  const phoneMatch = resumeText.match(phoneRegex);

  return {
    name: name,
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0] : null
  };
}

export async function generateQuestionWithHF(difficulty) {
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/microsoft/DialoGPT-large",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: `Generate a ${difficulty} interview question for Full Stack Development:`
        })
      }
    );

    const result = await response.json();
    return result[0]?.generated_text || "Tell me about your experience with React and Node.js";
  } catch (error) {
    console.error('Hugging Face error:', error);
    return "Describe your approach to building a REST API.";
  }
}

export default {
  extractDetailsFromResume,
  generateQuestion,
  evaluateAnswer,
  generateSummary,
  extractDetailsWithRegex,
};