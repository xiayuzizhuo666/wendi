import type { Source, SourceGrade } from "@/types";

export const GRADE_LABELS: Record<SourceGrade, string> = {
  L1: "官方 / 法规",
  L2: "学术 / 研究",
  L3: "正规媒体",
  L4: "机构 / 百科",
  L5: "自媒体 / 社区",
  L6: "未核验网页",
};

export const GRADE_ORDER: SourceGrade[] = ["L1", "L2", "L3", "L4", "L5", "L6"];

const GOV_HOST =
  /(^|\.)gov\.cn$|(^|\.)gov$|(^|\.)mil$|(^|\.)europa\.eu$|(^|\.)who\.int$|(^|\.)un\.org$|(^|\.)oecd\.org$|(^|\.)worldbank\.org$|(^|\.)imf\.org$/i;
const ACADEMIC_HOST =
  /(^|\.)arxiv\.org$|(^|\.)doi\.org$|(^|\.)springer\.com$|(^|\.)nature\.com$|(^|\.)science\.org$|(^|\.)acm\.org$|(^|\.)ieee\.org$|(^|\.)pubmed\.ncbi\.nlm\.nih\.gov$|(^|\.)ssrn\.com$|(^|\.)jstor\.org$|(^|\.)openalex\.org$|(^|\.)crossref\.org$|(^|\.)edu\.cn$|(^|\.)edu$|(^|\.)ac\.uk$/i;
const MEDIA_HOST =
  /(^|\.)xinhuanet\.com$|(^|\.)news\.cn$|(^|\.)people\.com\.cn$|(^|\.)thepaper\.cn$|(^|\.)caixin\.com$|(^|\.)yicai\.com$|(^|\.)36kr\.com$|(^|\.)huxiu\.com$|(^|\.)reuters\.com$|(^|\.)bloomberg\.com$|(^|\.)ft\.com$|(^|\.)nytimes\.com$|(^|\.)wsj\.com$|(^|\.)bbc\.com$|(^|\.)apnews\.com$|(^|\.)cnbc\.com$|(^|\.)theguardian\.com$|(^|\.)economist\.com$|(^|\.)gmw\.cn$|(^|\.)cctv\.com$|(^|\.)sina\.com\.cn$|(^|\.)sina\.cn$|(^|\.)chinanews\.com\.cn$|(^|\.)chinadaily\.com\.cn$|(^|\.)ce\.cn$|(^|\.)youth\.cn$|(^|\.)bjnews\.com\.cn$/i;
const SELF_MEDIA_HOST =
  /(^|\.)mp\.weixin\.qq\.com$|(^|\.)zhihu\.com$|(^|\.)bilibili\.com$|(^|\.)douban\.com$|(^|\.)jianshu\.com$|(^|\.)csdn\.net$|(^|\.)medium\.com$|(^|\.)substack\.com$|(^|\.)xiaohongshu\.com$|(^|\.)weibo\.com$|(^|\.)toutiao\.com$/i;

function hostOf(source: Pick<Source, "url" | "site">): string {
  try {
    return new URL(source.url).hostname.toLowerCase();
  } catch {
    return source.site.toLowerCase();
  }
}

export function sourceGrade(source: Pick<Source, "type" | "url" | "site" | "credibility" | "grade">): SourceGrade {
  if (source.grade) return source.grade;
  const host = hostOf(source);
  if (source.type === "official" || GOV_HOST.test(host)) return "L1";
  if (source.type === "paper" || source.type === "repository" || ACADEMIC_HOST.test(host)) return "L2";
  if (source.type === "book" || MEDIA_HOST.test(host)) return "L3";
  if (source.type === "encyclopedia" || /(^|\.)org$/.test(host)) return "L4";
  if (source.type === "community" || SELF_MEDIA_HOST.test(host)) return "L5";
  if (source.credibility === "high") return "L3";
  if (source.credibility === "medium") return "L4";
  return "L6";
}

export function sourceGradeLabel(source: Pick<Source, "type" | "url" | "site" | "credibility" | "grade">): string {
  return GRADE_LABELS[sourceGrade(source)];
}

export function gradeRank(grade: SourceGrade): number {
  return GRADE_ORDER.indexOf(grade);
}
