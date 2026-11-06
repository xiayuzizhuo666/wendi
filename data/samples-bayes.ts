import type { ReportDoc } from "@/types";

const ACCESSED = Date.parse("2026-11-01T09:00:00+08:00");

export const bayesSample: ReportDoc = {
  id: "sample-bayes",
  topic: "贝叶斯定理",
  title: "贝叶斯定理：为什么你的直觉总在概率上翻车",
  subtitle: "一份给好奇者的贝叶斯入门笔记",
  oneLiner:
    "贝叶斯定理不是一条算命公式，而是一种在证据出现后更新信念的方式：先看事情本来有多常见，再看这条证据有多强，最后得到新的判断。",
  tldr: [
    "它把「证据有多强」和「事情本来有多常见」放在同一张桌上。忽略后者，就会掉进基率谬误。",
    "医疗检测、垃圾邮件、搜索和 A/B 测试都在用它；但它不是「人类天生这样想」的证明。",
    "学会用 2×2 表和赔率两种写法，比背公式更能防止被数字骗。",
  ],
  keyQuestions: [
    "公式到底在算什么？",
    "为什么 99% 准确率的检测，阳性结果也可能大概率是假阳性？",
    "贝叶斯和频率学派到底在争什么？",
    "人脑是贝叶斯机器吗？",
    "我该怎么用它做日常判断？",
  ],
  tags: ["概率思维", "贝叶斯", "认知偏差", "学习方法"],
  meta: {
    readingMinutes: 16,
    wordCount: 5680,
    sourceCount: 6,
    confidence: "medium",
    completedAt: ACCESSED,
    model: "样例报告",
    scene: "study",
    depth: "deep",
  },
  reading: { style: "explain", depth: "deep" },
  objectKind: "concept",
  coverMotif: "orbit",
  frameworks: [
    {
      name: "第一性原理",
      why: "贝叶斯定理看起来像一条公式，其实只是在做一件事：把「证据的强弱」除以「证据出现的总概率」。把它拆回这个动作，就不会被符号吓住。",
      reveals: "能看清公式每一项在现实里对应什么；但它不告诉你先验该取多少。",
    },
    {
      name: "纵轴—横轴",
      why: "它有一段从 18 世纪到现代计算的长时间线，也有一张与频率学派、启发式判断并列的当下版图。",
      reveals: "能理解它为什么曾经被冷落、后来又被重新发现；但看不到具体计算的细节。",
    },
    {
      name: "钢人论证",
      why: "「人脑是贝叶斯机器」和「人脑靠启发式」两种说法都有强版本；只挑软柿子会误判这场争论。",
      reveals: "能区分「规范上应该怎样」和「描述上实际怎样」；但无法替你做最终裁决。",
    },
  ],
  bareThinking: {
    text: "第一眼看到贝叶斯定理，最容易把它当成一条需要背下来的公式。但它真正的反直觉之处不在计算，而在顺序：大多数人先看「证据命中率」，贝叶斯要求你先问「这件事本来有多常见」。一旦顺序错了，99% 的准确率也会骗人。",
    assumptions: [
      "假设「准确率 99%」是一个足够好的检测指标；但阳性预测值还取决于患病率。",
      "假设人会自然地进行概率更新；但大量实验显示，人更容易被生动的证据带走。",
    ],
    analogies: ["贝叶斯像调音台：先验是推子原来的位置，证据是新的输入，后验是推子移动后的位置。"],
  },
  debates: [
    {
      id: "d1",
      question: "人脑是贝叶斯机器吗？",
      pro: {
        label: "支持方",
        thesis: "从知觉到运动控制，很多认知现象可以用「先验 + 似然 → 后验」的统一框架解释。",
        points: [
          { text: "贝叶斯模型能把多种知觉错觉解释为「在不确定性下做最优推断」的副产品。[[s1]]", evidenceIds: ["s1"] },
          { text: "它提供了一个可计算、可比较的规范模型，而不只是事后讲故事。[[s2]]", evidenceIds: ["s2"] },
        ],
      },
      contra: {
        label: "反方",
        thesis: "人在概率判断中会系统性地忽略基率、受措辞影响，这说明「贝叶斯机器」最多是一个有用的隐喻。",
        points: [
          { text: "基率谬误实验显示，人们常把「证据命中率」当成全部，忽略事件本身的常见程度。[[s3]][[s4]]", evidenceIds: ["s3", "s4"] },
          { text: "同一个问题换一种表述，判断就会改变；这更像启发式，而不是稳定的概率计算。[[s3]]", evidenceIds: ["s3"] },
        ],
      },
      verdict:
        "更稳妥的说法是：贝叶斯是一个强大的规范框架，也是认知建模的有力工具；但「人脑 literally 在算贝叶斯」是一个过强的断言。规范与描述可以同时部分为真。",
      confidence: "medium",
      changeMyMind:
        "如果未来有更多实验能在神经层面识别出稳定的先验表征与似然计算，并且能预测新情境下的判断，我会把判断上调；如果贝叶斯模型只能事后拟合、不能预测，我会下调。",
    },
    {
      id: "d2",
      question: "贝叶斯方法会取代频率学派吗？",
      pro: {
        label: "支持方",
        thesis: "贝叶斯方法能自然纳入先验知识、给出完整的后验分布，在小样本和复杂模型中更灵活。",
        points: [
          { text: "它把「不确定性」直接写进模型，而不是只给一个点估计。[[s1]]", evidenceIds: ["s1"] },
          { text: "现代计算方法让过去难以处理的贝叶斯模型变得可行。[[s2]]", evidenceIds: ["s2"] },
        ],
      },
      contra: {
        label: "反方",
        thesis: "先验的主观性、计算成本与校准问题不会消失；频率学派在重复实验与长期频率问题上有不可替代的优势。",
        points: [
          { text: "贝叶斯与频率学派对「概率是什么」的回答不同，很多争论其实是解释之争。[[s6]]", evidenceIds: ["s6"] },
          { text: "先验选择会影响结论；当先验缺乏依据时，「灵活」也可能变成「可操纵」。[[s6]]", evidenceIds: ["s6"] },
        ],
      },
      verdict:
        "这不是一场零和战争。两者回答的问题不同：一个关心「在已有信念下，证据应如何更新」，一个关心「长期重复下，方法是否可靠」。工具箱里通常两样都需要。",
      confidence: "high",
      changeMyMind: "如果某一方在绝大多数实际任务上都被证明系统性更差，或者计算与解释成本消失，这个判断才需要重写。",
    },
  ],
  sections: [
    {
      id: "s1",
      number: "01",
      title: "一句话定义：先验、似然、后验",
      kicker: "一句话定义",
      blocks: [
        {
          type: "p",
          text: "贝叶斯定理可以写成一句话：**在看到证据之后，你对一个假设的相信程度，等于「这个假设本来有多可信」乘以「这个假设下出现该证据的可能性」，再除以「该证据出现的总概率」。** [[s1]]",
        },
        {
          type: "callout",
          tone: "insight",
          title: "三个词，一条链",
          text: "先验 P(H)：在看到证据之前，你认为 H 有多可能。似然 P(E|H)：如果 H 为真，出现证据 E 的可能性有多大。后验 P(H|E)：看到 E 之后，你应该把对 H 的相信程度更新到多少。",
        },
        {
          type: "p",
          text: "公式是 P(H|E) = P(E|H) × P(H) / P(E)。分母 P(E) 是「在所有可能情况下，证据 E 出现的总概率」，它起到归一化的作用。真正反直觉的不是除法，而是分子里必须有先验：证据不能单独决定结论。",
        },
        {
          type: "p",
          text: "把它想成一个调音台：先验是推子原来的位置，证据是新的输入，后验是推子移动后的位置。证据很强，推子移动很大；但如果原来的位置很低，移动之后也未必很高。这就是为什么「99% 准确」的检测可能给出一个很低的阳性预测值。",
        },
      ],
    },
    {
      id: "s2",
      number: "02",
      title: "它从哪来：一个被搁置二十年的答案",
      kicker: "纵向脉络",
      blocks: [
        {
          type: "p",
          text: "贝叶斯定理以托马斯·贝叶斯（Thomas Bayes）命名，但他生前并没有把它发表成今天的形式。他的论文由理查德·普莱斯（Richard Price）在 1763 年整理发表；拉普拉斯后来独立地给出了更一般的版本，并把它用于天文与人口问题。[[s1]][[s2]]",
        },
        {
          type: "figure",
          figureId: "fig-timeline",
        },
        {
          type: "p",
          text: "这条时间线有一个反复出现的模式：贝叶斯思想并不是一路顺风。它在 18—19 世纪有过高光，在 20 世纪前半段又被频率学派边缘化，直到计算能力和应用需求一起上来，才重新回到舞台中央。[[s1]]",
        },
        {
          type: "p",
          text: "为什么会被冷落？一部分原因是「先验」听起来太主观：如果结论取决于你先相信什么，它还算科学吗？另一部分原因是计算：在计算机出现之前，很多贝叶斯模型的后验分布根本算不出来。",
        },
        {
          type: "p",
          text: "这两个问题今天都没有完全消失，只是有了更好的应对方式：先验可以来自历史数据、领域知识，也可以通过敏感性分析检验结论是否稳健；计算则靠马尔可夫链蒙特卡洛（MCMC）等方法解决。[[s2]]",
        },
      ],
    },
    {
      id: "s3",
      number: "03",
      title: "它怎么运作：从一个 2×2 表开始",
      kicker: "机制拆解",
      blocks: [
        {
          type: "p",
          text: "先忘掉公式，做一道题。某种疾病的患病率是 1%。有一种检测：如果真的有病，99% 会呈阳性；如果没病，5% 会误报阳性。现在你检测呈阳性，你真正有病的概率是多少？",
        },
        {
          type: "p",
          text: "很多人会脱口而出「99%」。但把 10,000 个人画成一张 2×2 表，答案会变得很清楚：100 个人有病，其中 99 人阳性；9,900 个没病的人里，有 5% 误报，也就是 495 人阳性。阳性总人数是 99 + 495 = 594，其中真正有病的只有 99 人。所以 P(有病|阳性) ≈ 99 / 594 ≈ 16.7%。",
        },
        {
          type: "figure",
          figureId: "fig-concept",
        },
        {
          type: "p",
          text: "这就是贝叶斯定理最实用的写法：**不要先算抽象概率，先把人分成四格。** 真阳性、假阳性、真阴性、假阴性各有多少？四格一画，先验（患病率）和似然（检测灵敏度、误报率）都被放进了同一个画面。[[s1]]",
        },
        {
          type: "callout",
          tone: "warning",
          title: "「准确率」不是「阳性预测值」",
          text: "检测的灵敏度回答的是「有病的人里，多少会被测出来」；阳性预测值回答的是「测出阳性的人里，多少真的有病」。前者可以很高，后者仍可能很低，因为后者还取决于患病率。",
        },
        {
          type: "p",
          text: "同一个逻辑可以解释为什么罕见病的筛查容易产生大量假阳性，也可以解释为什么垃圾邮件过滤器不能只看「某个词出现的概率」，还要看「垃圾邮件本来占多少」。[[s4]]",
        },
      ],
    },
    {
      id: "s4",
      number: "04",
      title: "它在版图里的位置：三种看概率的方式",
      kicker: "横向对比",
      blocks: [
        {
          type: "p",
          text: "贝叶斯不是「唯一的概率观」。把它和频率学派、启发式判断放在一起，能看清它到底在回答什么问题。",
        },
        {
          type: "figure",
          figureId: "fig-matrix",
        },
        {
          type: "h3",
          text: "与频率学派：一个问信念，一个问长期频率",
        },
        {
          type: "p",
          text: "频率学派把概率理解为「在大量重复试验中事件发生的长期频率」；贝叶斯把概率理解为「在现有信息下，对某个命题的相信程度」。两边都可以使用贝叶斯公式，但解释不同。[[s6]]",
        },
        {
          type: "h3",
          text: "与启发式：规范模型不等于真实心智",
        },
        {
          type: "p",
          text: "卡尼曼与特沃斯基的经典工作显示，人在不确定性下常用启发式：代表性、可得性、锚定。这些启发式在很多场景下有效，但会系统性地忽略基率。[[s3]] 这并不否定贝叶斯作为规范模型的价值，只是提醒我们：**「应该怎么算」和「人实际怎么想」是两件事。**",
        },
        {
          type: "callout",
          tone: "note",
          title: "不要把贝叶斯当成万能锤",
          text: "贝叶斯适合「有新证据、要更新判断」的问题；如果问题本身没有明确的假设空间，或者先验完全无法讨论，硬套公式只会制造虚假精确。",
        },
      ],
    },
    {
      id: "s5",
      number: "05",
      title: "证据与争议：人脑是贝叶斯机器吗？",
      kicker: "反方与证据",
      blocks: [
        {
          type: "p",
          text: "「贝叶斯大脑」假说认为，知觉、运动控制和学习都可以被看作在不确定性下做概率推断。这个框架很有解释力：它能把许多错觉解释为「先验与感官证据的折中」。[[s1]]",
        },
        {
          type: "p",
          text: "但另一条证据线同样强：人在概率判断中会忽略基率、受措辞影响、对样本量不敏感。卡尼曼与特沃斯基的实验是这条线的起点之一。[[s3]][[s4]] 如果人真是贝叶斯机器，为什么会在最基础的概率题上系统性犯错？",
        },
        {
          type: "p",
          text: "一个可能的调和是层次区分：在知觉与运动这种进化上古老的领域，贝叶斯模型可能更贴近；在抽象的统计判断中，人更多依赖启发式。另一个调和是「资源理性」：大脑在有限时间与能量下做近似推断，看起来像贝叶斯，但不等于精确计算。",
        },
        {
          type: "p",
          text: "这里最值得保留的判断是：**贝叶斯是一个规范框架，不是一个关于大脑的文学比喻。** 它可以告诉我们「在给定假设下，证据应如何更新」，但不能自动告诉我们「人一定会这样更新」。",
        },
        {
          type: "callout",
          tone: "question",
          title: "留一个可证伪的问题",
          text: "如果贝叶斯模型只能解释已经发生的结果，却无法预测新情境下的判断，它就只是一个事后叙事。真正有区分力的证据，应该能提前告诉你：换一个先验、换一种表述，人会怎么变。",
        },
      ],
    },
    {
      id: "s6",
      number: "06",
      title: "对你意味着什么：三种日常用法",
      kicker: "落地建议",
      blocks: [
        {
          type: "h3",
          text: "读检测结果：先问患病率",
        },
        {
          type: "p",
          text: "看到「准确率 99%」的检测，不要直接把它当成「99% 有病」。先问：这个病在人群里多常见？有没有假阳性？有没有复查？如果医生说「需要复检」，那不是敷衍，而是在用第二次证据更新后验。",
        },
        {
          type: "h3",
          text: "读新闻：先问基率与样本",
        },
        {
          type: "p",
          text: "「某因素让风险增加 50%」听起来很吓人，但如果原来的风险是万分之二，增加 50% 也只是万分之三。贝叶斯思维要求你把「相对变化」放回「绝对基率」里看。",
        },
        {
          type: "h3",
          text: "做判断：先写先验，再写证据",
        },
        {
          type: "p",
          text: "在重要决策前，先写下你原来的判断（先验），再列出新证据，以及每条证据在「假设为真」和「假设为假」时出现的可能性。你不需要算出精确数字，光是把这个结构写出来，就能避免被单一证据带走。",
        },
        {
          type: "steps",
          items: [
            { title: "先写先验", text: "在这条证据出现之前，我本来认为它有多可能？为什么？" },
            { title: "再写似然", text: "如果它是真的，这条证据有多常见？如果它是假的，这条证据又有多常见？" },
            { title: "最后更新", text: "新证据让我的判断移动了多少？如果换一个先验，结论会不会翻转？" },
          ],
        },
      ],
    },
    {
      id: "s7",
      number: "07",
      title: "怎么继续学：别再背公式，先画表",
      kicker: "学习路径",
      blocks: [
        {
          type: "p",
          text: "贝叶斯最容易学错的地方，是一上来就背公式。更有效的顺序是：先画 2×2 表，再写赔率，最后才回到公式。",
        },
        {
          type: "h3",
          text: "第一周：只做自然频率题",
        },
        {
          type: "p",
          text: "把「概率」改写成「每 1,000 人里有多少人」。例如「患病率 1%」写成「每 1,000 人有 10 人患病」。自然频率能显著降低基率谬误带来的困惑。[[s4]]",
        },
        {
          type: "h3",
          text: "第二周：用赔率形式做快速更新",
        },
        {
          type: "p",
          text: "后验赔率 = 先验赔率 × 似然比。似然比 = P(证据|H) / P(证据|非 H)。这个形式特别适合快速判断：如果似然比是 2，证据只是把赔率翻倍；如果先验赔率很低，翻倍之后仍然很低。",
        },
        {
          type: "h3",
          text: "第三周：玩一个反直觉问题",
        },
        {
          type: "p",
          text: "蒙提霍尔问题：三扇门，一扇后面有车；你选了一扇，主持人打开另一扇空门，问你要不要换。换门的中奖概率是 2/3，不换是 1/3。[[s5]] 这个问题的价值不在于答案，而在于逼你明确「主持人知道什么、他会如何行动」——这正是贝叶斯建模最容易被忽略的部分：**证据不是凭空出现的，它由某个机制产生。**",
        },
        {
          type: "keyline",
          text: "先问「这件事本来多常见」，再问「这条证据有多强」。",
        },
      ],
    },
    {
      id: "s8",
      number: "08",
      title: "方法与局限",
      kicker: "研究说明",
      blocks: [
        {
          type: "p",
          text: "这份样例主要使用斯坦福哲学百科、维基百科与卡尼曼/特沃斯基的经典论文来搭建概念与历史脉络；医学检测与蒙提霍尔问题是用于说明机制的标准例子，计算过程在正文中给出。",
        },
        {
          type: "p",
          text: "主要局限有三个。第一，来源以百科与经典论文为主，没有系统综述「贝叶斯大脑」的全部实验证据；第二，医学检测例子是简化模型，真实检测还受到切点、人群、复检策略等影响；第三，贝叶斯与频率学派的争论涉及统计哲学，本文只做了入门级区分。",
        },
        {
          type: "callout",
          tone: "note",
          title: "证据强度",
          text: "公式、历史与基率谬误的部分证据较强；「人脑是不是贝叶斯机器」属于仍在争论的科学问题，报告给出的判断置信度为中。",
        },
      ],
    },
  ],
  figures: [
    {
      id: "fig-timeline",
      type: "timeline",
      title: "贝叶斯思想的关键节点",
      caption: "从一篇遗作到一个现代计算框架：贝叶斯的命运并不是一条直线。",
      data: {
        events: [
          { date: "1763", title: "贝叶斯论文发表", detail: "由理查德·普莱斯整理发表，提出逆概率的早期形式。", sourceId: "s1" },
          { date: "1774", title: "拉普拉斯独立给出一般形式", detail: "把逆概率用于天文与人口问题，推动其传播。", sourceId: "s2" },
          { date: "20 世纪前半", title: "频率学派占据主流", detail: "先验的主观性受到质疑，贝叶斯方法被边缘化。", sourceId: "s6" },
          { date: "20 世纪后半", title: "计算与方法复兴", detail: "MCMC 等计算方法让复杂后验变得可行。", sourceId: "s2" },
          { date: "今天", title: "进入机器学习与日常工具", detail: "从垃圾邮件过滤到 A/B 测试，贝叶斯成为常用框架。", sourceId: "s1" },
        ],
      },
    },
    {
      id: "fig-concept",
      type: "conceptMap",
      title: "贝叶斯更新的结构",
      caption: "先验与似然共同决定后验；新证据出现后，后验又成为下一轮的先验。",
      data: {
        center: "贝叶斯更新",
        nodes: [
          { id: "prior", label: "先验 P(H)", relation: "原来的相信程度", weight: 3 },
          { id: "likelihood", label: "似然 P(E|H)", relation: "假设下证据的可能性", weight: 3 },
          { id: "evidence", label: "证据 E", relation: "新出现的信息", weight: 2 },
          { id: "posterior", label: "后验 P(H|E)", relation: "更新后的判断", weight: 3 },
          { id: "loop", label: "下一轮", relation: "后验变先验", weight: 2 },
          { id: "base", label: "基率", relation: "决定先验的高低", weight: 2 },
        ],
      },
    },
    {
      id: "fig-matrix",
      type: "matrix",
      title: "三种看概率的方式",
      caption: "它们不是三个互相取代的阵营，而是回答不同问题的三套语言。",
      data: {
        columns: ["核心问题", "概率是什么", "典型工具"],
        rows: [
          { label: "贝叶斯", values: ["看到证据后，信念应如何更新", "在现有信息下的相信程度", "先验、似然、后验、MCMC"] },
          { label: "频率学派", values: ["长期重复下，方法是否可靠", "大量重复中的相对频率", "假设检验、置信区间"] },
          { label: "启发式", values: ["人实际怎样快速判断", "不是概率，而是经验规则", "代表性、可得性、锚定"] },
        ],
      },
    },
  ],
  sources: [
    {
      id: "s1",
      title: "Bayes' Theorem — Stanford Encyclopedia of Philosophy",
      url: "https://plato.stanford.edu/entries/bayes-theorem/",
      site: "Stanford Encyclopedia of Philosophy",
      snippet: "贝叶斯定理的哲学导论：公式、解释、历史与争论。",
      type: "encyclopedia",
      publishedAt: "2025-01-01",
      accessedAt: ACCESSED,
      credibility: "high",
      score: 96,
      verified: true,
    },
    {
      id: "s2",
      title: "Bayes' theorem — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Bayes%27_theorem",
      site: "Wikipedia",
      snippet: "定理的历史、证明、应用与常见例子。",
      type: "encyclopedia",
      publishedAt: "2026-01-01",
      accessedAt: ACCESSED,
      credibility: "medium",
      score: 84,
      verified: true,
    },
    {
      id: "s3",
      title: "Judgment under Uncertainty: Heuristics and Biases",
      url: "https://doi.org/10.1126/science.185.4157.1124",
      site: "Science",
      snippet: "卡尼曼与特沃斯基的经典论文，讨论代表性、可得性与锚定等启发式。",
      type: "paper",
      publishedAt: "1974-09-27",
      accessedAt: ACCESSED,
      credibility: "high",
      score: 95,
      verified: true,
    },
    {
      id: "s4",
      title: "Base rate fallacy — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Base_rate_fallacy",
      site: "Wikipedia",
      snippet: "基率谬误的定义、医学检测例子与相关实验。",
      type: "encyclopedia",
      publishedAt: "2026-01-01",
      accessedAt: ACCESSED,
      credibility: "medium",
      score: 82,
      verified: true,
    },
    {
      id: "s5",
      title: "Monty Hall problem — Wikipedia",
      url: "https://en.wikipedia.org/wiki/Monty_Hall_problem",
      site: "Wikipedia",
      snippet: "蒙提霍尔问题的标准描述、概率分析与争议。",
      type: "encyclopedia",
      publishedAt: "2026-01-01",
      accessedAt: ACCESSED,
      credibility: "medium",
      score: 80,
      verified: true,
    },
    {
      id: "s6",
      title: "Interpretations of Probability — Stanford Encyclopedia of Philosophy",
      url: "https://plato.stanford.edu/entries/probability-interpret/",
      site: "Stanford Encyclopedia of Philosophy",
      snippet: "频率主义、贝叶斯主义等概率解释的对照。",
      type: "encyclopedia",
      publishedAt: "2025-01-01",
      accessedAt: ACCESSED,
      credibility: "high",
      score: 94,
      verified: true,
    },
  ],
  qa: {
    score: 87,
    verdict: "可交付；公式、历史与基率谬误的部分证据较强，「贝叶斯大脑」的判断保持中等置信度。",
    checks: [
      { id: "q1", label: "信息充分性", status: "pass", note: "6 个来源，包含哲学百科、经典论文与百科条目。" },
      { id: "q2", label: "一手来源", status: "pass", note: "卡尼曼/特沃斯基论文为原始研究，SEP 为学术百科。" },
      { id: "q3", label: "对立/批评视角", status: "pass", note: "正反辩论分别处理了贝叶斯大脑与学派之争。" },
      { id: "q4", label: "引用覆盖", status: "pass", note: "事实性陈述与分析性判断分开标注。" },
      { id: "q5", label: "逻辑跳跃", status: "pass", note: "区分了规范模型与描述性心智模型。" },
      { id: "q6", label: "伪对立", status: "pass", note: "没有把贝叶斯与频率学派压成二选一。" },
      { id: "q7", label: "反方压力测试", status: "pass", note: "基率谬误与先验主观性都被正面处理。" },
      { id: "q8", label: "剩余不确定性", status: "pass", note: "「贝叶斯大脑」明确标注为仍有争论。" },
      { id: "q9", label: "可行动性", status: "pass", note: "给出检测、新闻与决策三种日常用法。" },
      { id: "q10", label: "表达质量", status: "pass", note: "未使用高频套话；公式与例子均用自然语言解释。" },
    ],
    limitations: [
      "来源以百科与经典论文为主，没有系统综述贝叶斯认知科学的全部实验证据。",
      "医学检测例子是简化模型，真实检测还受切点、人群与复检策略影响。",
      "贝叶斯与频率学派的争论涉及统计哲学，本文只做了入门级区分。",
    ],
  },
  methodologyNote:
    "本样例使用第一性原理、纵轴—横轴与钢人论证三副透镜；检索优先 SEP、经典论文与百科；质检重点检查规范与描述的区分、反方压力与引用覆盖。",
  limitations: [
    "贝叶斯认知科学的证据仍在积累，报告对「人脑是贝叶斯机器」保持中等置信度。",
    "医学检测例子经过简化，不能替代真实的临床判断。",
    "统计哲学部分只覆盖入门级争论。",
  ],
  sample: true,
};
