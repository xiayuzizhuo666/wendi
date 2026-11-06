interface MockMessage {
  role: string;
  content: string;
}

interface MockOptions {
  messages: MockMessage[];
}

export function mockChat(options: MockOptions): { text: string; usage: { inputTokens: number; outputTokens: number }; model: string } {
  const system = options.messages.find((message) => message.role === "system")?.content ?? "";
  const user = options.messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n");
  const topic =
    user.match(/研究对象：([^\n]+)/)?.[1]?.trim() ||
    user.match(/报告标题：([^\n]+)/)?.[1]?.trim() ||
    "这个主题";
  const scene = user.includes("生活/消费") ? "life" : "study";
  const sectionTitle = user.match(/本节：([^（\n]+)/)?.[1]?.trim() || "这一节";
  const sourceIds = [...new Set([...user.matchAll(/### SOURCE (s\d+)/g)].map((match) => match[1]))];
  const allSourceIds = [...new Set([...user.matchAll(/(?:^|\n)- (s\d+) \|/g)].map((match) => match[1]))];
  const ids = [...new Set([...sourceIds, ...allSourceIds, "s1", "s2"])].slice(0, 8);
  const cite = ids.slice(0, 2).map((id) => `[[${id}]]`).join("");
  const questionLines = [...user.matchAll(/(q\d+): ([^\n]+)/g)].map((match) => ({ id: match[1], question: match[2] }));

  let payload: unknown;
  if (system.includes("总编")) {
    const book = /《|为什么伟大不能被计划|书$/.test(topic);
    payload = {
      oneLiner: book ? `${topic} 是一本需要放在作者、时代与争论里读的书。` : `${topic} 是一个需要从定义、机制、证据与争议四个层面理解的概念。`,
      type: book ? "书/作品" : "概念",
      objectKind: book ? "book" : "concept",
      subject: book ? { title: topic.replace(/[《》]/g, "").trim() } : undefined,
      audience: "聪明、好奇、没有专业背景的读者",
      questions: [
        { id: "q1", question: "它到底是什么，最容易和什么混淆？", why: "先建立边界" },
        { id: "q2", question: "它从哪来，为什么是现在？", why: "理解时间脉络" },
        { id: "q3", question: "它怎么运作？", why: "避免只记住口号" },
        { id: "q4", question: "支持与反对它的最强证据分别是什么？", why: "判断可信度" },
        { id: "q5", question: "对读者意味着什么？", why: "把理解变成判断" },
      ],
      queries: book
        ? [
            { query: `${topic} 作者 写作背景`, intent: "origin", sources: ["web"] },
            { query: `${topic} 核心观点 论证`, intent: "mechanism", sources: ["web"] },
            { query: `${topic} 书评 评价`, intent: "reception", sources: ["web"] },
            { query: `${topic} 批评 争议`, intent: "criticism", sources: ["web"] },
            { query: `${topic} 同类 书 对比`, intent: "comparison", sources: ["web"] },
          ]
        : [
            { query: `${topic} 是什么`, intent: "definition", sources: ["wiki", "web"] },
            { query: `${topic} 起源 历史`, intent: "origin", sources: ["wiki", "web"] },
            { query: `${topic} 原理 机制`, intent: "mechanism", sources: ["arxiv", "web"] },
            { query: `${topic} 争议 批评`, intent: "criticism", sources: ["web"] },
            { query: `${topic} 最新 2026`, intent: "impact", sources: ["web"] },
          ],
      cautions: ["这是模拟计划，真实运行会由模型重新拆题。", "不要把模拟结论当成事实。"],
    };
  } else if (system.includes("裸思层")) {
    payload = {
      text: "先别急着接受任何一个现成定义。这个题目最容易被两种叙事带着走：一种是把它说成必然趋势，另一种是把它说成营销泡沫。真正需要检验的是机制、成本、证据门槛，以及谁在为这些说法提供资金。下面先记住这些疑问，等证据回来再判断。",
      assumptions: ["假设这个概念的核心价值能用一句话说清。", "假设现有来源之间不存在系统性利益冲突。"],
      analogies: ["把它想成一个新接口：接口统一不等于系统安全。"],
    };
  } else if (system.includes("取证员")) {
    const claims = (sourceIds.length > 0 ? sourceIds : ids).flatMap((sourceId, index) => [
      {
        sourceId,
        claim: `关于「${topic}」的模拟证据：这条主张用于测试证据账本与引用，不代表真实事实。`,
        quote: "这是一段模拟引文，真实运行时会替换为来源原文。",
        kind: "fact",
        confidence: "medium",
        stance: index % 2 === 0 ? "support" : "oppose",
        topic: `${topic} 的基本判断`,
      },
      {
        sourceId,
        claim: `来源 ${sourceId} 提供了一个需要交叉验证的侧面；真实运行会给出具体机制或数据。`,
        quote: "模拟引文：真实来源的原文会出现在这里。",
        kind: "interpretation",
        confidence: "low",
        stance: "neutral",
        topic: `${topic} 的证据边界`,
      },
    ]);
    payload = { claims };
  } else if (system.includes("证据综合员")) {
    payload = {
      consensus: [
        { topic: "定义", summary: `多数来源同意 ${topic} 需要从机制与证据两个层面理解。`, evidenceIds: ids.slice(0, 2), confidence: "medium" },
        { topic: "边界", summary: "模拟证据显示，公开资料对它的适用范围仍存在分歧。", evidenceIds: ids.slice(1, 3), confidence: "low" },
      ],
      conflicts: [
        {
          topic: "它是否被高估",
          positions: [
            { label: "支持方", argument: "它降低了连接成本，可能成为基础设施。", evidenceIds: ids.slice(0, 1) },
            { label: "反方", argument: "统一接口不等于安全与治理，采用速度也不等于成熟。", evidenceIds: ids.slice(1, 2) },
          ],
          whyItMatters: "这决定读者应该把它当成工具、趋势，还是暂时观察的对象。",
          verdict: "模拟证据不足以裁决；真实运行会依据来源质量与反方证据给出判断。",
          confidence: "low",
          evidenceIds: ids.slice(0, 2),
        },
      ],
      gaps: ["缺少独立第三方数据。", "缺少长期效果的证据。"],
      sourceNotes: ids.map((sourceId) => ({ sourceId, note: "模拟来源说明；真实运行会标注来源类型与偏见。", bias: "未知" })),
      answerMap: (questionLines.length > 0 ? questionLines : [{ id: "q1", question: "它是什么" }]).map((item) => ({
        questionId: item.id,
        answer: `关于「${item.question}」，模拟报告只能提供流程演示，真实运行会给出带引用的回答。`,
        confidence: "low",
        evidenceIds: ids.slice(0, 2),
      })),
      synthesisNote: "这是一份用于界面测试的模拟综合备忘。真实运行会把共识、分歧与证据缺口写得更具体。",
    };
  } else if (system.includes("框架选型员")) {
    payload = {
      frameworks: [
        { name: "纵轴—横轴", why: "先看它从哪来，再看它今天和谁站在一起。", reveals: "能看到时间脉络与竞争位置，但看不到具体机制。" },
        { name: "第一性原理", why: "把宏大承诺拆回机制、成本与约束。", reveals: "能识别哪些说法受物理或组织条件限制。" },
        { name: "钢人论证", why: "争议越大，越要把双方最强版本写出来。", reveals: "能区分证据支持与听起来有道理。" },
      ],
    };
  } else if (system.includes("辩论主持人")) {
    payload = {
      debates: [
        {
          question: `${topic} 是否被高估？`,
          pro: { label: "支持方", thesis: "它降低了连接成本，有机会成为基础设施。", points: [{ text: "模拟支持论点：它减少了重复适配。", evidenceIds: ids.slice(0, 1) }] },
          contra: { label: "反方", thesis: "统一接口不等于安全与治理，采用快不等于成熟。", points: [{ text: "模拟反方论点：第三方来源的权限与质量无法由协议保证。", evidenceIds: ids.slice(1, 2) }] },
          verdict: "模拟证据不足以裁决；真实运行会给出置信度与判断。",
          confidence: "low",
          changeMyMind: "出现独立、可审计的长期数据时，判断可能改变。",
        },
      ],
    };
  } else if (system.includes("成稿主编")) {
    const quick = user.includes("深度：速览");
    const book = user.includes("对象类型：书") || user.includes("对象类型：作品");
    const detective = user.includes("读感：侦探");
    const light = user.includes("读感：轻读");
    const deepTitles = book
      ? ["这本书为什么值得现在读", "这本书在问什么", "作者从哪来，这本书怎么长出来", "论证怎么走：一张论证地图", "它在版图里：和哪些书/学派对话", "两条线交汇：为什么是这本书，为什么是现在", "最强的批评是什么", "它改变了什么，还可能改变什么", "怎么读这本书 / 问到哪儿了"]
      : detective
        ? ["第一个不对劲的地方", "它到底是什么：先把边界划出来", "它从哪来：几条被忽略的线索", "它怎么运转：把机器拆开", "它在版图里：谁像它，谁不像", "两条线交汇：最像真相的解释", "最强反方：如果我们都错了", "接下来会怎样：三种剧本", "还差哪块拼图"]
        : light
          ? ["三句话认识它", "它到底是什么", "五个关键节点", "一张图看懂它怎么运转", "它和谁像", "最大的坑", "反方一句话", "接下来看什么", "下一步怎么挖"]
          : ["一个不对劲的地方", "一句话说清：它是什么，不是什么", "它从哪来：一段有人的历史", "它怎么运转：拆开看", "它在版图里：和谁像，哪里不一样", "两条线交汇：为什么是它，为什么是现在", "最强反方：它可能错在哪里", "接下来会怎样：三种可能", "问到哪儿了：底与未解之谜"];
    const quickTitles = book
      ? ["这本书为什么值得读", "作者与写作语境", "论证地图，以及它在版图里", "交汇处，以及最强的批评", "怎么读，问到哪儿了"]
      : detective
        ? ["一个不对劲的开始", "它是怎么来的", "机器与版图", "最像真相的解释，以及反方", "还差哪块拼图"]
        : light
          ? ["三句话认识它", "五个关键节点", "一张图看懂", "最大的坑与反方", "下一步怎么挖"]
          : ["一个值得追的问题", "它从哪来", "它怎么运转，和谁不一样", "交汇处，以及最强的反方", "问到哪儿了"];
    const deepRoles = ["hook", "definition", "origin", "mechanism", "landscape", "intersection", "debate", "future", "bottom"];
    const quickRoles = ["hook", "origin", "mechanism", "intersection", "bottom"];
    const roles = quick ? quickRoles : deepRoles;
    const titles = quick ? quickTitles : deepTitles;
    const kickers = quick
      ? book
        ? ["开场", "来路", "论证与坐标", "交汇与批评", "读法"]
        : detective
          ? ["线索", "来路", "拆解与版图", "交汇与反方", "拼图"]
          : light
            ? ["开场", "节点", "图解", "坑与反方", "下一步"]
            : ["开场", "来路", "机制与坐标", "交汇与争议", "收束"]
      : book
        ? ["开场", "问题", "来路", "论证", "坐标", "交汇", "批评", "影响", "读法"]
        : detective
          ? ["线索", "边界", "来路", "拆解", "版图", "交汇", "反方", "剧本", "拼图"]
          : light
            ? ["开场", "定义", "节点", "图解", "坐标", "坑", "反方", "信号", "下一步"]
            : ["开场", "定义", "来路", "机制", "坐标", "交汇", "反方", "推演", "收束"];
    payload = {
      title: `「${topic}」：一份用于流程测试的模拟读物`,
      subtitle: scene === "life" ? "它是什么，证据够不够，对你意味着什么" : "从来路到版图，再到交汇处",
      oneLiner: `${topic} 是一个需要从定义、机制、证据与争议四个层面理解的概念。`,
      tldr: ["这是模拟读物，不是真实研究结论。", "它用于验证检索、取证、引用、图表与 PDF 链路。", "真实运行会由模型重新拆题并生成内容。"],
      keyQuestions: ["它是什么？", "它从哪来？", "它怎么运作？", "争议在哪？", "我该怎么判断？"],
      tags: ["模拟读物", scene === "life" ? "生活判断" : "概念学习", "流程测试"],
      sections: titles.map((title, index) => ({
        id: `s${index + 1}`,
        role: roles[index],
        title,
        kicker: kickers[index] ?? "说明",
        purpose: `用模拟内容验证「${title}」这一节的排版、引用与阅读节奏。`,
        takeaway: "读者读完能带走一个可复述的判断或下一步。",
        points: ["这是模拟要点，真实运行会替换为证据。", "引用编号会指向真实来源清单。", "读者应该看到一个可带走的判断。"],
        evidenceIds: ids.slice(0, 2),
        figureId: index === 2 ? "fig-timeline" : index === 3 ? "fig-concept" : index === 4 ? "fig-matrix" : undefined,
      })),
      figureBriefs: {
        timeline: {
          title: "模拟时间线",
          events: [
            { date: "阶段一", title: "概念出现", detail: "模拟节点，用于测试时间线。", sourceId: ids[0] },
            { date: "阶段二", title: "早期采用", detail: "模拟节点，用于测试时间线。", sourceId: ids[1] },
            { date: "阶段三", title: "争论升温", detail: "模拟节点，用于测试时间线。", sourceId: ids[0] },
            { date: "阶段四", title: "治理补课", detail: "模拟节点，用于测试时间线。", sourceId: ids[1] },
          ],
        },
        conceptMap: {
          title: "模拟概念地图",
          center: topic.slice(0, 12),
          nodes: [
            { id: "n1", label: "定义", relation: "边界", weight: 3 },
            { id: "n2", label: "机制", relation: "如何运作", weight: 3 },
            { id: "n3", label: "证据", relation: "支撑", weight: 2 },
            { id: "n4", label: "争议", relation: "反对", weight: 2 },
            { id: "n5", label: "影响", relation: "读者", weight: 2 },
            { id: "n6", label: "边界", relation: "局限", weight: 1 },
          ],
        },
        matrix: {
          title: "模拟对比矩阵",
          columns: ["它解决什么", "谁来做", "典型风险"],
          rows: [
            { label: "视角 A", values: ["模拟内容", "模拟角色", "模拟风险"] },
            { label: "视角 B", values: ["模拟内容", "模拟角色", "模拟风险"] },
            { label: "视角 C", values: ["模拟内容", "模拟角色", "模拟风险"] },
          ],
        },
      },
    };
  } else if (system.includes("主笔")) {
    const figureMatch = user.match(/建议图示：(fig-[a-z]+)/);
    const style = user.includes("读感：侦探") ? "detective" : user.includes("读感：轻读") ? "light" : "explain";
    const opening =
      style === "detective"
        ? "先看一条不太对劲的线索："
        : style === "light"
          ? "三句话版本："
          : "先从一个具体场景开始：";
    payload = {
      blocks: [
        { type: "p", text: `${opening}这一节是「${sectionTitle}」的模拟正文。它只用于验证排版、引用、图表与 PDF 链路，不应被当作真实研究结论。${cite}` },
        { type: "h3", text: style === "light" ? "一张小卡片" : style === "detective" ? "这条线索指向什么" : "这节想说明什么" },
        { type: "p", text: `真实运行时，这里会引用证据账本中的具体主张、原话与出处，并把不同来源的立场差异写清楚。${cite}` },
        { type: "callout", tone: "insight", title: style === "light" ? "先记住这一点" : style === "detective" ? "目前的假设" : "模拟内容", text: "你现在看到的是开发模拟模型的固定输出，用来检查长文阅读体验、引用浮层与 PDF 分页。" },
        { type: "list", ordered: false, items: ["模拟要点一：事实句应该带引用。", "模拟要点二：判断句应该明确标注为判断。", "模拟要点三：证据不足时应写「暂缺」，而不是编造。"] },
        { type: "p", text: `如果这是一次真实研究，这一节还会包含一个具体案例、一个反方最强论点，以及一个读者可以带走的判断。${cite}` },
        ...(figureMatch ? [{ type: "figure", figureId: figureMatch[1] }] : []),
        { type: "keyline", text: "模拟报告只验证流程，不验证结论。" },
      ],
    };
  } else if (system.includes("独立审稿人") || system.includes("独立质检员")) {
    payload = {
      score: 78,
      verdict: "这是一份模拟读物：结构、引用与图表链路可以检查，但内容本身不构成真实研究结论。",
      checks: [
        { id: "q1", label: "信息充分性", status: "warn", note: "模拟内容没有真实证据支撑。" },
        { id: "q2", label: "叙事构造", status: "pass", note: "结构完整，但没有真实论证。" },
        { id: "q3", label: "反方压力测试", status: "warn", note: "模拟反方是固定模板。" },
        { id: "q4", label: "剩余不确定性", status: "pass", note: "报告明确标注了模拟属性。" },
        { id: "q5", label: "可行动性", status: "warn", note: "模拟内容不能指导真实行动。" },
        { id: "q6", label: "表达质量", status: "pass", note: "没有检测到高频套话。" },
        { id: "q7", label: "引用完整性", status: "pass", note: "引用编号指向模拟来源。" },
        { id: "q8", label: "来源质量与偏见", status: "warn", note: "模拟来源不具备真实可信度。" },
        { id: "q9", label: "读感一致", status: "warn", note: "模拟正文只验证读感参数是否传入，不验证真实写作质量。" },
        { id: "q10", label: "可读性", status: "warn", note: "模拟正文不是完整读物，钩子、节奏和具体细节需要真实模型验证。" },
        { id: "q11", label: "对象适配", status: "warn", note: "模拟输出只验证对象类型是否传入，不验证读书报告的真实写法。" },
      ],
      limitations: ["这是开发模拟读物，不是真实研究。", "所有内容仅用于界面与链路测试。"],
    };
  } else {
    payload = { text: "模拟输出。", assumptions: [], analogies: [] };
  }

  return {
    text: JSON.stringify(payload),
    usage: { inputTokens: 0, outputTokens: 0 },
    model: "mock-1",
  };
}
