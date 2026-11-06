import type { Scene } from "@/types";

export interface SceneDef {
  id: Scene;
  label: string;
  short: string;
  eyebrow: string;
  headline: string;
  description: string;
  promptLabel: string;
  placeholder: string;
  examples: string[];
  sampleSlugs: string[];
  questionStyle: string;
  tone: string;
}

export const SCENES: Record<Scene, SceneDef> = {
  study: {
    id: "study",
    label: "学习 / 科研",
    short: "学习",
    eyebrow: "StudyHack · 学习科研",
    headline: "把陌生概念，讲成一份读得下去的研究报告。",
    description:
      "不是一个更长的百科词条。它会先拆问题，再找一手资料、对立观点与历史脉络，把证据摊开，最后写成一份你能读完、能引用、能继续追问的报告。",
    promptLabel: "你想搞懂什么？",
    placeholder: "例如：MCP 到底是什么？它为什么突然火了？也可以直接输入一本书的书名。",
    examples: ["MCP 到底是什么", "室温超导走到哪一步了", "贝叶斯定理为什么反直觉", "向量数据库怎么工作", "《为什么伟大不能被计划》讲了什么"],
    sampleSlugs: ["mcp", "bayes", "prepared-dishes", "greatness"],
    questionStyle: "把概念讲清楚：它是什么、从哪来、怎么运作、和什么容易混淆、争议在哪、如何继续学。",
    tone: "聪明、好奇、有判断力的非专家；不居高临下，也不假装无所不知。",
  },
  life: {
    id: "life",
    label: "生活 / 消费",
    short: "生活",
    eyebrow: "LifeHack · 生活好帮手",
    headline: "生活里的新名词，先搞懂，再决定。",
    description:
      "新政策、新概念、新套路，真正的麻烦不是「不知道」，而是「说法太多、证据太少」。问底把各方说法、原始文件和反面证据放在一起，告诉你它对你意味着什么。",
    promptLabel: "生活里有什么想弄明白的？",
    placeholder: "例如：预制菜到底能不能吃？争议到底在争什么？",
    examples: ["预制菜到底能不能吃", "AI 换脸诈骗怎么防", "医保个人账户改革和我有什么关系", "以旧换新补贴怎么用"],
    sampleSlugs: ["prepared-dishes", "bayes", "mcp"],
    questionStyle: "把生活问题讲明白：它到底是什么、谁在说、证据够不够、对我有什么影响、我该怎么判断和行动。",
    tone: "像一个做过功课的朋友：说人话、给依据、不吓唬人，也不替你做决定。",
  },
};

export const SCENE_ORDER: Scene[] = ["study", "life"];

export function sceneFromQuery(value: string | null): Scene {
  return value === "life" ? "life" : "study";
}
